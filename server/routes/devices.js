import { Router } from 'express';
import { getAdminSupabase, getAuthenticatedUser, getUserSupabase } from '../services/supabase.js';
import { getClientIp, getUserAgent, hashDeviceCredential, normalizeRole } from '../services/device-security.js';

const router = Router();

async function getProfile(user, role, profileId, req) {
  const userId = user.id;
  const token = req?.headers?.authorization?.replace(/^Bearer\s+/i, '').trim();
  const db = token ? getUserSupabase(token) : getAdminSupabase();
  const table = role === 'student' ? 'students' : 'lecturers';
  const idField = role === 'student' ? 'student_id' : 'lecturer_id';

  let query = db.from(table).select(`id, auth_user_id, ${idField}`);
  if (profileId) query = query.eq('id', profileId);
  else query = query.eq('auth_user_id', userId);

  let { data, error } = await query.maybeSingle();

  // If not found via user-scoped query, try admin client
  if (!data) {
    let adminQuery = getAdminSupabase().from(table).select(`id, auth_user_id, ${idField}`);
    if (profileId) adminQuery = adminQuery.eq('id', profileId);
    else adminQuery = adminQuery.eq('auth_user_id', userId);
    const adminRes = await adminQuery.maybeSingle();
    if (adminRes.data) data = adminRes.data;
  }

  // If still not found, auto-link or provision profile from authenticated user metadata
  if (!data && user) {
    const meta = user.user_metadata || {};
    const code = meta[idField] || meta.student_id || meta.lecturer_id || (role === 'student' ? '8100' : `LECT-${Date.now().toString().slice(-6)}`);
    const fullName = meta.full_name || user.email?.split('@')[0] || 'User';

    const insertPayload = {
      auth_user_id: userId,
      [idField]: code,
      full_name: fullName,
      email: user.email,
      ...(role === 'student' ? { account_status: 'active' } : { active: true })
    };

    const { data: created } = await getAdminSupabase()
      .from(table)
      .insert(insertPayload)
      .select(`id, auth_user_id, ${idField}`)
      .maybeSingle();

    if (created) data = created;
  }

  if (!data || (data.auth_user_id && data.auth_user_id !== userId)) {
    throw new Error('Profile does not belong to the authenticated account.');
  }
  return { ...data, role, table, idField, code: data[idField] };
}

router.post('/register', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.body.role);
    const { deviceCredential, deviceName, profileId } = req.body;
    if (!deviceCredential) return res.status(400).json({ error: 'Device credential is required.' });

    const profile = await getProfile(user, role, profileId, req);
    const db = getAdminSupabase();
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';
    const ownerId = profile.id;
    const hash = hashDeviceCredential(deviceCredential);

    // Only one active registered device is allowed for the account in V9.
    const { data: existing, error: existingError } = await db
      .from('devices')
      .select('id, revoked_at, device_label')
      .eq(ownerField, ownerId)
      .is('revoked_at', null);

    if (existingError) throw existingError;

    if (existing?.length) {
      const same = existing.some(d => d.id && d.device_label === deviceName);
      return res.status(409).json({
        error: 'A registered device already exists for this account.',
        code: 'DEVICE_ALREADY_BOUND',
        recoveryRequired: true,
        devices: existing.map(d => ({ id: d.id, label: d.device_label }))
      });
    }

    const { data, error } = await db.from('devices').insert({
      [ownerField]: ownerId,
      device_token_hash: hash,
      device_label: String(deviceName || 'This device').slice(0, 80),
      first_registered_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
      registered_ip: getClientIp(req),
      last_ip: getClientIp(req),
      user_agent: getUserAgent(req)
    }).select('id, device_label, first_registered_at, last_seen_at').single();

    if (error) throw error;
    res.json({ registered: true, device: data });
  } catch (error) {
    const code = /authenticated|Profile|Invalid role|token/i.test(error.message) ? 401 : 400;
    res.status(code).json({ error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.body.role);
    const { deviceCredential } = req.body;
    if (!deviceCredential) return res.status(400).json({ error: 'Device credential is required.' });

    const profile = await getProfile(user, role, null, req);
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';
    const db = getAdminSupabase();
    const hash = hashDeviceCredential(deviceCredential);

    const { data, error } = await db
      .from('devices')
      .select('id, device_label, last_seen_at, revoked_at')
      .eq(ownerField, profile.id)
      .eq('device_token_hash', hash)
      .is('revoked_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(403).json({ registered: false, code: 'UNKNOWN_DEVICE', error: 'This device is not registered for this account.' });

    await db.from('devices').update({
      last_seen_at: new Date().toISOString(),
      last_ip: getClientIp(req),
      user_agent: getUserAgent(req)
    }).eq('id', data.id);

    res.json({ registered: true, deviceId: data.id, deviceLabel: data.device_label });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.query.role);
    const profile = await getProfile(user, role, null, req);
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';

    const { data, error } = await getAdminSupabase()
      .from('devices')
      .select('id, device_label, first_registered_at, last_seen_at, revoked_at, registered_ip, last_ip, user_agent')
      .eq(ownerField, profile.id)
      .order('first_registered_at', { ascending: false });

    if (error) throw error;
    res.json({ devices: data || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:deviceId/revoke', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.body.role || req.query.role);
    const profile = await getProfile(user, role, null, req);
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';

    const { error } = await getAdminSupabase()
      .from('devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.deviceId)
      .eq(ownerField, profile.id);

    if (error) throw error;
    res.json({ revoked: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
