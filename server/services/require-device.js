import { getAdminSupabase, getAuthenticatedUser } from './supabase.js';
import { getClientIp, getUserAgent, hashDeviceCredential, normalizeRole } from './device-security.js';

export async function requireRegisteredDevice(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    const role = normalizeRole(req.headers['x-app-role']);
    const credential = String(req.headers['x-device-credential'] || '');
    if (!credential) {
      return res.status(428).json({ error: 'Registered device credential is required.', code: 'DEVICE_REQUIRED' });
    }

    const table = role === 'student' ? 'students' : 'lecturers';
    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';

    const { data: profile, error: profileError } = await getAdminSupabase()
      .from(table)
      .select(`id, auth_user_id`)
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return res.status(403).json({ error: 'Profile not found.' });

    const { data: device, error } = await getAdminSupabase()
      .from('devices')
      .select('id, device_label, revoked_at')
      .eq(ownerField, profile.id)
      .eq('device_token_hash', hashDeviceCredential(credential))
      .is('revoked_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!device) return res.status(403).json({ error: 'Unknown or revoked device.', code: 'UNKNOWN_DEVICE' });

    await getAdminSupabase().from('devices').update({
      last_seen_at: new Date().toISOString(),
      last_ip: getClientIp(req),
      user_agent: getUserAgent(req)
    }).eq('id', device.id);

    req.authUser = user;
    req.appRole = role;
    req.device = device;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}
