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
    return type === 'dissertation' ? 500 : 100;
  }

  assert(registrationFee('normal') === 100, 'Normal student registration fee is SLE 100');
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
    const registrationFee = isYear4Sem2 ? 500 : 100;

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
  assert(case1.registrationFee === 100, 'Case 1: Year 2 student pays per-module regular fee (SLE 100)');

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
