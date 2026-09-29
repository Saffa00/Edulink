import { supabase } from './supabase';

export async function getMyModules() {
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw ue || new Error('Not authenticated');

  const { data: lecturer, error: le } = await supabase
    .from('lecturers')
    .select('id,lecturer_id,full_name,email')
    .eq('auth_user_id', user.id)
    .single();

  if (le) throw le;

  const { data, error } = await supabase
    .from('modules')
    .select('id,code,title,level,semester,active,student_modules(count)')
    .eq('lecturer_id', lecturer.id)
    .order('code');

  if (error) throw error;

  const formattedModules = (data || []).map(m => ({
    ...m,
    studentsCount: m.student_modules?.[0]?.count || 0
  }));

  return { lecturer, modules: formattedModules };
}

export async function createModule(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: lecturer, error: le } = await supabase
    .from('lecturers')
    .select('id,faculty_id,department_id')
    .eq('auth_user_id', user.id)
    .single();

  if (le) throw le;

  const targetLevel = payload.level ? String(payload.level).trim() : null;

  const { data, error } = await supabase
    .from('modules')
    .insert({
      code: payload.code.trim().toUpperCase(),
      title: payload.title.trim(),
      level: targetLevel,
      semester: payload.semester ? String(payload.semester).trim() : null,
      lecturer_id: lecturer.id,
      faculty_id: lecturer.faculty_id || null,
      department_id: lecturer.department_id || null,
      active: true
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-allocate students: Find all students matching this academic level and enroll them automatically
  if (data?.id) {
    try {
      let studentQuery = supabase.from('students').select('id');
      if (targetLevel) {
        const numLevel = Number(targetLevel);
        if (!isNaN(numLevel)) {
          studentQuery = studentQuery.eq('level', numLevel);
        }
      }
      const { data: eligibleStudents } = await studentQuery;
      if (eligibleStudents?.length) {
        const enrollments = eligibleStudents.map(s => ({
          student_id: s.id,
          module_id: data.id
        }));
        await supabase.from('student_modules').insert(enrollments).select().catch(() => {});
      }
    } catch (allocErr) {
      console.warn('Auto-enrollment background notice:', allocErr.message);
    }
  }

  return data;
}

export async function updateModule(id, payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: lecturer, error: le } = await supabase
    .from('lecturers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (le) throw le;

  const { data, error } = await supabase
    .from('modules')
    .update({
      code: payload.code ? payload.code.trim().toUpperCase() : undefined,
      title: payload.title ? payload.title.trim() : undefined,
      level: payload.level ? String(payload.level).trim() : undefined,
      semester: payload.semester ? String(payload.semester).trim() : undefined
    })
    .eq('id', id)
    .eq('lecturer_id', lecturer.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: lecturer, error: le } = await supabase
    .from('lecturers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (le) throw le;

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)
    .eq('lecturer_id', lecturer.id);

  if (error) throw error;
  return true;
}

export async function getModuleStudents(moduleId) {
  const { data, error } = await supabase
    .from('student_modules')
    .select(`
      id,
      registered_at,
      students (
        id,
        student_id,
        full_name,
        email,
        level,
        academic_year,
        semester,
        programme
      )
    `)
    .eq('module_id', moduleId)
    .order('registered_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
