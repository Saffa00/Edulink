import { supabase } from './supabase.js';
import { getCampusCoordinates } from '../data/academicCatalogue.js';
import { sendAcademicNotification } from './liveNotificationService.js';

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return null;
  }
  const R = 6371000; // Earth radius in meters
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Get current lecturer record from authenticated session
 */
export async function getCurrentLecturer() {
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw ue || new Error('Authentication required.');
  const { data: lecturer, error: le } = await supabase
    .from('lecturers')
    .select('id, lecturer_id, full_name, email, department_id, faculty_id, teaching_area')
    .eq('auth_user_id', user.id)
    .single();
  if (le || !lecturer) throw le || new Error('Lecturer profile not found.');
  return { ...lecturer, department: lecturer.teaching_area || '' };
}

/**
 * Fetch all modules belonging to current lecturer, or active department modules if none assigned yet
 */
export async function getLecturerModules() {
  const lecturer = await getCurrentLecturer();
  let { data, error } = await supabase
    .from('modules')
    .select('id, code, title, level, semester, active, department_id, faculty_id')
    .eq('lecturer_id', lecturer.id)
    .order('code', { ascending: true });

  if (error) {
    console.warn('Notice querying assigned lecturer modules:', error.message);
  }

  // Strictly return only modules registered to this lecturer
  return data || [];
}

/**
 * Fetch all classes scheduled by current lecturer
 */
export async function getLecturerClasses(moduleId = null) {
  const lecturer = await getCurrentLecturer();
  let query = supabase
    .from('classes')
    .select(`
      id, module_id, class_date, start_time, end_time, location_name,
      latitude, longitude, radius_meters, attendance_status,
      opened_at, closed_at, late_threshold_minutes,
      modules(id, code, title, level, semester)
    `)
    .eq('lecturer_id', lecturer.id)
    .order('class_date', { ascending: false })
    .order('start_time', { ascending: false });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (moduleId && UUID_REGEX.test(String(moduleId).trim())) {
    query = query.eq('module_id', moduleId);
  }

  let { data, error } = await query;
  if (error) throw error;
  data = data || [];

  // Automatically sync today's timetable schedules into classes so lecturer never has to manually schedule a class!
  try {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];
    const todayDateStr = today.toISOString().slice(0, 10);

    const { data: timetableSlots } = await supabase
      .from('schedules')
      .select('id, module_id, day_of_week, start_time, end_time, location_name, room_code, modules(id, code, title, level, semester)')
      .eq('lecturer_id', lecturer.id)
      .eq('day_of_week', todayName);

    if (timetableSlots && timetableSlots.length > 0) {
      for (const slot of timetableSlots) {
        const alreadyExists = data.some(c => c.module_id === slot.module_id && c.class_date === todayDateStr);
        if (!alreadyExists) {
          const coords = getCampusCoordinates(slot.location_name);
          const { data: newClass } = await supabase
            .from('classes')
            .insert({
              module_id: slot.module_id,
              lecturer_id: lecturer.id,
              class_date: todayDateStr,
              start_time: slot.start_time,
              end_time: slot.end_time,
              location_name: slot.location_name || slot.room_code || coords.name,
              latitude: coords.latitude,
              longitude: coords.longitude,
              radius_meters: coords.radiusMeters || 150,
              late_threshold_minutes: 15,
              attendance_status: 'scheduled'
            })
            .select(`
              id, module_id, class_date, start_time, end_time, location_name,
              latitude, longitude, radius_meters, attendance_status,
              opened_at, closed_at, late_threshold_minutes,
              modules(id, code, title, level, semester)
            `)
            .maybeSingle();

          if (newClass) data.unshift(newClass);
        }
      }
    }
  } catch (syncErr) {
    console.warn('Timetable-to-class auto sync notice:', syncErr.message);
  }

  return data;
}

/**
 * Create a new scheduled class
 */
