import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';
import { getCurriculumModules } from '../data/academicCatalogue.js';
import { sendAcademicNotification } from './liveNotificationService.js';

// ============================================================================
// Shared Auth Helpers
// ============================================================================
export async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error || new Error('You must be signed in.');
  return user;
}

export async function getLecturerProfile() {
  const user = await getAuthUser();
  const { data, error } = await supabase
    .from('lecturers')
    .select('id, lecturer_id, full_name, email, department_id, faculty_id, teaching_area')
    .eq('auth_user_id', user.id)
    .single();
  if (error) throw error;
  return { ...data, department: data.teaching_area || '' };
}

export async function getStudentProfile() {
  const user = await getAuthUser();
  const { data, error } = await supabase
    .from('students')
    .select('id, student_id, full_name, email, programme, level, academic_year, semester, registration_type, account_status, faculty_id, department_id')
    .eq('auth_user_id', user.id)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// V41: Complete Grade Management (Strictly Individual - No GPA/CGPA)
// ============================================================================
export function calculateGradeLetter(score) {
  if (score == null || score === '') return '';
  const s = Number(score);
  if (s >= 75) return 'A';
  if (s >= 65) return 'B';
  if (s >= 50) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

export async function getModuleGradeSheet(moduleId) {
  let lecturer = null;
  try {
    lecturer = await getLecturerProfile();
  } catch (err) {
    console.warn('Could not load lecturer profile for grade sheet:', err);
  }

  // 1. Module info
  let { data: mod, error: me } = await supabase
    .from('modules')
    .select('id, code, title, level, semester, department_id')
    .eq('id', moduleId)
    .maybeSingle();

  if (!mod) {
    const { data: byCode } = await supabase
      .from('modules')
      .select('id, code, title, level, semester, department_id')
      .eq('code', moduleId)
      .maybeSingle();
    mod = byCode;
  }

  if (!mod) {
    return { module: null, rows: [], stats: { total: 0, graded: 0, published: 0, pending: 0 } };
  }

  // 2. Enrolled students strictly from student_modules for this specific module
  const { data: enrolled } = await supabase
    .from('student_modules')
    .select('student_id, students(id, student_id, full_name, email, programme, level, department_id)')
    .eq('module_id', mod.id);

  let studentList = (enrolled || [])
    .map(item => item.students)
    .filter(Boolean);

  // 3. Existing grades
  const { data: grades } = await supabase
    .from('grades')
    .select('id, student_id, score, grade, published, remarks, updated_at, published_at')
    .eq('module_id', mod.id);

  const gradeMap = new Map();
  (grades || []).forEach(g => gradeMap.set(g.student_id, g));

  const rows = (studentList || []).map(s => {
    const g = gradeMap.get(s.id);
    return {
      studentInternalId: s.id,
      studentId: s.student_id,
      fullName: s.full_name,
      email: s.email,
      programme: s.programme || 'Undergraduate',
      gradeId: g?.id || null,
      score: g?.score != null ? Number(g.score) : '',
      gradeLetter: g?.grade || '',
      published: g?.published || false,
      remarks: g?.remarks || '',
      updatedAt: g?.updated_at || null
    };
  });

  rows.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  const total = rows.length;
  const graded = rows.filter(r => r.score !== '').length;
  const published = rows.filter(r => r.published).length;

  return { module: mod, rows, stats: { total, graded, published, pending: total - published } };
}

export async function saveIndividualGrade({ moduleId, studentInternalId, score, remarks = '' }) {
  let lecturer = null;
  try {
    lecturer = await getLecturerProfile();
  } catch (err) {
    console.warn('Lecturer profile query note:', err);
  }

  const numScore = score === '' || score == null ? null : Number(score);
  if (numScore != null && (numScore < 0 || numScore > 100)) {
    throw new Error('Grade score must be between 0 and 100.');
  }
  const gradeLetter = calculateGradeLetter(numScore);

  const { data: existing } = await supabase
    .from('grades')
    .select('id, score, grade')
    .eq('module_id', moduleId)
    .eq('student_id', studentInternalId)
    .maybeSingle();

  let gradeRecord;
  if (existing) {
    const { data, error } = await supabase
      .from('grades')
      .update({
        score: numScore,
        grade: gradeLetter,
        remarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    gradeRecord = data;

    // Log audit
    await supabase.from('grade_audits').insert({
      grade_id: existing.id,
      module_id: moduleId,
      student_id: studentInternalId,
      lecturer_id: lecturer?.id || null,
      old_score: existing.score,
      new_score: numScore,
      old_grade: existing.grade,
      new_grade: gradeLetter,
      action: 'update',
      reason: remarks || 'Individual grade entry'
    });
  } else {
    const { data, error } = await supabase
      .from('grades')
      .insert({
        module_id: moduleId,
        student_id: studentInternalId,
        lecturer_id: lecturer?.id || null,
        score: numScore,
        grade: gradeLetter,
        published: false,
        remarks
      })
      .select()
      .single();
    if (error) throw error;
    gradeRecord = data;

    await supabase.from('grade_audits').insert({
      grade_id: data.id,
      module_id: moduleId,
      student_id: studentInternalId,
      lecturer_id: lecturer?.id || null,
      old_score: null,
      new_score: numScore,
      old_grade: null,
      new_grade: gradeLetter,
      action: 'create',
      reason: remarks || 'Initial grade entry'
    });
  }

  // Real-time Academic Notification for Individual Grade Recording
  try {
    const { data: st } = await supabase.from('students').select('auth_user_id, full_name').eq('id', studentInternalId).single();
    const { data: m } = await supabase.from('modules').select('code, title').eq('id', moduleId).single();
    if (st?.auth_user_id) {
      await sendAcademicNotification({
        recipientUserId: st.auth_user_id,
        title: `Grade Recorded: ${m?.code || 'Module'}`,
        body: `Your score for ${m?.code || ''} ${m?.title || ''} is: ${numScore} (Grade ${gradeLetter}).${remarks ? ` Remarks: ${remarks}` : ''}`,
        category: 'grade',
        linkUrl: 'grades'
      });
    }
  } catch (notifErr) {
    console.warn('Individual grade notification notice:', notifErr?.message);
  }

  return gradeRecord;
}

export async function publishAllModuleGrades(moduleId) {
  let lecturer = null;
  try {
    lecturer = await getLecturerProfile();
  } catch (err) {
    console.warn('Lecturer profile query note:', err);
  }
  const now = new Date().toISOString();

  let query = supabase
    .from('grades')
    .update({ published: true, published_at: now })
    .eq('module_id', moduleId);

  if (lecturer?.id) {
    query = query.or(`lecturer_id.eq.${lecturer.id},lecturer_id.is.null`);
  }

  const { data: updated, error } = await query.select();
  if (error) throw error;

  // Insert audit records and notify all graded students
  if (updated && updated.length) {
    let modInfo = null;
    try {
      const { data: m } = await supabase.from('modules').select('code, title').eq('id', moduleId).single();
      modInfo = m;
    } catch {}

    for (const g of updated) {
      await supabase.from('grade_audits').insert({
        grade_id: g.id,
        module_id: moduleId,
        student_id: g.student_id,
        lecturer_id: lecturer?.id || null,
        new_score: g.score,
        new_grade: g.grade,
        action: 'publish',
        reason: 'Bulk module grade publication'
      });

      // Dispatch live notification to student
      try {
        const { data: st } = await supabase.from('students').select('auth_user_id, full_name').eq('id', g.student_id).single();
        if (st?.auth_user_id) {
          await sendAcademicNotification({
            recipientUserId: st.auth_user_id,
            title: `Official Grade Published: ${modInfo?.code || 'Module'}`,
            body: `Your final grade for ${modInfo?.code || ''} ${modInfo?.title || ''} is published: Score ${g.score} (Grade ${g.grade}).`,
            category: 'grade',
            linkUrl: 'grades'
          });
        }
      } catch (stNotifErr) {
        console.warn('Grade publish notification notice:', stNotifErr?.message);
      }
    }
  }

  return updated;
}

export async function getGradeAuditLog(moduleId) {
  const { data, error } = await supabase
    .from('grade_audits')
    .select('id, old_score, new_score, old_grade, new_grade, action, reason, created_at, students(student_id, full_name)')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================================================
// V42: Dissertation Management (Chapters 1–5 & Supervision)
// ============================================================================
const DISSERTATION_BUCKET = 'dissertation-documents';

export async function getStudentDissertation() {
  const student = await getStudentProfile();

  const { data: diss, error } = await supabase
    .from('dissertations')
    .select('id, title, status, current_chapter, progress_percentage, supervisor_notes, supervisor_id, lecturers(id, full_name, email)')
    .eq('student_id', student.id)
    .maybeSingle();

  if (error) throw error;
  if (!diss) return { student, dissertation: null, versions: [] };

  const { data: versions } = await supabase
    .from('dissertation_versions')
    .select('id, chapter, version_number, file_url, lecturer_comment, status, submitted_at, reviewed_at')
    .eq('dissertation_id', diss.id)
    .order('submitted_at', { ascending: false });

  return { student, dissertation: diss, versions: versions || [] };
}

export async function registerDissertationTopic(title, supervisorId = null) {
  const student = await getStudentProfile();
  const { data, error } = await supabase
    .from('dissertations')
    .upsert({
      student_id: student.id,
      title: title.trim(),
      supervisor_id: supervisorId || null,
      status: 'proposal',
      current_chapter: 1,
      progress_percentage: 20
    }, { onConflict: 'student_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitDissertationChapterFile({ dissertationId, chapterName, file }) {
  const student = await getStudentProfile();
  if (!file) throw new Error('Choose a document to submit.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${student.id}/dissertation/${chapterName}/${Date.now()}-${safeName}`;

  const { error: ue } = await supabase.storage.from(DISSERTATION_BUCKET).upload(path, file, {
    upsert: false
  });
  if (ue) throw ue;

  // Count existing versions for this chapter
  const { count } = await supabase
    .from('dissertation_versions')
    .select('id', { count: 'exact', head: true })
    .eq('dissertation_id', dissertationId)
    .eq('chapter', chapterName);

  const versionNumber = (count || 0) + 1;

  const { data, error } = await supabase
    .from('dissertation_versions')
    .insert({
      dissertation_id: dissertationId,
      chapter: chapterName,
      version_number: versionNumber,
      file_url: path,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('dissertations')
    .update({ status: 'chapter_review', updated_at: new Date().toISOString() })
    .eq('id', dissertationId);

  return data;
}

export async function getSupervisedDissertations() {
  const lecturer = await getLecturerProfile();

  const { data, error } = await supabase
    .from('dissertations')
    .select(`
      id, title, status, current_chapter, progress_percentage, supervisor_notes, updated_at,
      students(id, student_id, full_name, email, programme),
      dissertation_versions(id, chapter, version_number, file_url, lecturer_comment, status, submitted_at)
    `)
    .eq('supervisor_id', lecturer.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function reviewDissertationVersion({ versionId, dissertationId, status, comments = '' }) {
  const { data, error } = await supabase
    .from('dissertation_versions')
    .update({
      status,
      lecturer_comment: comments,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', versionId)
    .select()
    .single();

  if (error) throw error;

  // If approved, calculate progress boost and status
  let dissStatus = status === 'approved' ? 'approved' : status === 'corrections_needed' ? 'corrections_required' : 'chapter_review';
  await supabase
    .from('dissertations')
    .update({
      status: dissStatus,
      supervisor_notes: comments,
      updated_at: new Date().toISOString()
    })
    .eq('id', dissertationId);

  return data;
}

// ============================================================================
// V43: Timetable & Schedule Management
// ============================================================================
export async function getWeeklyTimetable(role) {
  if (role === 'lecturer') {
    const lecturer = await getLecturerProfile();
    const { data, error } = await supabase
      .from('schedules')
      .select('id, day_of_week, start_time, end_time, location_name, room_code, modules(id, code, title)')
      .eq('lecturer_id', lecturer.id)
      .order('start_time');
    if (error) throw error;
    return data || [];
  } else {
    const student = await getStudentProfile();
    const { data: sm, error: sme } = await supabase
      .from('student_modules')
      .select('module_id')
      .eq('student_id', student.id);
    if (sme) throw sme;

    const moduleIds = (sm || []).map(x => x.module_id);
    if (!moduleIds.length) return [];

    const { data, error } = await supabase
      .from('schedules')
      .select('id, day_of_week, start_time, end_time, location_name, room_code, modules(id, code, title), lecturers(full_name)')
      .in('module_id', moduleIds)
      .order('start_time');
    if (error) throw error;
    return data || [];
  }
}

export async function createScheduleSlot(payload) {
  const lecturer = await getLecturerProfile();
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      module_id: payload.module_id,
      lecturer_id: lecturer.id,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
      location_name: payload.location_name,
      room_code: payload.room_code || ''
    })
    .select('*, modules(code, title)')
    .single();
  if (error) throw error;

  // Auto-link module to this lecturer if not already assigned
  try {
    await supabase
      .from('modules')
      .update({ lecturer_id: lecturer.id })
      .eq('id', payload.module_id)
      .is('lecturer_id', null);
  } catch (linkErr) {
    console.warn('Auto module link notice:', linkErr.message);
  }

  return data;
}

export async function deleteScheduleSlot(slotId) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', slotId);
  if (error) throw error;
  return true;
}

// ============================================================================
// V44: Realtime Conversations & Messages
// ============================================================================
// V44: Messaging & Realtime Consultations
// ============================================================================
export async function getConversationsList() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    try {
      const res = await fetch(apiUrl('/api/messages/conversations'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.conversations) return json.conversations;
      }
    } catch (apiErr) {
      console.warn('API conversations fetch failed, trying direct Supabase:', apiErr.message);
    }
  }

  const user = await getAuthUser();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, module_id, student_id, lecturer_id, last_message_at,
      modules(id, code, title, level, semester),
      students(id, student_id, full_name, email, phone, programme, level),
      lecturers(id, lecturer_id, full_name, email, phone, teaching_area)
    `)
    .or(`student_user_id.eq.${user.id},lecturer_user_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.warn('Supabase conversations query error:', error.message);
    return [];
  }
  return data || [];
}

export async function getConversationMessages(conversationId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token && conversationId) {
    try {
      const res = await fetch(apiUrl(`/api/messages/conversations/${conversationId}/messages`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.messages) return json.messages;
      }
    } catch (apiErr) {
      console.warn('API messages fetch failed, trying direct Supabase:', apiErr.message);
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_user_id, body, created_at, read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendChatMessage(conversationId, body) {
  const clean = String(body || '').trim();
  if (!clean) throw new Error('Message cannot be empty.');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    try {
      const res = await fetch(apiUrl('/api/messages/send'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ conversationId, body: clean })
      });
      if (res.ok) {
        const json = await res.json();
        return json.message;
      }
    } catch (apiErr) {
      console.warn('API send message failed, falling back to direct Supabase:', apiErr.message);
    }
  }

  const user = await getAuthUser();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: user.id,
      body: clean
    })
    .select()
    .single();

  if (error) throw error;

  try {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch {}

  return data;
}

export async function createOrGetConversation({ moduleId, lecturerId, studentId, recipientType, recipientId, initialMessage }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) throw new Error('You must be signed in.');

  const res = await fetch(apiUrl('/api/messages/conversations'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ moduleId, lecturerId, studentId, recipientType, recipientId, initialMessage })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to start conversation.');
  return json.conversation;
}

export async function getAvailableChatContacts() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    try {
      const res = await fetch(apiUrl('/api/messages/contacts'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API contacts fetch failed:', err.message);
    }
  }

  const [mods, lecs, stus] = await Promise.all([
    supabase.from('modules').select('id, code, title, level'),
    supabase.from('lecturers').select('id, lecturer_id, full_name, email'),
    supabase.from('students').select('id, student_id, full_name, email, registration_type').limit(20)
  ]);

  return {
    modules: mods.data || [],
    lecturers: lecs.data || [],
    students: stus.data || []
  };
}

// ============================================================================
// V45: Notifications Hub
// ============================================================================
export async function getNotifications(category = null) {
  const user = await getAuthUser();
  let query = supabase
    .from('notifications')
    .select('id, title, body, read_at, created_at, category, link_url')
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead() {
  const user = await getAuthUser();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user.id)
    .is('read_at', null);
  if (error) throw error;
  return true;
}

// ============================================================================
// V46: Payment Status & Receipts
// ============================================================================
export async function getStudentPaymentHistory() {
  const student = await getStudentProfile();
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, currency, payment_type, status, provider, provider_reference, receipt_number, verified_at, created_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { student, payments: data || [] };
}

// ============================================================================
// V47: Student Module Catalogue & Registration
// ============================================================================
export async function getModuleCatalogue() {
  const student = await getStudentProfile();

  // Rule: If student fill in level 2 academic information, let all modules for level 3 shows and lectures alone.
  const rawLevelNum = Number(student.level);
  const effectiveLevel = rawLevelNum === 2 ? 3 : (rawLevelNum || 3);
  const effectiveSemester = (student.semester && String(student.semester).toLowerCase().includes('second'))
    ? 'Second Semester'
    : 'First Semester';

  // 1. Get official curriculum modules (8 or 9 modules base on department, level, semester)
  const curriculumMods = getCurriculumModules({
    facultyId: student.faculty_id,
    departmentId: student.department_id || 'dept-computer-science',
    programme: student.programme,
    level: student.level, // internal logic maps level 2 to level 3
    semester: student.semester
  });

  // 2. Fetch all active modules from database
  let allModules = [];
  try {
    const { data } = await supabase
      .from('modules')
      .select('id, code, title, level, semester, active, lecturers(id, lecturer_id, full_name, email)')
      .eq('active', true)
      .order('code');
    allModules = data || [];
  } catch (err) {
    console.warn('Modules query notice:', err);
  }

  // 3. Fetch student's currently registered modules
  let enrolled = [];
  try {
    const { data } = await supabase
      .from('student_modules')
      .select('module_id, registered_at')
      .eq('student_id', student.id);
    enrolled = data || [];
  } catch (err) {
    console.warn('Enrolled query notice:', err);
  }

  const enrolledSet = new Set((enrolled || []).map(e => e.module_id));

  // Merge curriculum modules with DB modules, ensuring 8 or 9 modules with assigned lecturer alone
  const mergedList = curriculumMods.map((cm, idx) => {
    const normCode = cm.code.replace(/\s+/g, '').toUpperCase();
    const dbMod = (allModules || []).find(m => m.code?.replace(/\s+/g, '').toUpperCase() === normCode);
    const modId = dbMod?.id || `mod-curr-${cm.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Lecturer alone for this module
    const lecturerFullName = dbMod?.lecturers?.full_name || cm.lecturerName || (effectiveLevel === 3 ? 'Peter Saffa' : 'Academic Staff');
    const lecturerId = dbMod?.lecturers?.lecturer_id || cm.lecturerId || (effectiveLevel === 3 ? 'LECT-2026-790380' : `LECT-${1000 + idx}`);

    return {
      id: modId,
      code: cm.code,
      title: cm.title,
      level: effectiveLevel,
      originalLevel: student.level,
      semester: effectiveSemester,
      isEnrolled: true,
      autoAllocated: true,
      accountStatus: student.account_status,
      isPaid: student.account_status === 'active',
      lecturers: {
        full_name: lecturerFullName,
        lecturer_id: lecturerId
      }
    };
  });

  // Background auto-allocate: Link matching DB modules in student_modules
  try {
    const toInsert = (allModules || [])
      .filter(m => {
        const norm = m.code?.replace(/\s+/g, '').toUpperCase();
        return curriculumMods.some(cm => cm.code.replace(/\s+/g, '').toUpperCase() === norm) && !enrolledSet.has(m.id);
      })
      .map(m => ({
        student_id: student.id,
        module_id: m.id
      }));

    if (toInsert.length > 0) {
      await supabase.from('student_modules').upsert(toInsert, { onConflict: 'student_id,module_id', ignoreDuplicates: true });
    }
  } catch (syncErr) {
    // Non-blocking
  }

  return mergedList;
}

export async function addModuleRegistration(moduleId) {
  const student = await getStudentProfile();
  const { data, error } = await supabase
    .from('student_modules')
    .insert({
      student_id: student.id,
      module_id: moduleId
    })
    .select('*, modules(code, title)')
    .single();
  if (error) throw error;
  return data;
}

export async function dropModuleRegistration(moduleId) {
  const student = await getStudentProfile();
  const { error } = await supabase
    .from('student_modules')
    .delete()
    .eq('student_id', student.id)
    .eq('module_id', moduleId);
  if (error) throw error;
  return true;
}

// ============================================================================
// V48: Lecturer Student 360 Management
// ============================================================================
export async function getLecturerStudentRoster() {
  const lecturer = await getLecturerProfile();

  // Get modules owned by lecturer
  const { data: modules } = await supabase
    .from('modules')
    .select('id')
    .eq('lecturer_id', lecturer.id);

  const modIds = (modules || []).map(m => m.id);
  if (!modIds.length) return [];

  const { data, error } = await supabase
    .from('student_modules')
    .select(`
      module_id, registered_at,
      modules(code, title),
      students(id, student_id, full_name, email, programme, level, account_status)
    `)
    .in('module_id', modIds);

  if (error) throw error;
  return data || [];
}

export async function getStudent360Dossier(studentId) {
  const [modulesR, attendanceR, submissionsR, gradesR, dissertationR] = await Promise.all([
    supabase.from('student_modules').select('module_id, modules(code, title)').eq('student_id', studentId),
    supabase.from('attendance').select('status, marked_at, distance_meters, classes(class_date, modules(code))').eq('student_id', studentId),
    supabase.from('submissions').select('status, mark, submitted_at, assignments(title, max_mark)').eq('student_id', studentId),
    supabase.from('grades').select('score, grade, published, modules(code, title)').eq('student_id', studentId),
    supabase.from('dissertations').select('title, status, current_chapter, progress_percentage').eq('student_id', studentId).maybeSingle()
  ]);

  return {
    modules: modulesR.data || [],
    attendance: attendanceR.data || [],
    submissions: submissionsR.data || [],
    grades: gradesR.data || [],
    dissertation: dissertationR.data || null
  };
}

// ============================================================================
// V49: Profile & Security Operations
// ============================================================================
export async function getProfileSecurityInfo(role = 'student') {
  const user = await getAuthUser();
  const table = role === 'lecturer' ? 'lecturers' : 'students';

  const [profileR, deviceR, loginR] = await Promise.all([
    user?.id
      ? supabase.from(table).select('*').or(`auth_user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('devices').select('id, device_label, first_registered_at, last_seen_at, revoked_at').or(`student_id.not.is.null,lecturer_id.not.is.null`),
    supabase.from('login_history').select('id, ip_address, user_agent, created_at, status').order('created_at', { ascending: false }).limit(10)
  ]);

  return {
    user,
    profile: profileR?.data || null,
    devices: deviceR.data || [],
    logins: loginR.data || []
  };
}

export async function updateUserProfile({ role = 'student', id, updates }) {
  const table = role === 'lecturer' ? 'lecturers' : 'students';
  if (!id) throw new Error('User profile record identifier is required.');

  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  if (updates.full_name) {
    await supabase.auth.updateUser({
      data: { full_name: updates.full_name }
    }).catch(() => {});
  }

  return data;
}

export async function updateUserPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar({ file, profileId, role = 'student' }) {
  if (!file) throw new Error('No image file selected.');

  // Compress & center-crop image to 180x180 (~7-9 KB) for permanent cloud & local persistence
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 180;
        let width = img.width;
        let height = img.height;
        let sx = 0, sy = 0, sWidth = width, sHeight = height;

        if (width > height) {
          sx = (width - height) / 2;
          sWidth = height;
        } else if (height > width) {
          sy = (height - width) / 2;
          sHeight = width;
        }

        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let publicUrl = dataUrl;

  // 1. Safely attempt Supabase storage upload if bucket is provisioned
  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const filePath = `avatars/${profileId || 'user'}_${Date.now()}.${fileExt}`;
    const uploadRes = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    }).catch(() => null);

    if (uploadRes && !uploadRes.error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (urlData?.publicUrl) publicUrl = urlData.publicUrl;
    }
  } catch (storageErr) {
    // Graceful fallback to dataUrl
  }

  // 2. Persist permanently to Supabase Auth User Metadata (available across restarts & devices)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      try {
        localStorage.setItem(`edulink_avatar_${user.id}`, publicUrl);
      } catch (e) {}
    }
  } catch (authErr) {
    console.warn('Auth user metadata update note:', authErr);
  }

  // 3. Immediately store in localStorage under multiple reliable keys
  try {
    localStorage.setItem('edulink_active_avatar', publicUrl);
    if (profileId) {
      localStorage.setItem(`edulink_avatar_${profileId}`, publicUrl);
    }
  } catch (e) {}

  // 4. Safely attempt to write to database column if it exists
  const table = role === 'lecturer' ? 'lecturers' : 'students';
  if (profileId) {
    try {
      await supabase.from(table).update({ avatar_url: publicUrl }).eq('id', profileId);
    } catch (e) {
      // Column might not exist in database table
    }
  }

  return publicUrl;
}

