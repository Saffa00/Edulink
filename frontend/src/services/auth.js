import { requireSupabase } from './supabase';
import { apiUrl } from './apiConfig';

const supabase = () => requireSupabase();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeUuid(val) {
  if (!val || typeof val !== 'string') return null;
  return UUID_REGEX.test(val) ? val : null;
}

export async function signUpStudent(form) {
  const safeFacultyId = safeUuid(form.facultyId);
  const safeDeptId = safeUuid(form.departmentId);
  const safeProgId = safeUuid(form.programmeId);

  const { data: authData, error: authError } = await supabase().auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: {
        role: 'student',
        full_name: form.fullName,
        student_id: form.studentId,
        campus: form.campus || null,
        faculty: safeFacultyId,
        faculty_id: safeFacultyId,
        faculty_code: form.facultyId || null,
        department: safeDeptId,
        department_id: safeDeptId,
        department_code: form.departmentId || null,
        programme: form.programme || null
      }
    }
  });
  if (authError) throw authError;

  const studentPayload = {
    auth_user_id: authData.user?.id,
    student_id: form.studentId,
    full_name: form.fullName,
    email: form.email,
    phone: form.phone || null,
    faculty_id: safeFacultyId,
    department_id: safeDeptId,
    programme_id: safeProgId,
    level: form.level ? Number(form.level) : null,
    academic_year: form.academicYear || null,
    semester: form.semester || null,
    registration_type: form.registrationType || 'normal',
    account_status: 'pending_payment'
  };

  let { error } = await supabase().from('students').insert({
    ...studentPayload,
    programme: form.programme || null
  });

  if (error && error.message && error.message.includes('programme')) {
    const retry = await supabase().from('students').insert(studentPayload);
    error = retry.error;
  }
  if (error) throw error;
  if (authData.session && Array.isArray(form.modules) && form.modules.length) {
    try {
      const response = await fetch(apiUrl('/api/registration/modules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.session.access_token}` },
        body: JSON.stringify({ studentId: form.studentId, moduleCodes: form.modules })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) console.warn('Could not register selected modules:', body.error);
    } catch (netErr) {
      console.warn('Module registration network deferred:', netErr.message);
    }
  }
  return authData;
}

