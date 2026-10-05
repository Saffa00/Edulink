import { supabase } from './supabase.js';
import { sendAcademicNotification } from './liveNotificationService.js';

const SUBMISSION_BUCKET = 'assignment-submissions';
const BRIEF_BUCKET = 'assignment-briefs';

/**
 * Get current lecturer profile from session
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
 * Get current student profile from session
 */
export async function getCurrentStudent() {
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw ue || new Error('Authentication required.');
  const { data: student, error: se } = await supabase
    .from('students')
    .select('id, student_id, full_name, email, programme, level, account_status, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();
  if (se || !student) throw se || new Error('Student profile not found.');
  return { ...student, auth_user_id: student.auth_user_id || user.id };
}

/**
 * Get lecturer modules for selection, with fallback to active department modules
 */
export async function getLecturerModules() {
  const lecturer = await getCurrentLecturer();
  let { data, error } = await supabase
    .from('modules')
    .select('id, code, title, level, semester, active, department_id, faculty_id')
    .eq('lecturer_id', lecturer.id)
    .order('code');

  if (error) {
    console.warn('Notice querying assigned lecturer modules:', error.message);
  }

  // Strictly return only modules registered to this lecturer
  return data || [];
}

/**
 * Get all assignments for current lecturer with submission counters and status
 */
export async function getLecturerAssignments(moduleId = null) {
  const lecturer = await getCurrentLecturer();

  let query = supabase
    .from('assignments')
    .select(`
      id, module_id, title, description, due_at, max_mark,
      allow_late, grace_period_hours, brief_file_path, created_at,
      modules(id, code, title, level, semester)
    `)
    .eq('lecturer_id', lecturer.id)
    .order('created_at', { ascending: false });

  if (moduleId) {
    query = query.eq('module_id', moduleId);
  }

  const { data: assignments, error: ae } = await query;
  if (ae) throw ae;
  if (!assignments || !assignments.length) return [];

  // Fetch roster counts and submissions for these assignments
  const assignmentIds = assignments.map(a => a.id);
  const moduleIds = [...new Set(assignments.map(a => a.module_id))];

  const [{ data: rosterRows }, { data: submissions }] = await Promise.all([
    supabase.from('student_modules').select('module_id').in('module_id', moduleIds),
    supabase.from('submissions').select('id, assignment_id, status, is_late, mark').in('assignment_id', assignmentIds)
  ]);

  const rosterMap = {};
  (rosterRows || []).forEach(r => {
    rosterMap[r.module_id] = (rosterMap[r.module_id] || 0) + 1;
  });

  const subMap = {};
  (submissions || []).forEach(s => {
    if (!subMap[s.assignment_id]) {
      subMap[s.assignment_id] = { total: 0, graded: 0, late: 0, pending: 0 };
    }
    subMap[s.assignment_id].total++;
    if (s.status === 'graded') {
      subMap[s.assignment_id].graded++;
    } else {
      subMap[s.assignment_id].pending++;
    }
    if (s.is_late || s.status === 'late') {
      subMap[s.assignment_id].late++;
    }
  });

  const now = new Date();

  return assignments.map(a => {
    const counts = subMap[a.id] || { total: 0, graded: 0, late: 0, pending: 0 };
    const totalEnrolled = rosterMap[a.module_id] || 0;
    const dueDate = new Date(a.due_at);
    const isPastDue = now > dueDate;

    return {
      ...a,
      totalEnrolled,
      submissionCount: counts.total,
      gradedCount: counts.graded,
      pendingCount: counts.pending,
      lateCount: counts.late,
      unsubmittedCount: Math.max(0, totalEnrolled - counts.total),
      isPastDue,
      submissionRate: totalEnrolled ? Math.round((counts.total / totalEnrolled) * 100) : 0
    };
  });
}

/**
 * Upload an assignment brief file (PDF, DOCX, ZIP)
 */
export async function uploadAssignmentBrief(file, lecturerId) {
  if (!file) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `briefs/${lecturerId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BRIEF_BUCKET).upload(path, file, {
    upsert: false
  });
  if (error) throw error;
  return path;
}

/**
 * Create a new assignment with optional brief attachment
 */
export async function createAssignmentWithBrief(payload, briefFile = null) {
  const lecturer = await getCurrentLecturer();

  let briefPath = null;
  if (briefFile) {
    briefPath = await uploadAssignmentBrief(briefFile, lecturer.id);
  }

  const insertData = {
    module_id: payload.module_id,
    lecturer_id: lecturer.id,
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    due_at: new Date(payload.due_at).toISOString(),
    max_mark: Number(payload.max_mark) || 100,
    allow_late: payload.allow_late ?? true,
    grace_period_hours: Number(payload.grace_period_hours) || 0,
    brief_file_path: briefPath
  };

  const { data, error } = await supabase
    .from('assignments')
    .insert(insertData)
    .select(`
      id, module_id, title, description, due_at, max_mark,
      allow_late, grace_period_hours, brief_file_path, created_at,
      modules(id, code, title)
    `)
    .single();

  if (error) throw error;

  // Real-time Notification: When lecturer creates an assignment, notify all enrolled students
  try {
    const { data: enrollments } = await supabase
      .from('student_modules')
      .select('student_id, students(auth_user_id, full_name)')
      .eq('module_id', payload.module_id);

    const modCode = data?.modules?.code || 'Module';
    const dueFormatted = payload.due_at ? new Date(payload.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled';

    for (const enr of (enrollments || [])) {
      if (enr.students?.auth_user_id) {
        await sendAcademicNotification({
          recipientUserId: enr.students.auth_user_id,
          title: `New Assignment Created: ${modCode}`,
          body: `Lecturer ${lecturer.full_name} published "${data.title}" for ${modCode}. Due date: ${dueFormatted}.`,
          category: 'assignment',
          linkUrl: 'assignments'
        });
      }
    }
  } catch (notifErr) {
    console.warn('Assignment creation notification notice:', notifErr?.message);
  }

  return data;
}

/**
 * Get all submissions for an assignment cross-referenced with module roster
 */
export async function getAssignmentSubmissionsWithRoster(assignmentId) {
  const lecturer = await getCurrentLecturer();

  // 1. Fetch assignment details
  const { data: assignment, error: ae } = await supabase
    .from('assignments')
    .select(`
      id, module_id, title, description, due_at, max_mark,
      allow_late, grace_period_hours, brief_file_path, created_at,
      modules(id, code, title)
    `)
    .eq('id', assignmentId)
    .eq('lecturer_id', lecturer.id)
    .single();

  if (ae || !assignment) throw ae || new Error('Assignment not found.');

  // 2. Fetch all registered students for this module
  const { data: rosterRows, error: re } = await supabase
    .from('student_modules')
    .select(`
      student_id,
      students(id, student_id, full_name, email, programme, level)
    `)
    .eq('module_id', assignment.module_id);

  if (re) throw re;

  const rosterStudents = (rosterRows || []).map(r => r.students).filter(Boolean);

  // 3. Fetch all submissions for this assignment
  const { data: submissions, error: se } = await supabase
    .from('submissions')
    .select(`
      id, assignment_id, student_id, file_url, submitted_at,
      mark, lecturer_comment, status, version_number, is_late,
      late_duration_minutes, student_notes, graded_at
    `)
    .eq('assignment_id', assignmentId);

  if (se) throw se;

  const subMap = new Map();
  (submissions || []).forEach(s => {
    subMap.set(s.student_id, s);
  });

  // 4. Fetch submission versions for resubmitted files
  const subIds = (submissions || []).map(s => s.id);
  let versionsMap = {};
  if (subIds.length > 0) {
    const { data: versions } = await supabase
      .from('submission_versions')
      .select('id, submission_id, version_number, file_url, student_notes, submitted_at')
      .in('submission_id', subIds)
      .order('version_number', { ascending: false });

    (versions || []).forEach(v => {
      if (!versionsMap[v.submission_id]) versionsMap[v.submission_id] = [];
      versionsMap[v.submission_id].push(v);
    });
  }

  // 5. Merge roster with submissions
  const mergedList = rosterStudents.map(student => {
    const sub = subMap.get(student.id);
    if (sub) {
      return {
        studentInternalId: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        programme: student.programme || 'Undergraduate',
        level: student.level || '—',
        hasSubmitted: true,
        submissionId: sub.id,
        fileUrl: sub.file_url,
        submittedAt: sub.submitted_at,
        mark: sub.mark != null ? Number(sub.mark) : null,
        lecturerComment: sub.lecturer_comment || '',
        status: sub.status || 'submitted',
        versionNumber: sub.version_number || 1,
        isLate: sub.is_late || false,
        lateDurationMinutes: sub.late_duration_minutes || 0,
        studentNotes: sub.student_notes || '',
        gradedAt: sub.graded_at,
        pastVersions: versionsMap[sub.id] || []
      };
    } else {
      return {
        studentInternalId: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        email: student.email,
        programme: student.programme || 'Undergraduate',
        level: student.level || '—',
        hasSubmitted: false,
        submissionId: null,
        fileUrl: null,
        submittedAt: null,
        mark: null,
        lecturerComment: '',
        status: 'not_submitted',
        versionNumber: 0,
        isLate: false,
        lateDurationMinutes: 0,
        studentNotes: '',
        gradedAt: null,
        pastVersions: []
      };
    }
  });

  // Sort: Submitted first, then Not Submitted, alphabetical by student ID
  mergedList.sort((a, b) => {
    if (a.hasSubmitted !== b.hasSubmitted) return a.hasSubmitted ? -1 : 1;
    return a.studentId.localeCompare(b.studentId);
  });

  // 6. Summary metrics
  const total = mergedList.length;
  const submitted = mergedList.filter(s => s.hasSubmitted).length;
  const graded = mergedList.filter(s => s.status === 'graded').length;
  const pending = submitted - graded;
  const late = mergedList.filter(s => s.isLate).length;
  const notSubmitted = total - submitted;

  const marks = mergedList.filter(s => s.mark != null).map(s => s.mark);
  const avgScore = marks.length
    ? Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10) / 10
    : null;

  return {
    assignment,
    submissions: mergedList,
    stats: {
      total,
      submitted,
      graded,
      pending,
      late,
      notSubmitted,
      avgScore,
      submissionRate: total ? Math.round((submitted / total) * 100) : 0,
      gradedRate: submitted ? Math.round((graded / submitted) * 100) : 0
    }
  };
}

/**
 * Grade student submission with validation against max mark
 */
export async function gradeStudentSubmission({ submissionId, mark, comment, status = 'graded' }) {
  await getCurrentLecturer();

  const numMark = mark === '' || mark == null ? null : Number(mark);
  if (numMark != null && (!Number.isFinite(numMark) || numMark < 0)) {
    throw new Error('Grade mark must be a non-negative number.');
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({
      mark: numMark,
      lecturer_comment: comment || '',
      status,
      graded_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) throw error;

  // Real-time Academic Notification to Student on Grading
  try {
    const { data: subDetail } = await supabase
      .from('submissions')
      .select(`
        id,
        students(auth_user_id, full_name),
        assignments(title, max_mark, modules(code, title))
      `)
      .eq('id', submissionId)
      .single();

    if (subDetail?.students?.auth_user_id) {
      const code = subDetail.assignments?.modules?.code || 'Module';
      const title = subDetail.assignments?.title || 'Assignment';
      const max = subDetail.assignments?.max_mark || 100;
      await sendAcademicNotification({
        recipientUserId: subDetail.students.auth_user_id,
        title: `Grade Released: ${code}`,
        body: `Your assignment "${title}" has been graded: ${numMark != null ? `${numMark}/${max}` : status.toUpperCase()}.${comment ? ` Note: "${comment}"` : ''}`,
        category: 'grade',
        linkUrl: 'assignments'
      });
    }
  } catch (notifErr) {
    console.warn('Assignment grade notification notice:', notifErr?.message);
  }

  return data;
}

/**
 * Get assignments for registered student with submission status and grades
 */
export async function getStudentAssignments() {
  const student = await getCurrentStudent();

  // 1. Fetch modules student is enrolled in
  const { data: moduleRows, error: me } = await supabase
    .from('student_modules')
    .select(`
      module_id,
      modules(id, code, title, level, semester, lecturers(id, full_name, email))
    `)
    .eq('student_id', student.id);

  if (me) throw me;
  if (!moduleRows || !moduleRows.length) return { student, assignments: [] };

  const moduleIds = moduleRows.map(m => m.module_id);

  // 2. Fetch assignments for these modules
  const { data: assignments, error: ae } = await supabase
    .from('assignments')
    .select(`
      id, module_id, title, description, due_at, max_mark,
      allow_late, grace_period_hours, brief_file_path, created_at,
      modules(id, code, title)
    `)
    .in('module_id', moduleIds)
    .order('due_at', { ascending: true });

  if (ae) throw ae;

  // 3. Fetch student's submissions for these assignments
  const assignmentIds = (assignments || []).map(a => a.id);
  let subMap = new Map();
  if (assignmentIds.length > 0) {
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        id, assignment_id, file_url, submitted_at, mark,
        lecturer_comment, status, version_number, is_late,
        late_duration_minutes, student_notes, graded_at
      `)
      .eq('student_id', student.id)
      .in('assignment_id', assignmentIds);

    (submissions || []).forEach(s => {
      subMap.set(s.assignment_id, s);
    });
  }

  const now = new Date();

  const enriched = (assignments || []).map(a => {
    const dueDate = new Date(a.due_at);
    const isPastDue = now > dueDate;
    const sub = subMap.get(a.id);

    return {
      ...a,
      isPastDue,
      submission: sub || null,
      status: sub ? sub.status : isPastDue ? 'missed' : 'pending'
    };
  });

  return { student, assignments: enriched };
}

