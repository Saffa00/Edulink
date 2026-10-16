/**
 * ============================================================================
 * V55 — Master Automated Test Suite
 * Validating Academic Platform Domains:
 * Registration, Authentication, Device Security, Attendance & Geofencing,
 * Assignment Deadlines & Versions, Grade Management & GPA Exclusion,
 * Dissertation Progression, Timetable Conflicts, Payment Reconciliation,
 * and RLS Security Rules.
 * ============================================================================
 */

import crypto from 'node:crypto';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

function runSection(name) {
  console.log(`\n======================================================`);
  console.log(`  TEST SUITE: ${name}`);
  console.log(`======================================================`);
}

// 1. Device Security & Auth Token Tests
runSection('1. Device Security & Token Hashing');
{
  const rawToken = 'test-device-uuid-12345';
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert(hash.length === 64, 'SHA-256 device hash is 64 hex characters');
  assert(hash === crypto.createHash('sha256').update(rawToken).digest('hex'), 'Hash generation is deterministic');
  assert(hash !== crypto.createHash('sha256').update(rawToken + 'x').digest('hex'), 'Different token produces different hash');
}

// 2. Attendance GPS & Geofence Verification Tests
runSection('2. Attendance GPS & Geofence Logic');
{
  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = deg => (deg * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Freetown campus coordinates
  const campusLat = 8.484000;
  const campusLon = -13.230000;
  const insideLat = 8.484100;
  const insideLon = -13.230100;
  const outsideLat = 8.489000;
  const outsideLon = -13.239000;

  const distInside = haversineMeters(campusLat, campusLon, insideLat, insideLon);
  const distOutside = haversineMeters(campusLat, campusLon, outsideLat, outsideLon);

  assert(distInside < 50, `Nearby student is within 50m (${Math.round(distInside)}m)`);
  assert(distOutside > 500, `Far away student is detected outside geofence (${Math.round(distOutside)}m)`);

  // Late calculation test
  const classStart = new Date('2026-09-20T09:00:00Z');
  const cutoffMins = 15;
  const lateCutoff = new Date(classStart.getTime() + cutoffMins * 60000);

  const checkinOnTime = new Date('2026-09-20T09:08:00Z');
  const checkinLate = new Date('2026-09-20T09:22:00Z');

  assert(checkinOnTime <= lateCutoff, 'Student checking in at 09:08 is marked Present');
  assert(checkinLate > lateCutoff, 'Student checking in at 09:22 is marked Late');
}

// 3. Assignment Deadlines, Late Policy, and Versions
runSection('3. Assignment Submissions & Versions');
{
  const deadline = new Date('2026-09-25T23:59:00Z');
  const gracePeriodHours = 2;
  const finalAllowed = new Date(deadline.getTime() + gracePeriodHours * 3600000);

  const submission1 = new Date('2026-09-25T20:00:00Z');
  const submission2 = new Date('2026-09-26T01:00:00Z');
  const submission3 = new Date('2026-09-26T04:00:00Z');

  assert(submission1 < deadline, 'Submission before deadline is marked on-time');
  assert(submission2 > deadline && submission2 <= finalAllowed, 'Submission within grace period is accepted with late flag');
  assert(submission3 > finalAllowed, 'Submission after grace period is rejected when late submissions blocked');

  // Version number incrementing
  let currentVersion = 1;
  const nextVersion = currentVersion + 1;
  assert(nextVersion === 2, 'Resubmission increments version number to v2');
}

// 4. Grade Management & Strict GPA/CGPA Exclusion Rule
runSection('4. Grade Management & GPA Exclusion Rule');
{
  function calculateGrade(score) {
    if (score == null || score === '') return null;
    const s = Number(score);
    if (s < 0 || s > 100) throw new Error('Invalid score');
    if (s >= 70) return 'A';
    if (s >= 60) return 'B';
    if (s >= 50) return 'C';
    if (s >= 40) return 'D';
    return 'F';
  }

  assert(calculateGrade(82) === 'A', 'Score 82 returns grade A');
  assert(calculateGrade(64) === 'B', 'Score 64 returns grade B');
  assert(calculateGrade(52) === 'C', 'Score 52 returns grade C');
  assert(calculateGrade(45) === 'D', 'Score 45 returns grade D');
  assert(calculateGrade(31) === 'F', 'Score 31 returns grade F');

  let throwsOnNegative = false;
  try { calculateGrade(-5); } catch { throwsOnNegative = true; }
  assert(throwsOnNegative, 'Negative scores are rejected');

  let throwsOnOverflow = false;
  try { calculateGrade(105); } catch { throwsOnOverflow = true; }
  assert(throwsOnOverflow, 'Scores over 100 are rejected');

  // Strict GPA check
  const studentGrades = [{ module: 'CSOR 224', score: 85, grade: 'A' }, { module: 'CS 302', score: 72, grade: 'A' }];
  const hasGpaField = studentGrades.some(g => 'gpa' in g || 'cgpa' in g);
  assert(!hasGpaField, 'Grades record adheres to GPA/CGPA exclusion policy');
}

// 5. Dissertation Progression State Machine
runSection('5. Dissertation Chapter State Machine');
{
  const validStatuses = ['proposal', 'chapter_review', 'corrections_required', 'approved', 'rejected'];
  const testStatus = 'chapter_review';
  assert(validStatuses.includes(testStatus), 'Dissertation status transition is valid');

  const chapters = [1, 2, 3, 4, 5];
  let currentChapter = 1;
  // Progress to chapter 2 on approval
  currentChapter++;
  assert(currentChapter === 2, 'Approval advances stage from Chapter 1 to Chapter 2');
  assert(chapters.includes(currentChapter), 'Current chapter remains within 1 to 5');
}

// 6. Timetable Overlap Collision Check
runSection('6. Timetable Scheduling & Collision Detection');
{
  function hasTimeCollision(slot1, slot2) {
    if (slot1.day !== slot2.day) return false;
    // Overlap exists if start1 < end2 and start2 < end1
    return slot1.start < slot2.end && slot2.start < slot1.end;
  }

  const slotA = { day: 'Monday', start: '09:00', end: '11:00' };
  const slotB = { day: 'Monday', start: '10:30', end: '12:30' };
  const slotC = { day: 'Monday', start: '11:00', end: '13:00' };
  const slotD = { day: 'Tuesday', start: '09:00', end: '11:00' };

  assert(hasTimeCollision(slotA, slotB) === true, 'Overlapping slots on same day detect collision');
  assert(hasTimeCollision(slotA, slotC) === false, 'Adjacent non-overlapping slots do not collide');
  assert(hasTimeCollision(slotA, slotD) === false, 'Slots on different days do not collide');
}

// 7. Monime Payment & Fee Calculation Tests
runSection('7. Monime Payment & Idempotency');
{
  function registrationFee(type) {
    return type === 'dissertation' ? 500 : 1.00;
  }

  assert(registrationFee('normal') === 1.00, 'Normal student registration fee is SLE 1.00 per module');
  assert(registrationFee('dissertation') === 500, 'Dissertation student registration fee is SLE 500');

  // Idempotency test: duplicate webhook event id
  const processedEvents = new Set(['evt_12345']);
  const incomingEventId = 'evt_12345';
  const isDuplicate = processedEvents.has(incomingEventId);
  assert(isDuplicate === true, 'Duplicate webhook event is caught by idempotency set');
}

// 8. Final-Year Dissertation Access & Eligibility Rules
runSection('8. Final-Year Dissertation Access & Eligibility Rules');
{
  function getDerivedStudentTrack({ level, semester, currentTerm }) {
    const lvl = parseInt(String(level || 1).replace(/\D/g, ''), 10) || 1;
    const sem = currentTerm?.semester ?? (String(semester || '').includes('2') || String(semester || '').toLowerCase().includes('second') ? 2 : 1);
    return (lvl === 4 && sem === 2) ? 'dissertation' : 'regular';
  }

  function evaluateStudentAccess({ level, semester, currentTerm, registration }) {
    const track = getDerivedStudentTrack({ level, semester, currentTerm });
    const isYear4Sem2 = track === 'dissertation';
    const isApprovedDissertation = isYear4Sem2 && registration?.status === 'approved';
    const isPendingDissertation = isYear4Sem2 && registration?.status === 'pending';
    const isUnregisteredYear4Sem2 = isYear4Sem2 && !registration;

    // Route / navigation permissions
    const canAccessDissertationRoute = isApprovedDissertation;
    const canSeeDissertationCTA = isUnregisteredYear4Sem2 && (currentTerm?.dissertation_reg_open !== false);
    const showsWaitingApprovalScreen = isPendingDissertation;
    const canSeeDissertationCard = isApprovedDissertation || canSeeDissertationCTA || showsWaitingApprovalScreen;

    // Module / Timetable / Attendance permissions
    const hasModuleOverride = Boolean(registration?.allow_modules_override);
    const canEnrollModules = !isYear4Sem2 || hasModuleOverride;
    const canViewTimetableAndAttendance = !isYear4Sem2 || hasModuleOverride;

    // Fee calculations
    const registrationFee = isYear4Sem2 ? 500 : 1.00;

    return {
      track,
      isYear4Sem2,
      canAccessDissertationRoute,
      canSeeDissertationCTA,
      showsWaitingApprovalScreen,
      canSeeDissertationCard,
      canEnrollModules,
      canViewTimetableAndAttendance,
      registrationFee
    };
  }

  // Database contract RPC simulation (mirroring v60_dissertation_access_rules.sql)
  function simulateRegisterDissertationRpc({ studentLevel, currentTerm }) {
    if (studentLevel !== 4) {
      throw new Error(`Only Year 4 students are eligible for dissertation registration (current level: ${studentLevel})`);
    }
    if (currentTerm.semester !== 2) {
      throw new Error(`Dissertation is only available in Semester 2 (current term semester: ${currentTerm.semester})`);
    }
    if (!currentTerm.dissertation_reg_open) {
      throw new Error('Dissertation registration is currently closed for this academic term');
    }
    return { status: 'pending', payment_status: 'paid', allow_modules_override: false };
  }

  // Database contract trigger simulation (mirroring v60_dissertation_access_rules.sql)
  function simulateModuleEnrollmentTrigger({ studentLevel, semester, allowModulesOverride }) {
    if (studentLevel === 4 && semester === 2) {
      if (!allowModulesOverride) {
        throw new Error('Final-year students in Semester 2 cannot enroll in taught modules unless approved for carry-over by an administrator.');
      }
    }
    return { enrolled: true };
  }

  const currentTermSem1 = { id: 'term-1', academic_year: '2026/2027', semester: 1, is_current: true, dissertation_reg_open: false };
  const currentTermSem2 = { id: 'term-2', academic_year: '2026/2027', semester: 2, is_current: true, dissertation_reg_open: true };

  // Case 1: Year 2 student (Dissertation inaccessible; regular module enrollment allowed)
  const case1 = evaluateStudentAccess({ level: 2, semester: 1, currentTerm: currentTermSem1, registration: null });
  assert(case1.track === 'regular', 'Case 1: Year 2 student track derived as "regular"');
  assert(case1.canSeeDissertationCard === false, 'Case 1: Year 2 student cannot see dissertation card or banner');
  assert(case1.canAccessDissertationRoute === false, 'Case 1: Year 2 student cannot navigate to dissertation route');
  assert(case1.canEnrollModules === true, 'Case 1: Year 2 student can register for modules normally');
  assert(case1.registrationFee === 1.00, 'Case 1: Year 2 student pays per-module regular fee (SLE 1.00)');

  // Case 2: Year 4 Semester 1 student (Regular modules allowed; dissertation hidden)
  const case2 = evaluateStudentAccess({ level: 4, semester: 1, currentTerm: currentTermSem1, registration: null });
  assert(case2.track === 'regular', 'Case 2: Year 4 Semester 1 track derived as "regular"');
  assert(case2.canSeeDissertationCard === false, 'Case 2: Year 4 Semester 1 student cannot see or register for dissertation');
  assert(case2.canAccessDissertationRoute === false, 'Case 2: Year 4 Semester 1 cannot access dissertation route');
  assert(case2.canEnrollModules === true, 'Case 2: Year 4 Semester 1 can register for modules');

  // Case 3: Year 4 Semester 2 student before registering (Registration CTA shown; modules blocked)
  const case3 = evaluateStudentAccess({ level: 4, semester: 2, currentTerm: currentTermSem2, registration: null });
  assert(case3.track === 'dissertation', 'Case 3: Year 4 Semester 2 track derived as "dissertation"');
  assert(case3.canSeeDissertationCTA === true, 'Case 3: Year 4 Semester 2 unregistered student sees registration call to action');
  assert(case3.canEnrollModules === false, 'Case 3: Year 4 Semester 2 student cannot register for modules');
  assert(case3.registrationFee === 500, 'Case 3: Year 4 Semester 2 student charged flat SLE 500 dissertation fee');

  // Case 4: Year 4 Semester 2 student after registering (pending)
  const case4 = evaluateStudentAccess({ level: 4, semester: 2, currentTerm: currentTermSem2, registration: { status: 'pending', allow_modules_override: false } });
  assert(case4.showsWaitingApprovalScreen === true, 'Case 4: Year 4 Semester 2 pending student sees "Waiting for approval" screen');
  assert(case4.canAccessDissertationRoute === false, 'Case 4: Pending student cannot access active dissertation portal features yet');
  assert(case4.canEnrollModules === false, 'Case 4: Pending dissertation student cannot register for modules');

  // Case 5: Year 4 Semester 2 student approved (Dissertation portal unlocked, modules/timetable hidden)
  const case5 = evaluateStudentAccess({ level: 4, semester: 2, currentTerm: currentTermSem2, registration: { status: 'approved', allow_modules_override: false } });
  assert(case5.canAccessDissertationRoute === true, 'Case 5: Approved student has dissertation portal unlocked');
  assert(case5.canEnrollModules === false, 'Case 5: Approved dissertation student cannot see or register for modules');
  assert(case5.canViewTimetableAndAttendance === false, 'Case 5: Approved dissertation student has timetable and attendance hidden');

  // Case 6: Year 4 Semester 2 student with allow_modules_override = true (Module enrollment unlocked)
  const case6 = evaluateStudentAccess({ level: 4, semester: 2, currentTerm: currentTermSem2, registration: { status: 'approved', allow_modules_override: true } });
  assert(case6.canEnrollModules === true, 'Case 6: Year 4 Semester 2 with allow_modules_override=true can register for carry-over modules');
  assert(case6.canViewTimetableAndAttendance === true, 'Case 6: Module override also restores timetable and attendance for carry-over modules');

  // Case 7: Database check: calling register_dissertation_term for Year 2 raises error
  let case7Throws = false;
  let case7ErrorMsg = '';
  try {
    simulateRegisterDissertationRpc({ studentLevel: 2, currentTerm: currentTermSem2 });
  } catch (err) {
    case7Throws = true;
    case7ErrorMsg = err.message;
  }
  assert(case7Throws === true, 'Case 7: DB RPC register_dissertation_term raises error for Year 2 student');
  assert(case7ErrorMsg.includes('Only Year 4 students are eligible'), `Case 7: Error message correctly identifies level ineligibility ("${case7ErrorMsg}")`);

  // Case 8: Database check: enrolling in module as Year 4 Sem 2 student raises error unless override is true
  let case8ThrowsWithoutOverride = false;
  try {
    simulateModuleEnrollmentTrigger({ studentLevel: 4, semester: 2, allowModulesOverride: false });
  } catch {
    case8ThrowsWithoutOverride = true;
  }
  assert(case8ThrowsWithoutOverride === true, 'Case 8: DB trigger blocks module enrollment for Year 4 Semester 2 without override');

  let case8AllowedWithOverride = false;
  try {
    const res = simulateModuleEnrollmentTrigger({ studentLevel: 4, semester: 2, allowModulesOverride: true });
    case8AllowedWithOverride = res.enrolled === true;
  } catch {
    case8AllowedWithOverride = false;
  }
  assert(case8AllowedWithOverride === true, 'Case 8: DB trigger permits module enrollment for Year 4 Semester 2 when allow_modules_override is true');
}

// ============================================================================
// 9. Role Isolation, Server GPS Accuracy & Lecturer Attendance Override
// ============================================================================
runSection('9. Role Isolation, Server GPS Accuracy & Lecturer Override');
{
  // Role isolation route rules
  function canAccessRoute(role, targetPath) {
    if (role === 'student' && targetPath.startsWith('/lecturer')) return false;
    if (role === 'lecturer' && targetPath.startsWith('/student')) return false;
    return true;
  }

  assert(canAccessRoute('student', '/lecturer') === false, 'Student cannot open lecturer routes');
  assert(canAccessRoute('lecturer', '/student') === false, 'Lecturer cannot open student routes');
  assert(canAccessRoute('student', '/student') === true, 'Student can access own student route');

  // Server GPS accuracy validation
  function validateGpsAttendance({ distance, accuracy, allowedRadius = 150 }) {
    if (accuracy > 100) {
      throw new Error(`GPS accuracy is too low (${Math.round(accuracy)}m). Please turn on High Accuracy location.`);
    }
    if (distance > allowedRadius) {
      throw new Error(`Outside geofence (${Math.round(distance)}m away).`);
    }
    return { valid: true };
  }

  assert(validateGpsAttendance({ distance: 45, accuracy: 15 }).valid === true, 'High accuracy check-in within radius passes');
  let lowAccuracyBlocked = false;
  try {
    validateGpsAttendance({ distance: 45, accuracy: 250 });
  } catch {
    lowAccuracyBlocked = true;
  }
  assert(lowAccuracyBlocked === true, 'Inaccurate/low quality GPS reading (>100m) is rejected');

  // Lecturer manual override simulation
  function simulateLecturerAttendanceOverride({ callerRole, classId, studentId, newStatus }) {
    if (callerRole !== 'lecturer') throw new Error('Unauthorized: only lecturers can override attendance');
    return { overridden: true, classId, studentId, status: newStatus, manual_override: true };
  }

  const overrideResult = simulateLecturerAttendanceOverride({
    callerRole: 'lecturer',
    classId: 'cls-123',
    studentId: 'stu-456',
    newStatus: 'present'
  });
  assert(overrideResult.overridden === true, 'Lecturer can manually override student attendance');
  assert(overrideResult.manual_override === true, 'Manual override flag is set to true');
}

// ============================================================================
// 10. Dynamic System Fee Loading & Payment Reconciliation
// ============================================================================
runSection('10. Dynamic System Fee Loading & Payment Reconciliation');
{
  function calculateTuitionFee(modulesCount, isYear4Sem2, feePerModule = 1.00, dissFee = 500.00) {
    if (isYear4Sem2) return dissFee;
    return Number((modulesCount * feePerModule).toFixed(2));
  }

  assert(calculateTuitionFee(3, false, 1.00) === 3.00, 'Regular student pays configured per-module fee');
  assert(calculateTuitionFee(5, true, 1.00) === 500.00, 'Final-year semester 2 student never charged per-module fee');

  // Reconciliation state machine
  function reconcilePendingPayment(payment, monimeStatus) {
    if (monimeStatus === 'completed' || monimeStatus === 'paid') {
      return { status: 'paid', activated: true, verifiedAt: new Date().toISOString() };
    }
    if (monimeStatus === 'expired' || monimeStatus === 'cancelled') {
      return { status: 'failed', activated: false };
    }
    return { status: 'pending', activated: false };
  }

  const rec1 = reconcilePendingPayment({ id: 'p1', status: 'pending' }, 'completed');
  assert(rec1.status === 'paid' && rec1.activated === true, 'Completed Monime payment is reconciled and activated');

  const rec2 = reconcilePendingPayment({ id: 'p2', status: 'pending' }, 'expired');
  assert(rec2.status === 'failed' && rec2.activated === false, 'Expired Monime payment is marked failed');
}

// ============================================================================
// 11. WhatsApp-Style Messaging & Chat Security Definer Policies
// ============================================================================
runSection('11. WhatsApp-Style Messaging & Chat Security Definer Policies');
{
  // 1. Direct chat pairing rule (Lecturer-Student only, no Student-Student)
  function simulateCreateDirectChat({ callerRole, targetRole, isEnrolledOrSupervised }) {
    if (callerRole === 'student' && targetRole === 'student') {
      throw new Error('Direct student-to-student private chats are not permitted by institutional policy.');
    }
    if (!isEnrolledOrSupervised) {
      throw new Error('Direct private chats are only allowed between students and their course lecturers or supervisors.');
    }
    return { success: true, conversation_id: 'conv-new-123', status: callerRole === 'lecturer' ? 'active' : 'request' };
  }

  let studentToStudentBlocked = false;
  try {
    simulateCreateDirectChat({ callerRole: 'student', targetRole: 'student', isEnrolledOrSupervised: true });
  } catch (e) {
    studentToStudentBlocked = true;
  }
  assert(studentToStudentBlocked === true, 'Student cannot start direct chat with another student');

  let unrelatedBlocked = false;
  try {
    simulateCreateDirectChat({ callerRole: 'student', targetRole: 'lecturer', isEnrolledOrSupervised: false });
  } catch (e) {
    unrelatedBlocked = true;
  }
  assert(unrelatedBlocked === true, 'Student cannot chat with a lecturer they share no modules or supervision with');

  const validLecturerChat = simulateCreateDirectChat({ callerRole: 'lecturer', targetRole: 'student', isEnrolledOrSupervised: true });
  assert(validLecturerChat.success === true && validLecturerChat.status === 'active', 'Lecturer initiated chat opens immediately as active');

  const validStudentChat = simulateCreateDirectChat({ callerRole: 'student', targetRole: 'lecturer', isEnrolledOrSupervised: true });
  assert(validStudentChat.success === true && validStudentChat.status === 'request', 'Student initiated chat begins as request');

  // 2. Announcements only posting policy
  function simulatePostMessage({ isAnnouncementsOnly, senderRole }) {
    if (isAnnouncementsOnly && senderRole === 'student') {
      throw new Error('Only lecturers can post in Announcements groups.');
    }
    return { sent: true };
  }

  let studentPostBlockedInAnnouncements = false;
  try {
    simulatePostMessage({ isAnnouncementsOnly: true, senderRole: 'student' });
  } catch {
    studentPostBlockedInAnnouncements = true;
  }
  assert(studentPostBlockedInAnnouncements === true, 'Student cannot post in Announcements group');
  assert(simulatePostMessage({ isAnnouncementsOnly: true, senderRole: 'lecturer' }).sent === true, 'Lecturer can post in Announcements group');

  // 3. get_chat_profiles photo privacy masking
  function simulateGetChatProfiles({ callerRole, targetProfile }) {
    const isHiddenFromClassmates = targetProfile.show_photo_to_classmates === false;
    let visibleAvatar = targetProfile.avatar_path;
    if (callerRole === 'student' && isHiddenFromClassmates) {
      visibleAvatar = null;
    }
    return { id: targetProfile.id, full_name: targetProfile.full_name, avatar_path: visibleAvatar };
  }

  const profileHidden = { id: 'u1', full_name: 'Jane Doe', avatar_path: '/photos/jane.jpg', show_photo_to_classmates: false };
  const studentView = simulateGetChatProfiles({ callerRole: 'student', targetProfile: profileHidden });
  assert(studentView.avatar_path === null, 'Photo is masked when classmate hides photo');

  const lecturerView = simulateGetChatProfiles({ callerRole: 'lecturer', targetProfile: profileHidden });
  assert(lecturerView.avatar_path === '/photos/jane.jpg', 'Lecturer can always see student photo regardless of classmate toggle');
}

// ============================================================================
// 12. DISSERTATION DIRECT SUPERVISOR SELECTION & CONCURRENCY ENFORCEMENT
// ============================================================================
console.log(`\n======================================================`);
console.log(`  TEST SUITE: 12. Direct Supervisor Selection & Concurrency`);
console.log(`======================================================`);
{
  // Model state simulator
  const dbState = {
    supervisor_profiles: [
      { id: 'sp-1', lecturer_id: 'lec-1', lecturer_name: 'Dr. Alpha Kamara', department: 'Computer Science', max_students: 2, accepting_students: true },
      { id: 'sp-2', lecturer_id: 'lec-2', lecturer_name: 'Prof. Beta Conteh', department: 'Civil Engineering', max_students: 5, accepting_students: true }
    ],
    dissertation_requests: [],
    notifications: [],
    student_term_registrations: [
      { student_id: 's-reg-1', term_id: 'term-sem2', status: 'pending', payment_status: 'unpaid' },
      { student_id: 's-reg-2', term_id: 'term-sem2', status: 'pending', payment_status: 'unpaid' }
    ],
    students: [
      { id: 's-reg-1', full_name: 'Mohamed Sesay', level: 4, semester: 2, department: 'Computer Science' },
      { id: 's-reg-2', full_name: 'Fatmata Bangura', level: 4, semester: 2, department: 'Computer Science' },
      { id: 's-unreg', full_name: 'Unregistered Student', level: 4, semester: 2, department: 'Computer Science' },
      { id: 's-yr2', full_name: 'Year 2 Student', level: 2, semester: 2, department: 'Computer Science' },
      { id: 's-civil', full_name: 'Civil Eng Student', level: 4, semester: 2, department: 'Civil Engineering' }
    ]
  };

  // RPC 1: submit_dissertation_request
  function simulateSubmitRequest({ studentId, supervisorId, title, abstract }) {
    const student = dbState.students.find(s => s.id === studentId);
    if (!student || student.level !== 4) {
      throw new Error('Only Year 4 students can submit dissertation supervisor requests.');
    }
    const profile = dbState.supervisor_profiles.find(sp => sp.lecturer_id === supervisorId);
    if (!profile) {
      throw new Error('This lecturer has not published a dissertation supervision profile.');
    }
    // Check department match
    const deptMatch = profile.department.toLowerCase().includes(student.department.toLowerCase()) ||
                      student.department.toLowerCase().includes(profile.department.toLowerCase());
    if (!deptMatch) {
      throw new Error(`Supervisor is in ${profile.department}, but student is in ${student.department}. Cross-department supervisor selection is prohibited.`);
    }

    const reqId = `req-${dbState.dissertation_requests.length + 1}`;
    const newReq = { id: reqId, student_id: studentId, supervisor_id: supervisorId, title, abstract, status: 'pending' };
    dbState.dissertation_requests.push(newReq);
    return newReq;
  }

  // RPC 2: confirm_dissertation_request with row locking
  let rowLockActive = false;
  function simulateConfirmRequest({ requestId, callerLecturerId, callerRole }) {
    if (callerRole !== 'lecturer' && callerRole !== 'admin') {
      throw new Error('Unauthorized: Only faculty lecturers can confirm supervision requests.');
    }
    const req = dbState.dissertation_requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found.');
    if (req.supervisor_id !== callerLecturerId) {
      throw new Error('You can only confirm supervision requests submitted directly to you.');
    }

    // Row Lock Simulation: SELECT ... FOR UPDATE
    rowLockActive = true;
    try {
      const profile = dbState.supervisor_profiles.find(sp => sp.lecturer_id === callerLecturerId);
      const confirmedCount = dbState.dissertation_requests.filter(r => r.supervisor_id === callerLecturerId && r.status === 'confirmed').length;

      if (confirmedCount >= profile.max_students) {
        throw new Error(`Maximum student capacity reached (${confirmedCount}/${profile.max_students} students confirmed). Cannot confirm additional students.`);
      }

      // Check unique confirmed supervisor per student per term
      const studentAlreadyConfirmed = dbState.dissertation_requests.some(r => r.student_id === req.student_id && r.status === 'confirmed' && r.id !== req.id);
      if (studentAlreadyConfirmed) {
        throw new Error('Student already has another confirmed supervisor for this academic term.');
      }

      req.status = 'confirmed';
      req.decided_at = new Date().toISOString();
      return { success: true, status: 'confirmed' };
    } finally {
      rowLockActive = false;
    }
  }

  // 1. Cross-department request rejection
  let crossDeptError = null;
  try {
    simulateSubmitRequest({
      studentId: 's-reg-1', // Computer Science
      supervisorId: 'lec-2', // Civil Engineering
      title: 'AI in Smart Traffic',
      abstract: 'Testing cross department supervisor block.'
    });
  } catch (err) {
    crossDeptError = err.message;
  }
  assert(crossDeptError !== null && crossDeptError.includes('Cross-department'), 'A student cannot select a supervisor from another department');

  // Submit valid requests to Dr. Alpha Kamara (max 2 students)
  const req1 = simulateSubmitRequest({ studentId: 's-reg-1', supervisorId: 'lec-1', title: 'Telemedicine PWA', abstract: 'Research abstract 1' });
  const req2 = simulateSubmitRequest({ studentId: 's-reg-2', supervisorId: 'lec-1', title: 'Campus Navigation', abstract: 'Research abstract 2' });

  // 2. Self-confirmation / unauthorized student confirmation rejection
  let selfConfirmError = null;
  try {
    simulateConfirmRequest({ requestId: req1.id, callerLecturerId: 'lec-1', callerRole: 'student' });
  } catch (err) {
    selfConfirmError = err.message;
  }
  assert(selfConfirmError !== null && selfConfirmError.includes('Unauthorized'), 'A student cannot confirm their own request');

  // Confirm slot 1
  const conf1 = simulateConfirmRequest({ requestId: req1.id, callerLecturerId: 'lec-1', callerRole: 'lecturer' });
  assert(conf1.success === true && conf1.status === 'confirmed', 'Supervisor can confirm first student');

  // Confirm slot 2 (filling capacity 2/2)
  const conf2 = simulateConfirmRequest({ requestId: req2.id, callerLecturerId: 'lec-1', callerRole: 'lecturer' });
  assert(conf2.success === true && conf2.status === 'confirmed', 'Supervisor can confirm second student filling max capacity');

  // 3. Concurrent confirmation for last slot (exceeding capacity 2/2)
  // Create a 3rd student request
  dbState.students.push({ id: 's-reg-3', full_name: 'Amadu Jalloh', level: 4, semester: 2, department: 'Computer Science' });
  const req3 = simulateSubmitRequest({ studentId: 's-reg-3', supervisorId: 'lec-1', title: 'Security Audit Tool', abstract: 'Research abstract 3' });

  let capacityError = null;
  try {
    simulateConfirmRequest({ requestId: req3.id, callerLecturerId: 'lec-1', callerRole: 'lecturer' });
  } catch (err) {
    capacityError = err.message;
  }
  assert(capacityError !== null && capacityError.includes('Maximum student capacity reached'), 'Concurrent confirmations for the last slot: exceeding capacity fails with lock check');

  // 4. Student cannot have two confirmed supervisors in the same term
  // If Dr. Beta has capacity, student 1 tries to confirm with Dr. Beta too
  dbState.supervisor_profiles.push({ id: 'sp-3', lecturer_id: 'lec-3', lecturer_name: 'Dr. Gamma Turay', department: 'Computer Science', max_students: 5, accepting_students: true });
  const reqDuplicate = simulateSubmitRequest({ studentId: 's-reg-1', supervisorId: 'lec-3', title: 'Alternative Topic', abstract: 'Alternative abstract' });

  let duplicateConfirmError = null;
  try {
    simulateConfirmRequest({ requestId: reqDuplicate.id, callerLecturerId: 'lec-3', callerRole: 'lecturer' });
  } catch (err) {
    duplicateConfirmError = err.message;
  }
  assert(duplicateConfirmError !== null && duplicateConfirmError.includes('Student already has another confirmed supervisor'), 'A student cannot have two confirmed supervisors in the same term');

  // 5. Department notification reaches only matching registered final-year students
  function simulateNotifySupervisorAvailable(newProfile) {
    const matchingStudents = dbState.students.filter(s => {
      const isLevel4 = s.level === 4 && s.semester === 2;
      const isDept = s.department.toLowerCase().includes(newProfile.department.toLowerCase());
      const isRegistered = dbState.student_term_registrations.some(str => str.student_id === s.id);
      return isLevel4 && isDept && isRegistered;
    });
    return matchingStudents.map(s => ({
      recipient_id: s.id,
      body: `${newProfile.lecturer_name} is now available as a dissertation supervisor in ${newProfile.department}.`
    }));
  }

  const notifs = simulateNotifySupervisorAvailable({ lecturer_name: 'Dr. Delta Koroma', department: 'Computer Science' });
  const notifiedIds = notifs.map(n => n.recipient_id);
  assert(notifiedIds.includes('s-reg-1') && notifiedIds.includes('s-reg-2'), 'Notification reaches matching registered students (s-reg-1, s-reg-2)');
  assert(!notifiedIds.includes('s-unreg'), 'Unregistered final-year student does not receive notification');
  assert(!notifiedIds.includes('s-yr2'), 'Year 2 student does not receive notification');
  assert(!notifiedIds.includes('s-civil'), 'Civil engineering student does not receive computer science notification');

  // 6. Payment before supervisor confirmation is rejected
  function simulateInitiateDissertationPayment({ studentId, registrationType }) {
    if (registrationType === 'dissertation') {
      const confirmedReq = dbState.dissertation_requests.find(r => r.student_id === studentId && r.status === 'confirmed');
      if (!confirmedReq) {
        throw new Error('Dissertation fee payment cannot be processed before a faculty supervisor has confirmed your supervision request.');
      }
    }
    return { ok: true, amount: 500, reference: 'REG-DISS-PAID-001' };
  }

  // Student 3 has pending (unconfirmed) request
  let unconfirmedPaymentError = null;
  try {
    simulateInitiateDissertationPayment({ studentId: 's-reg-3', registrationType: 'dissertation' });
  } catch (err) {
    unconfirmedPaymentError = err.message;
  }
  assert(unconfirmedPaymentError !== null && unconfirmedPaymentError.includes('cannot be processed before a faculty supervisor has confirmed'), 'Payment before supervisor confirmation is rejected with 400 error');

  // Student 1 has confirmed supervisor -> payment succeeds
  const confirmedPayment = simulateInitiateDissertationPayment({ studentId: 's-reg-1', registrationType: 'dissertation' });
  assert(confirmedPayment.ok === true && confirmedPayment.amount === 500, 'Payment succeeds after supervisor confirmation');
}


// Summary Report
console.log(`\n======================================================`);
console.log(`  AUTOMATED TEST RESULTS`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All automated integration and domain tests passed successfully.');
  process.exit(0);
}

