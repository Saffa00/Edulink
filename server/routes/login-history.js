import { Router } from 'express';
import { getAdminSupabase, getAuthenticatedUser } from '../services/supabase.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = String(req.query.role || '');
    const table = role === 'student' ? 'students' : role === 'lecturer' ? 'lecturers' : null;
    if (!table) return res.status(400).json({ error: 'role must be student or lecturer' });

    const { data: profile, error: pErr } = await getAdminSupabase()
      .from(table).select('id').eq('auth_user_id', user.id).maybeSingle();
    if (pErr) throw pErr;
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    const ownerField = role === 'student' ? 'student_id' : 'lecturer_id';
    const { data, error } = await getAdminSupabase()
      .from('login_events')
      .select('id, device_id, event_type, ip_address, user_agent, success, created_at')
      .eq(ownerField, profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ events: data || [] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