export async function createLecturerClass(payload) {
  const lecturer = await getCurrentLecturer();
  const campusCoords = getCampusCoordinates(payload.location_name);
  const insertData = {
    module_id: payload.module_id,
    lecturer_id: lecturer.id,
    class_date: payload.class_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    location_name: payload.location_name || campusCoords.name,
    latitude: Number(payload.latitude) || campusCoords.latitude,
    longitude: Number(payload.longitude) || campusCoords.longitude,
    radius_meters: Number(payload.radius_meters) || campusCoords.radiusMeters || 150,
    late_threshold_minutes: Number(payload.late_threshold_minutes) || 15,
    attendance_status: payload.attendance_status || 'scheduled'
  };

  const { data, error } = await supabase
    .from('classes')
    .insert(insertData)
    .select(`
      id, module_id, class_date, start_time, end_time, location_name,
      latitude, longitude, radius_meters, attendance_status,
      modules(id, code, title)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Change class attendance status (open, closed, scheduled)
 */
export async function setAttendanceStatus(classId, status) {
  const lecturer = await getCurrentLecturer();
  const updatePayload = { attendance_status: status };
  const now = new Date().toISOString();
  if (status === 'open') {
    updatePayload.opened_at = now;
  } else if (status === 'closed') {
    updatePayload.closed_at = now;
  }

  const { data, error } = await supabase
    .from('classes')
    .update(updatePayload)
    .eq('id', classId)
    .eq('lecturer_id', lecturer.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch full class details: class metadata, full registered module roster,
 * and attendance records mapped together with complete stats (Present, Late, Absent, Avg GPS Distance)
 */
export async function getClassAttendanceDetails(classId) {
  const lecturer = await getCurrentLecturer();

  // 1. Fetch class details
  const { data: cls, error: ce } = await supabase
    .from('classes')
    .select(`
      id, module_id, class_date, start_time, end_time, location_name,
      latitude, longitude, radius_meters, attendance_status,
      opened_at, closed_at, late_threshold_minutes,
      modules(id, code, title, level, semester)
    `)
    .eq('id', classId)
    .eq('lecturer_id', lecturer.id)
    .single();

  if (ce || !cls) throw ce || new Error('Class session not found.');

  // 2. Fetch full registered roster for this module
  const { data: studentModules, error: se } = await supabase
    .from('student_modules')
    .select(`
      student_id,
      students (
        id, student_id, full_name, email, phone, programme, level, account_status
      )
    `)
    .eq('module_id', cls.module_id);

  if (se) throw se;

  const rosterStudents = (studentModules || [])
    .map(sm => sm.students)
    .filter(Boolean);

  // 3. Fetch all attendance records for this class
  const { data: attendanceList, error: ae } = await supabase
    .from('attendance')
    .select(`
      id, class_id, student_id, marked_at, latitude, longitude,
      distance_meters, status, verified, verification_method, lecturer_notes
    `)
    .eq('class_id', classId);

  if (ae) throw ae;

  // Create attendance lookup by student_id
  const attendanceMap = new Map();
  (attendanceList || []).forEach(att => {
    attendanceMap.set(att.student_id, att);
  });

  // 4. Merge roster with attendance records
  const mergedRoster = rosterStudents.map(student => {
    const record = attendanceMap.get(student.id);
    if (record) {
      return {
        studentInternalId: student.id,
        attendanceId: record.id,
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        programme: student.programme || 'Undergraduate',
        level: student.level || '—',
        phone: student.phone || '',
        status: record.status || 'present',
        markedAt: record.marked_at,
        distanceMeters: record.distance_meters != null ? Number(record.distance_meters) : null,
        latitude: record.latitude,
        longitude: record.longitude,
        verified: record.verified ?? true,
        verificationMethod: record.verification_method || 'gps_device',
        lecturerNotes: record.lecturer_notes || ''
      };
    } else {
      return {
        studentInternalId: student.id,
        attendanceId: null,
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        programme: student.programme || 'Undergraduate',
        level: student.level || '—',
        phone: student.phone || '',
        status: 'absent',
        markedAt: null,
        distanceMeters: null,
        latitude: null,
        longitude: null,
        verified: false,
        verificationMethod: 'none',
        lecturerNotes: ''
      };
    }
  });

  // Sort: Present and Late first, then Absent, alphabetical by studentId
  mergedRoster.sort((a, b) => {
    const priority = { present: 1, late: 2, excused: 3, absent: 4, rejected: 5 };
    const pDiff = (priority[a.status] || 9) - (priority[b.status] || 9);
    if (pDiff !== 0) return pDiff;
    return a.studentId.localeCompare(b.studentId);
  });

  // 5. Compute aggregate statistics
  const total = mergedRoster.length;
  const present = mergedRoster.filter(r => r.status === 'present').length;
  const late = mergedRoster.filter(r => r.status === 'late').length;
  const absent = mergedRoster.filter(r => r.status === 'absent').length;
  const excused = mergedRoster.filter(r => r.status === 'excused').length;
  const rejected = mergedRoster.filter(r => r.status === 'rejected').length;

  const validDistances = mergedRoster
    .filter(r => r.distanceMeters != null && (r.status === 'present' || r.status === 'late'))
    .map(r => r.distanceMeters);

  const avgDistance = validDistances.length
    ? Math.round((validDistances.reduce((acc, d) => acc + d, 0) / validDistances.length) * 10) / 10
    : 0;

  const stats = {
    total,
    present,
    late,
    absent,
    excused,
    rejected,
    markedTotal: present + late + excused,
    attendanceRate: total ? Math.round(((present + late) / total) * 100) : 0,
    presentRate: total ? Math.round((present / total) * 100) : 0,
    lateRate: total ? Math.round((late / total) * 100) : 0,
    absentRate: total ? Math.round((absent / total) * 100) : 0,
    avgDistance
  };

  return {
    classInfo: cls,
    roster: mergedRoster,
    stats
  };
}

/**
 * Lecturer manual override: mark or adjust a student's attendance
 */
export async function updateStudentAttendance({ classId, studentInternalId, status, notes = '' }) {
  await getCurrentLecturer();

  // Check if an attendance record exists
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentInternalId)
    .maybeSingle();

  if (status === 'absent') {
    // If lecturer manually marks absent, delete the attendance record if one was present
    if (existing) {
      const { error: de } = await supabase.from('attendance').delete().eq('id', existing.id);
      if (de) throw de;
    }
    // Notify student of marked absent
    try {
      const { data: st } = await supabase.from('students').select('auth_user_id').eq('id', studentInternalId).single();
      const { data: c } = await supabase.from('classes').select('class_date, modules(code)').eq('id', classId).single();
      if (st?.auth_user_id) {
        await sendAcademicNotification({
          recipientUserId: st.auth_user_id,
          title: `Attendance Updated: ${c?.modules?.code || 'Class'}`,
          body: `Your attendance for ${c?.modules?.code || 'session'} on ${c?.class_date || 'today'} was marked ABSENT by lecturer.`,
          category: 'attendance',
          linkUrl: 'attendance'
        });
      }
    } catch {}
    return { status: 'absent' };
  }

  let record = null;
  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({
        status,
        lecturer_notes: notes,
        verification_method: 'manual_lecturer',
        verified: true
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    record = data;
  } else {
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        class_id: classId,
        student_id: studentInternalId,
        status,
        marked_at: new Date().toISOString(),
        distance_meters: 0,
        verification_method: 'manual_lecturer',
        verified: true,
        lecturer_notes: notes
      })
      .select()
      .single();
    if (error) throw error;
    record = data;
  }

  // Real-time Academic Notification for Marked Attendance
  try {
    const { data: st } = await supabase.from('students').select('auth_user_id, full_name').eq('id', studentInternalId).single();
    const { data: c } = await supabase.from('classes').select('class_date, modules(code, title)').eq('id', classId).single();
    if (st?.auth_user_id) {
      await sendAcademicNotification({
        recipientUserId: st.auth_user_id,
        title: `Attendance Marked: ${c?.modules?.code || 'Class'}`,
        body: `Your attendance for ${c?.modules?.code || ''} ${c?.modules?.title || ''} on ${c?.class_date || 'today'} was marked ${status.toUpperCase()}.${notes ? ` Note: "${notes}"` : ''}`,
        category: 'attendance',
        linkUrl: 'attendance'
      });
    }
  } catch (notifErr) {
    console.warn('Attendance notification notice:', notifErr?.message);
  }

  return record;
}

/**
 * Realtime subscription for a class's attendance and status updates
 */
export function subscribeToClassAttendance(classId, onChange) {
  const channel = supabase
    .channel(`class-attendance-${classId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance', filter: `class_id=eq.${classId}` },
      () => { onChange(); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
      () => { onChange(); }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch summary history of past classes with attendance rates
 */
export async function getAttendanceHistory() {
  const lecturer = await getCurrentLecturer();

  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id, module_id, class_date, start_time, end_time, location_name,
      radius_meters, attendance_status, opened_at, closed_at,
      modules(id, code, title)
    `)
    .eq('lecturer_id', lecturer.id)
    .order('class_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!classes || !classes.length) return [];

  // Fetch student roster counts per module
  const moduleIds = [...new Set(classes.map(c => c.module_id))];
  const { data: rosterCounts } = await supabase
    .from('student_modules')
    .select('module_id')
    .in('module_id', moduleIds);

  const rosterMap = {};
  (rosterCounts || []).forEach(r => {
    rosterMap[r.module_id] = (rosterMap[r.module_id] || 0) + 1;
  });

  // Fetch attendance records for all classes
  const classIds = classes.map(c => c.id);
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('class_id, status, distance_meters')
    .in('class_id', classIds);

  const attMap = {};
  (attendanceRecords || []).forEach(a => {
    if (!attMap[a.class_id]) attMap[a.class_id] = { present: 0, late: 0, totalMarked: 0 };
    if (a.status === 'present') attMap[a.class_id].present++;
    if (a.status === 'late') attMap[a.class_id].late++;
    attMap[a.class_id].totalMarked++;
  });

  return classes.map(c => {
    const totalRoster = rosterMap[c.module_id] || 0;
    const att = attMap[c.id] || { present: 0, late: 0, totalMarked: 0 };
    const marked = att.present + att.late;
    const absent = Math.max(0, totalRoster - marked);
    const rate = totalRoster ? Math.round((marked / totalRoster) * 100) : 0;

    return {
      id: c.id,
      moduleId: c.module_id,
      moduleCode: c.modules?.code || '—',
      moduleTitle: c.modules?.title || '—',
      classDate: c.class_date,
      startTime: c.start_time,
      endTime: c.end_time,
      locationName: c.location_name,
      attendanceStatus: c.attendance_status || 'scheduled',
      totalRoster,
      present: att.present,
      late: att.late,
      absent,
      rate
    };
  });
}

/**
 * Export attendance roster to CSV
 */
export function exportAttendanceCSV(classInfo, roster) {
  const header = [
    'Student ID',
    'Full Name',
    'Email',
    'Programme',
    'Status',
    'Marked At',
    'GPS Distance (m)',
    'Verification',
    'Notes'
  ];

  const rows = roster.map(r => [
    r.studentId,
    r.fullName,
    r.email,
    r.programme,
    r.status.toUpperCase(),
    r.markedAt ? new Date(r.markedAt).toLocaleString() : 'Not Marked',
    r.distanceMeters != null ? Math.round(r.distanceMeters) : '—',
    r.verificationMethod === 'gps_device' ? 'GPS + Device Bound' : r.verificationMethod === 'manual_lecturer' ? 'Manual Lecturer' : 'None',
    r.lecturerNotes || ''
  ]);

  const escapeCsvValue = v => {
    const str = String(v ?? '');
    return `"${str.replaceAll('"', '""')}"`;
  };

  const csvContent = [
    `# Module: ${classInfo.modules?.code} - ${classInfo.modules?.title}`,
    `# Class Date: ${classInfo.class_date} (${classInfo.start_time} - ${classInfo.end_time})`,
    `# Location: ${classInfo.location_name} (Radius: ${classInfo.radius_meters}m)`,
    `# Exported: ${new Date().toLocaleString()}`,
    '',
    header.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `Attendance_${classInfo.modules?.code || 'CLASS'}_${classInfo.class_date}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
