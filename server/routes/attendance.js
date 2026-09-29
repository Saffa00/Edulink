import crypto from 'crypto';

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CAMPUS_GEOFENCES = {
  goderich: { lat: 8.42431, lng: -13.28477, name: 'Goderich Campus' },
  'congo-cross': { lat: 8.4875, lng: -13.2705, name: 'Congo Cross Campus' },
  brookfields: { lat: 8.4755, lng: -13.2505, name: 'Brookfields Campus' }
};

export function resolveClassCoordinates(classRecord = {}) {
  const lat = Number(classRecord.latitude);
  const lng = Number(classRecord.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  const loc = String(classRecord.location_name || '').toLowerCase();
  if (loc.includes('congo')) return CAMPUS_GEOFENCES['congo-cross'];
  if (loc.includes('brookfield') || loc.includes('kenyatta')) return CAMPUS_GEOFENCES.brookfields;
  return CAMPUS_GEOFENCES.goderich;
}

export function registerAttendanceRoutes(app, { supabaseAdmin }) {
  // Student mark attendance endpoint
  app.post('/api/attendance/mark', async (req, res) => {
    try {
      const { classId, latitude, longitude, deviceToken } = req.body || {};
      if (!classId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || !deviceToken) {
        return res.status(400).json({ error: 'Class ID, valid GPS coordinates, and device credential are required.' });
      }

      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Authentication required.' });

      const { data: { user }, error: ue } = await supabaseAdmin.auth.getUser(token);
      if (ue || !user) return res.status(401).json({ error: 'Invalid or expired session.' });

      const { data: student } = await supabaseAdmin.from('students')
        .select('id, student_id, full_name')
        .eq('auth_user_id', user.id)
        .single();
      if (!student) return res.status(403).json({ error: 'Student account not found.' });

      const { data: c, error: ce } = await supabaseAdmin.from('classes')
        .select('id, module_id, class_date, start_time, end_time, latitude, longitude, radius_meters, attendance_status, opened_at, closed_at, late_threshold_minutes')
        .eq('id', classId)
        .single();
      if (ce || !c) return res.status(404).json({ error: 'Class not found.' });

      // Check attendance open/close status
      const now = new Date();
      if (c.attendance_status === 'closed') {
        return res.status(403).json({ error: 'Attendance has been closed by the lecturer for this class.' });
      }

      const start = new Date(`${c.class_date}T${c.start_time}Z`);
      const end = new Date(`${c.class_date}T${c.end_time}Z`);
      const defaultOpen = new Date(end.getTime() - 30 * 60 * 1000);

      // If lecturer explicitly marked it 'open', allow it! Otherwise check default window
      const isWindowOpen = (now >= defaultOpen && now <= end);
      if (c.attendance_status !== 'open' && !isWindowOpen) {
        return res.status(403).json({ error: 'Attendance is currently closed. It opens when activated by the lecturer or 30 minutes before class ends.' });
      }

      // Check student module registration
      const { data: reg } = await supabaseAdmin.from('student_modules')
        .select('id')
        .eq('student_id', student.id)
        .eq('module_id', c.module_id)
        .maybeSingle();
      if (!reg) return res.status(403).json({ error: 'You are not registered for this module.' });

      // Verify registered device binding
      const hash = crypto.createHash('sha256').update(String(deviceToken)).digest('hex');
      const { data: device } = await supabaseAdmin.from('devices')
        .select('id')
        .eq('student_id', student.id)
        .eq('device_token_hash', hash)
        .is('revoked_at', null)
        .maybeSingle();
      if (!device) return res.status(403).json({ error: 'This device is not registered for your student account.' });

      // Calculate Haversine distance against authoritative campus coordinates
      const targetCoords = resolveClassCoordinates(c);
      const dist = distanceMeters(Number(latitude), Number(longitude), targetCoords.lat, targetCoords.lng);
      const allowedRadius = Number(c.radius_meters || 150);
      if (dist > allowedRadius) {
        return res.status(403).json({
          error: `You are outside the attendance geofence (${Math.round(dist)}m away from ${targetCoords.name}, radius is ${allowedRadius}m).`
        });
      }

      // Check duplicate attendance
      const { data: existing } = await supabaseAdmin.from('attendance')
        .select('id, status, marked_at')
        .eq('class_id', classId)
        .eq('student_id', student.id)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Attendance has already been marked for this class.' });
      }

      // Determine late vs present
      const lateThreshold = Number(c.late_threshold_minutes || 15);
      const lateCutoff = c.opened_at ? new Date(new Date(c.opened_at).getTime() + lateThreshold * 60 * 1000) : new Date(start.getTime() + lateThreshold * 60 * 1000);
      const calculatedStatus = (now > lateCutoff) ? 'late' : 'present';

      const { data: row, error: ae } = await supabaseAdmin.from('attendance').insert({
        class_id: classId,
        student_id: student.id,
        device_id: device.id,
        marked_at: now.toISOString(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        distance_meters: Math.round(dist * 10) / 10,
        status: calculatedStatus,
        verified: true,
        verification_method: 'gps_device'
      }).select().single();

      if (ae) return res.status(400).json({ error: ae.message });

      return res.json({
        success: true,
        attendance: row,
        status: calculatedStatus,
        distanceMeters: Math.round(dist)
      });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Attendance recording failed.' });
    }
  });
}