export async function removeProfileAvatar({ profileId, role = 'student' }) {
  try {
    await supabase.auth.updateUser({
      data: { avatar_url: null }
    });
  } catch (e) {}

  try {
    localStorage.removeItem('edulink_active_avatar');
    if (profileId) {
      localStorage.removeItem(`edulink_avatar_${profileId}`);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      localStorage.removeItem(`edulink_avatar_${user.id}`);
    }
  } catch (e) {}

  const table = role === 'lecturer' ? 'lecturers' : 'students';
  if (profileId) {
    try {
      await supabase.from(table).update({ avatar_url: null }).eq('id', profileId);
    } catch (e) {}
  }
  return null;
}

// ============================================================================
// V50: System Management & Audit
// ============================================================================
export async function getSystemAuditMetrics() {
  const [studentsC, lecturersC, modulesC, attendanceC, paymentsC, auditsC] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('lecturers').select('id', { count: 'exact', head: true }),
    supabase.from('modules').select('id', { count: 'exact', head: true }),
    supabase.from('attendance').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('id', { count: 'exact', head: true }),
    supabase.from('system_audit_logs').select('id, event_name, target_entity, created_at, actor_role').order('created_at', { ascending: false }).limit(20)
  ]);

  return {
    counts: {
      students: studentsC.count || 0,
      lecturers: lecturersC.count || 0,
      modules: modulesC.count || 0,
      attendanceRecords: attendanceC.count || 0,
      payments: paymentsC.count || 0
    },
    recentLogs: auditsC.data || []
  };
}
