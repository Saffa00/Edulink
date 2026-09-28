import { Router } from 'express';
import crypto from 'node:crypto';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';
import { getClientIp, getUserAgent, hashDeviceCredential, normalizeRole } from '../services/device-security.js';

const router = Router();

function tokenHash(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function genericMessage() {
  return 'If the account details are valid, recovery instructions have been sent.';
}

async function findProfile({ role, id, email, userId }) {
  const db = getAdminSupabase();
  const table = role === 'student' ? 'students' : 'lecturers';
  const idField = role === 'student' ? 'student_id' : 'lecturer_id';

  let query = db.from(table).select(`id, auth_user_id, ${idField}, email, full_name`);
  if (userId) query = query.eq('auth_user_id', userId);
  else if (id && email) query = query.eq(idField, id).eq('email', email);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

router.post('/device/request', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.body.role);
    const profile = await findProfile({ role, userId: user.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const db = getAdminSupabase();
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.from('device_recovery_requests').delete()
      .eq(role === 'student' ? 'student_id' : 'lecturer_id', profile.id)
      .is('used_at', null);

    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';
    const { error } = await db.from('device_recovery_requests').insert({
      [ownerField]: profile.id,
      token_hash: tokenHash(rawToken),
      expires_at: expires,
      request_ip: getClientIp(req),
      request_user_agent: getUserAgent(req)
    });
    if (error) throw error;

    // In V10, the token is NOT returned to the browser.
    // The deployment should deliver it through the verified recovery channel.
    // This endpoint intentionally returns only a generic status.
    res.json({ requested: true, message: genericMessage() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/device/request-by-id', async (req, res) => {
  try {
    const role = normalizeRole(req.body.role);
    const { id, email } = req.body;
    if (!id || !email) return res.json({ requested: true, message: genericMessage() });

    const profile = await findProfile({ role, id, email });
    // Do not reveal whether the account exists.
    if (!profile) return res.json({ requested: true, message: genericMessage() });

    const db = getAdminSupabase();
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';

    await db.from('device_recovery_requests').delete()
      .eq(ownerField, profile.id)
      .is('used_at', null);

    const { error } = await db.from('device_recovery_requests').insert({
      [ownerField]: profile.id,
      token_hash: tokenHash(rawToken),
      expires_at: expires,
      request_ip: getClientIp(req),
      request_user_agent: getUserAgent(req)
    });
    if (error) throw error;

    // IMPORTANT: Do not return rawToken in production.
    // A deployment-specific email provider should send the token/recovery link to profile.email.
    // For local development, use the Supabase dashboard/email provider to implement the delivery.
    res.json({ requested: true, message: genericMessage() });
  } catch {
    res.json({ requested: true, message: genericMessage() });
  }
});

router.post('/device/verify', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.body.role);
    const { token, newDeviceCredential, deviceName } = req.body;

    if (!token || !newDeviceCredential) {
      return res.status(400).json({ error: 'Recovery token and new device credential are required.' });
    }

    const profile = await findProfile({ role, userId: user.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';
    const db = getAdminSupabase();

    const { data: request, error } = await db.from('device_recovery_requests')
      .select('id, token_hash, expires_at, used_at')
      .eq(ownerField, profile.id)
      .eq('token_hash', tokenHash(token))
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!request) return res.status(400).json({ error: 'Invalid or expired recovery token.' });

    // Revoke existing devices first, then bind the new device.
    const { error: revokeError } = await db.from('devices')
      .update({ revoked_at: new Date().toISOString() })
      .eq(ownerField, profile.id)
      .is('revoked_at', null);
    if (revokeError) throw revokeError;

    const { data: device, error: deviceError } = await db.from('devices').insert({
      [ownerField]: profile.id,
      device_token_hash: hashDeviceCredential(newDeviceCredential),
      device_label: String(deviceName || 'Replacement device').slice(0, 80),
      first_registered_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      registered_ip: getClientIp(req),
      last_ip: getClientIp(req),
      user_agent: getUserAgent(req)
    }).select('id, device_label').single();

    if (deviceError) throw deviceError;

    const { error: usedError } = await db.from('device_recovery_requests')
      .update({ used_at: new Date().toISOString() })
      .eq('id', request.id);
    if (usedError) throw usedError;

    await db.from('login_events').insert({
      [ownerField]: profile.id,
      device_id: device.id,
      event_type: 'device_revoke',
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
      success: true
    });

    res.json({ recovered: true, device });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