export async function signUpLecturer(form) {
  const safeFacultyId = safeUuid(form.facultyId);
  const safeDeptId = safeUuid(form.departmentId);

  const { data: authData, error: authError } = await supabase().auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: {
        role: 'lecturer',
        full_name: form.fullName,
        campus: form.campus || null,
        faculty: safeFacultyId,
        faculty_id: safeFacultyId,
        faculty_code: form.facultyId || null,
        department: safeDeptId,
        department_id: safeDeptId,
        department_code: form.departmentId || null,
        programme_lecturing: form.programmeLecturing || form.programme || 'BSc',
        level_lecturing: form.levelLecturing || form.level || '1',
        programme: form.programmeLecturing || form.programme || 'BSc',
        level: form.levelLecturing || form.level || '1',
        teaching_area: form.teachingArea || null
      }
    }
  });
  if (authError) throw authError;

  const lecturerId = form.lecturerId || `LECT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const teachingArea = form.teachingArea || (Array.isArray(form.modules) && form.modules.length ? form.modules.join(', ') : 'Computer Science');
  const { data: createdLecturer, error } = await supabase().from('lecturers').insert({
    auth_user_id: authData.user?.id,
    lecturer_id: lecturerId,
    full_name: form.fullName,
    email: form.email,
    phone: form.phone || null,
    faculty_id: safeFacultyId,
    department_id: safeDeptId,
    teaching_area: teachingArea,
    active: true
  }).select('id').maybeSingle();
  if (error) throw error;

  // If lecturer selected specific module codes during registration, link or insert them
  if (Array.isArray(form.modules) && form.modules.length > 0 && createdLecturer?.id) {
    try {
      const { data: existingMods } = await supabase()
        .from('modules')
        .select('id, code')
        .in('code', form.modules);

      const existingCodes = new Set((existingMods || []).map(m => m.code));
      if (existingMods && existingMods.length > 0) {
        await supabase()
          .from('modules')
          .update({ lecturer_id: createdLecturer.id })
          .in('code', Array.from(existingCodes));
      }

      const missingCodes = form.modules.filter(c => !existingCodes.has(c));
      if (missingCodes.length > 0) {
        const toInsert = missingCodes.map(code => ({
          code,
          title: code,
          lecturer_id: createdLecturer.id,
          faculty_id: safeFacultyId,
          department_id: safeDeptId,
          active: true
        }));
        await supabase().from('modules').insert(toInsert);
      }
    } catch (modErr) {
      console.warn('Module link notice:', modErr.message);
    }
  }

  return { ...authData, lecturerId };
}

export async function signInById({ role, id, password }) {
  const table = role === 'lecturer' ? 'lecturers' : 'students';
  const columns = '*';
  const cleanId = (id || '').trim();

  if (!cleanId) {
    throw new Error(`${role === 'lecturer' ? 'Lecturer' : 'Student'} ID or email is required.`);
  }

  try {
    // If user entered their email address directly
    if (cleanId.includes('@')) {
      const { data, error } = await supabase().auth.signInWithPassword({
        email: cleanId,
        password
      });
      if (error) throw error;

      let { data: profile } = await supabase()
        .from(table).select(columns)
        .or(`auth_user_id.eq.${data.user?.id},email.eq.${cleanId.toLowerCase()}`).maybeSingle();

      if (profile && !profile.auth_user_id && data.user?.id) {
        supabase().from(table).update({ auth_user_id: data.user.id }).eq('id', profile.id).then(null, () => {});
      }

      if (role === 'student' && profile && profile.account_status === 'suspended') {
        throw new Error('Student account is suspended. Please contact administration.');
      }
      if (role === 'lecturer' && profile && profile.active === false) {
        throw new Error('Lecturer account is inactive.');
      }
      const savedAvatarEmail = (data.user?.user_metadata?.avatar_url) ||
        (profile?.id && localStorage.getItem(`edulink_avatar_${profile.id}`)) ||
        (profile?.student_id && localStorage.getItem(`edulink_avatar_${profile.student_id}`)) ||
        (profile?.lecturer_id && localStorage.getItem(`edulink_avatar_${profile.lecturer_id}`)) ||
        (data.user?.id && localStorage.getItem(`edulink_avatar_${data.user.id}`)) ||
        localStorage.getItem('edulink_active_avatar') ||
        profile?.avatar_url ||
        null;

      const resolvedProfile = profile
        ? { ...profile, role, avatar_url: savedAvatarEmail }
        : { auth_user_id: data.user?.id, email: cleanId, role, avatar_url: savedAvatarEmail };

      if (typeof window !== 'undefined') {
        localStorage.setItem('academic_active_role', role);
        if (savedAvatarEmail) localStorage.setItem('edulink_active_avatar', savedAvatarEmail);
      }
      return { ...data, profile: resolvedProfile };
    }

    // Look up by Student ID or Lecturer ID
    let query = supabase().from(table).select(columns);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    if (role === 'student') {
      query = isUuid ? query.or(`student_id.eq.${cleanId},id.eq.${cleanId}`) : query.eq('student_id', cleanId);
    } else {
      query = isUuid ? query.or(`lecturer_id.eq.${cleanId},id.eq.${cleanId}`) : query.eq('lecturer_id', cleanId);
    }
    const { data: profile, error: profileError } = await query.maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      throw new Error(`${role === 'lecturer' ? 'Lecturer' : 'Student'} ID "${cleanId}" not found.`);
    }

    if (role === 'student' && profile.account_status === 'suspended') {
      throw new Error('Student account is suspended. Please contact administration.');
    }
    if (role === 'lecturer' && profile.active === false) {
      throw new Error('Lecturer account is inactive.');
    }

    const { data, error } = await supabase().auth.signInWithPassword({
      email: profile.email,
      password
    });
    if (error) throw error;

    const savedAvatarId = (data.user?.user_metadata?.avatar_url) ||
      (profile?.id && localStorage.getItem(`edulink_avatar_${profile.id}`)) ||
      (profile?.student_id && localStorage.getItem(`edulink_avatar_${profile.student_id}`)) ||
      (profile?.lecturer_id && localStorage.getItem(`edulink_avatar_${profile.lecturer_id}`)) ||
      (data.user?.id && localStorage.getItem(`edulink_avatar_${data.user.id}`)) ||
      localStorage.getItem('edulink_active_avatar') ||
      profile?.avatar_url ||
      null;

    if (typeof window !== 'undefined') {
      localStorage.setItem('academic_active_role', role);
      if (savedAvatarId) localStorage.setItem('edulink_active_avatar', savedAvatarId);
    }

    return { ...data, profile: { ...profile, role, avatar_url: savedAvatarId } };
  } catch (err) {
    const raw = String(err?.message || err || '');
    if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
      throw new Error('Unable to connect to the authentication server. Please verify your internet connection.');
    }
    throw err;
  }
}

export async function signOut() {
  const { error } = await supabase().auth.signOut();
  if (error) throw error;
}
