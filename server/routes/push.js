import express from 'express';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

function anonClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Configure web-push with VAPID credentials
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@university.edu',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (vapidErr) {
    console.warn('VAPID setup warning:', vapidErr.message);
  }
}

// 1. GET /api/push/status - Check if push is enabled for user
router.get('/status', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const client = anonClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid access token.' });

  const admin = getAdminClient();
  const { count } = await admin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  res.json({ enabled: (count || 0) > 0 });
});

// 2. POST /api/push/subscribe - Persist a Web Push subscription
router.post('/subscribe', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const client = anonClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid access token.' });

  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription object is required.' });
  }

  const admin = getAdminClient();
  const p256dh = subscription.keys?.p256dh || '';
  const authKey = subscription.keys?.auth || '';

  const { error: upsertErr } = await admin
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth: authKey,
      user_agent: req.headers['user-agent'] || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' });

  if (upsertErr) {
    console.error('Push subscribe DB error:', upsertErr.message);
    return res.status(500).json({ error: 'Failed to record push subscription.' });
  }

  res.json({ ok: true });
});

// 3. POST /api/push/test - Send a test live notification to the user
router.post('/test', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing access token.' });

  const client = anonClient();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid access token.' });

  const payload = {
    title: 'EduLink Live Alert 🔔',
    body: 'Live notifications are active! You will receive instant updates for messages, grades, and academic events.',
    icon: '/edulink-logo.jpg',
    data: { url: '/notifications', category: 'system' }
  };

  const results = await sendPushToUser(user.id, payload);
  res.json({ ok: true, dispatched: results });
});

// Helper function to dispatch push notifications to a user
export async function sendPushToUser(userId, payload) {
  if (!userId || !process.env.VAPID_PUBLIC_KEY) return { sent: 0, failed: 0 };

  const admin = getAdminClient();
  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions || !subscriptions.length) return { sent: 0, failed: 0 };

  const stringPayload = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, stringPayload);
      sent++;
    } catch (err) {
      failed++;
      // If subscription has expired or is unsubscribed (410 Gone or 404 Not Found), delete it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id).catch(() => {});
      }
    }
  }

  return { sent, failed };
}

export default router;
