import { supabase } from './supabase';

export async function getMyStudentProfile() {
  const { data: { user }, error: u } = await supabase.auth.getUser();
  if (u || !user) throw u || new Error('Not authenticated');

  const { data, error } = await supabase
    .from('students')
    .select('id, student_id, full_name, level, academic_year, semester, department_id, faculty_id, programme')
    .eq('auth_user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function getTodaysClasses(studentId, date = new Date().toISOString().slice(0, 10)) {
  // 1. Check enrolled modules
  let { data: enrolled, error } = await supabase
    .from('student_modules')
    .select('module_id, modules(id, code, title, lecturers(full_name), classes(id, class_date, start_time, end_time, location_name, latitude, longitude, radius_meters, attendance_status))')
    .eq('student_id', studentId);

  let classes = [];
  if (!error && enrolled && enrolled.length > 0) {
    classes = enrolled
      .flatMap(x => (x.modules?.classes || []).filter(c => c.class_date === date).map(c => ({ ...c, module: x.modules })));
  }

  // 2. Fallback to all department classes scheduled today if enrolled list is empty
  if (classes.length === 0) {
    const { data: deptClasses } = await supabase
      .from('classes')
      .select('id, class_date, start_time, end_time, location_name, latitude, longitude, radius_meters, attendance_status, modules(id, code, title, lecturers(full_name))')
      .eq('class_date', date);

    if (deptClasses && deptClasses.length > 0) {
      classes = deptClasses.map(c => ({ ...c, module: c.modules }));
    }
  }

  return classes.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
}

export async function getMyAttendance(studentId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, marked_at, status, distance_meters, verification_method, class_id, classes(id, class_date, start_time, end_time, location_name, modules(id, code, title, lecturers(full_name)))')
    .eq('student_id', studentId)
    .order('marked_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all attendance sessions held across the department
 * and cross-reference with this student's attendance status
 */
export async function getDepartmentAttendanceLogs(studentId) {
  // Fetch all classes held across department modules with lecturer and attendance details
  const { data: allClasses, error } = await supabase
    .from('classes')
    .select(`
      id, class_date, start_time, end_time, location_name, attendance_status,
      modules(id, code, title, lecturers(full_name)),
      attendance(id, student_id, status, marked_at, distance_meters, verification_method)
    `)
    .order('class_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) {
    console.warn('Error fetching department attendance:', error);
    return [];
  }

  const logs = (allClasses || []).map(cls => {
    const attendees = cls.attendance || [];
    const myRecord = attendees.find(a => a.student_id === studentId);
    const isPast = new Date(`${cls.class_date}T${cls.end_time || '23:59'}Z`) < new Date();

    let studentStatus = 'absent';
    if (myRecord) {
      studentStatus = myRecord.status || 'present';
    } else if (!isPast && cls.attendance_status === 'open') {
      studentStatus = 'open_now';
    } else if (!isPast) {
      studentStatus = 'upcoming';
    }

    return {
      id: cls.id,
      classDate: cls.class_date,
      startTime: cls.start_time,
      endTime: cls.end_time,
      venue: cls.location_name || 'Department Lecture Hall',
      moduleCode: cls.modules?.code || '—',
      moduleTitle: cls.modules?.title || 'General Department Lecture',
      lecturerName: cls.modules?.lecturers?.full_name || 'Academic Staff',
      totalPresent: attendees.length,
      myStatus: studentStatus,
      myRecord: myRecord || null
    };
  });

  return logs;
}

export async function markStudentAttendance({ classId, latitude, longitude, deviceToken }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in again.');

  const r = await fetch('/api/attendance/mark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ classId, latitude, longitude, deviceToken })
  });

  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Attendance failed');
  return d;
}