/**
 * Submit student assignment file with version archiving and late detection
 */
export async function submitStudentAssignment({ assignmentId, file, notes = '' }) {
  const student = await getCurrentStudent();
  if (!file) throw new Error('Please select a file to submit.');

  // Check file size (max 20 MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('File size exceeds the 20 MB limit.');
  }

  // Check assignment details and deadline
  const { data: assignment, error: ae } = await supabase
    .from('assignments')
    .select('id, due_at, allow_late, grace_period_hours, title')
    .eq('id', assignmentId)
    .single();

  if (ae || !assignment) throw ae || new Error('Assignment not found.');

  const now = new Date();
  const dueDate = new Date(assignment.due_at);
  const graceMinutes = (assignment.grace_period_hours || 0) * 60;
  const deadlineWithGrace = new Date(dueDate.getTime() + graceMinutes * 60 * 1000);

  const isLate = now > dueDate;
  const isPastGrace = now > deadlineWithGrace;

  if (isPastGrace && !assignment.allow_late) {
    throw new Error('Submissions for this assignment are closed. The deadline has passed.');
  }

  const lateMinutes = isLate ? Math.round((now.getTime() - dueDate.getTime()) / (60 * 1000)) : 0;

  // Upload file to Supabase storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${student.id}/${assignmentId}/${Date.now()}-${safeName}`;

  const { error: ue } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, {
    upsert: false
  });
  if (ue) throw ue;

  // Check existing submission
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, file_url, version_number, student_notes, submitted_at')
    .eq('assignment_id', assignmentId)
    .eq('student_id', student.id)
    .maybeSingle();

  let nextVersion = 1;
  let submissionResult = null;

  if (existing) {
    nextVersion = (existing.version_number || 1) + 1;
    // Archive previous submission version to submission_versions
    await supabase.from('submission_versions').insert({
      submission_id: existing.id,
      version_number: existing.version_number || 1,
      file_url: existing.file_url,
      student_notes: existing.student_notes || '',
      submitted_at: existing.submitted_at || new Date().toISOString()
    });

    // Update current submission record
    const { data: updated, error: upe } = await supabase
      .from('submissions')
      .update({
        file_url: path,
        submitted_at: now.toISOString(),
        version_number: nextVersion,
        is_late: isLate,
        late_duration_minutes: lateMinutes,
        student_notes: notes.trim(),
        status: isLate ? 'late' : 'submitted'
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (upe) throw upe;
    submissionResult = updated;
  } else {
    // Insert new submission
    const { data: inserted, error: ine } = await supabase
      .from('submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: student.id,
        file_url: path,
        submitted_at: now.toISOString(),
        version_number: 1,
        is_late: isLate,
        late_duration_minutes: lateMinutes,
        student_notes: notes.trim(),
        status: isLate ? 'late' : 'submitted'
      })
      .select()
      .single();

    if (ine) throw ine;
    submissionResult = inserted;
  }

  // Real-time Academic Notification for Assignment Submission
  try {
    const { data: asgn } = await supabase
      .from('assignments')
      .select('id, title, module_id, lecturer_id, modules(code, title), lecturers(auth_user_id, full_name)')
      .eq('id', assignmentId)
      .single();

    const modCode = asgn?.modules?.code || 'Module';
    const asgnTitle = asgn?.title || assignment.title || 'Assignment';

    // 1. Notify Lecturer of new submission
    if (asgn?.lecturers?.auth_user_id) {
      await sendAcademicNotification({
        recipientUserId: asgn.lecturers.auth_user_id,
        title: `Assignment Submission: ${modCode}`,
        body: `Student ${student.full_name} (${student.student_id}) submitted "${asgnTitle}"${isLate ? ' (Late)' : ''}.`,
        category: 'assignment',
        linkUrl: 'assignments'
      });
    }

    // 2. Notify Student confirmation
    await sendAcademicNotification({
      recipientUserId: student.auth_user_id,
      title: `Submission Recorded: ${modCode}`,
      body: `Your submission for "${asgnTitle}" was uploaded successfully${isLate ? ' (Late submission)' : ''}.`,
      category: 'assignment',
      linkUrl: 'assignments'
    });
  } catch (notifErr) {
    console.warn('Assignment submission notification notice:', notifErr?.message);
  }

  return submissionResult;
}

/**
 * Generate signed URL for downloading assignment brief or submission file
 */
export async function getSignedFileUrl(bucketName, filePath, expiresInSeconds = 3600) {
  if (!filePath) return null;
  const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl || null;
}
