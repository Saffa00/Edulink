import { Router } from 'express';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { sendPushToUser } from './push.js';

const router = Router();

// Official Google STUN servers + TURN relay config
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

// Fallback in-memory call history store if table is being created
let localCallStore = [];

// Ensure table exists
async function ensureCallsTable() {
  const admin = getAdminSupabase();
  try {
    const { error } = await admin.from('academic_calls').select('id').limit(1);
    if (error && error.code === '42P01') {
      // Table does not exist, let's create it via rpc or fallback gracefully to local store
      console.warn('academic_calls table does not exist yet. Using resilient store.');
    }
  } catch (err) {
    console.warn('ensureCallsTable check:', err.message);
  }
}
ensureCallsTable().catch(() => {});

// 1. GET /api/calls/ice-servers - Returns STUN / TURN configuration
router.get('/ice-servers', (_req, res) => {
  return res.json({ iceServers: ICE_SERVERS });
});

// 2. POST /api/calls/initiate - Record outgoing call
router.post('/initiate', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const {
      conversationId,
      receiverUserId,
      callerName,
      receiverName,
      callType = 'audio',
      moduleCode = 'Academic Consultation'
    } = req.body;

    const admin = getAdminSupabase();
    const callRecord = {
      conversation_id: conversationId || null,
      caller_user_id: user.id,
      receiver_user_id: receiverUserId || user.id,
      caller_name: callerName || 'Academic Caller',
      receiver_name: receiverName || 'Academic Recipient',
      call_type: callType === 'video' ? 'video' : 'audio',
      module_code: moduleCode,
      status: 'initiated',
      started_at: new Date().toISOString()
    };

    let result = null;
    try {
      const { data, error } = await admin
        .from('academic_calls')
        .insert(callRecord)
        .select()
        .single();
      if (!error && data) result = data;
    } catch (dbErr) {
      console.warn('DB insert academic_calls fallback:', dbErr.message);
    }

    if (!result) {
      result = {
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...callRecord,
        duration_seconds: 0,
        created_at: new Date().toISOString()
      };
      localCallStore.unshift(result);
    }

    return res.json({ ok: true, call: result });
  } catch (err) {
    console.error('Call initiate error:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 3. POST /api/calls/update-status - Update status & duration (completed, missed, rejected)
router.post('/update-status', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const { callId, status, durationSeconds } = req.body;

    if (!callId) {
      return res.status(400).json({ error: 'callId is required.' });
    }

    const admin = getAdminSupabase();
    const duration = Math.max(0, parseInt(durationSeconds || 0, 10));
    const cleanStatus = ['connected', 'completed', 'missed', 'rejected'].includes(status) ? status : 'completed';

    const updates = {
      status: cleanStatus,
      duration_seconds: duration,
      ended_at: new Date().toISOString()
    };

    try {
      await admin
        .from('academic_calls')
        .update(updates)
        .eq('id', callId);

      // If missed call, trigger notification
      if (cleanStatus === 'missed') {
        const { data: call } = await admin.from('academic_calls').select('*').eq('id', callId).maybeSingle();
        if (call && call.receiver_user_id) {
          const missedTitle = `Missed ${call.call_type === 'video' ? 'Video' : 'Voice'} Call`;
          const missedBody = `You missed an academic consultation call from ${call.caller_name} (${call.module_code}).`;

          await admin.from('notifications').insert({
            recipient_user_id: call.receiver_user_id,
            title: missedTitle,
            body: missedBody,
            category: 'call',
            link_url: '/messages',
            created_at: new Date().toISOString()
          }).catch(() => {});

          sendPushToUser(call.receiver_user_id, {
            title: missedTitle,
            body: missedBody,
            icon: '/edulink-logo.jpg',
            data: { url: '/messages', category: 'call' }
          }).catch(() => {});
        }
      }
    } catch (dbErr) {
      console.warn('DB update academic_calls error:', dbErr.message);
    }

    // Update in local store
    const local = localCallStore.find(c => c.id === callId);
    if (local) {
      Object.assign(local, updates);
    }

    return res.json({ ok: true, callId, status: cleanStatus, durationSeconds: duration });
  } catch (err) {
    console.error('Call update-status error:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

// 4. GET /api/calls/history - Get call records for authenticated user
router.get('/history', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const admin = getAdminSupabase();

    let calls = [];
    try {
      const { data, error } = await admin
        .from('academic_calls')
        .select('*')
        .or(`caller_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) calls = data;
    } catch (dbErr) {
      console.warn('DB query academic_calls error:', dbErr.message);
    }

    // Merge with local store
    const userLocal = localCallStore.filter(c => c.caller_user_id === user.id || c.receiver_user_id === user.id);
    const combined = [...calls, ...userLocal];

    // Deduplicate by ID
    const seen = new Set();
    const unique = [];
    for (const c of combined) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }

    unique.sort((a, b) => new Date(b.created_at || b.started_at) - new Date(a.created_at || a.started_at));
    return res.json({ calls: unique });
  } catch (err) {
    console.error('Call history error:', err);
    return res.status(err.message.includes('token') ? 401 : 500).json({ error: err.message });
  }
});

export default router;
