import { supabase } from './supabase';

export async function currentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function getStudentDashboard(studentId) {
  const [{ data: student, error: se }, { data: modules, error: me },
    { data: grades, error: ge }, { data: attendance, error: ae }] = await Promise.all([
    supabase.from('students').select('*, faculties(name), departments(name), programmes(name)').eq('id', studentId).single(),
    supabase.from('student_modules').select('*, modules(code,title,level,semester,lecturers(lecturer_id,full_name))').eq('student_id', studentId),
    supabase.from('grades').select('*, modules(code,title)').eq('student_id', studentId).eq('published', true),
    supabase.from('attendance').select('*, classes(class_date,start_time,end_time,location_name,modules(code,title))').eq('student_id', studentId).order('marked_at',{ascending:false}).limit(50)
  ]);
  for (const e of [se,me,ge,ae]) if (e) throw e;
  return { student, modules: modules || [], grades: grades || [], attendance: attendance || [] };
}

export async function getLecturerDashboard(lecturerId) {
  const [{ data: lecturer, error: le }, { data: modules, error: me },
    { data: assignments, error: ae }] = await Promise.all([
    supabase.from('lecturers').select('*, faculties(name), departments(name)').eq('id', lecturerId).single(),
    supabase.from('modules').select('*').eq('lecturer_id', lecturerId).order('code'),
    supabase.from('assignments').select('*, modules(code,title)').eq('lecturer_id', lecturerId).order('due_at')
  ]);
  for (const e of [le,me,ae]) if (e) throw e;
  return { lecturer, modules: modules || [], assignments: assignments || [] };
}
