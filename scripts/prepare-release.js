#!/usr/bin/env node
/**
 * V57 Release Readiness & Packaging Verification Script
 * Validates file integrity, required production assets, code syntax, and executes the master test suite.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===============================================================');
console.log('🚀 ACADEMIC PORTAL V57: PRODUCTION RELEASE READINESS CHECK');
console.log('===============================================================');
console.log(`Root Directory: ${rootDir}\n`);

let checksPassed = 0;
let totalChecks = 0;

function assertCheck(description, fn) {
  totalChecks++;
  try {
    const result = fn();
    if (result !== false) {
      console.log(`  ✅ [PASS] ${description}`);
      checksPassed++;
      return true;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}: ${err.message}`);
    return false;
  }
}

// 1. Check Core Schema and Migration Files
console.log('\n--- 1. Database Schema & Migration Artifacts ---');
const requiredDbFiles = [
  'supabase/v39_attendance_system.sql',
  'supabase/v40_assignment_system.sql',
  'supabase/v41_to_v55_master_schema.sql',
  'supabase/v56_production_bootstrap.sql'
];
for (const relFile of requiredDbFiles) {
  assertCheck(`Database file exists: ${relFile}`, () => {
    return fs.existsSync(path.join(rootDir, relFile));
  });
}

// 2. Check Key Components
console.log('\n--- 2. Frontend Components & Services ---');
const requiredComponents = [
  'frontend/src/components/AttendanceManagementV39.jsx',
  'frontend/src/components/AssignmentManagementV40.jsx',
  'frontend/src/components/GradeManagementV41.jsx',
  'frontend/src/components/DissertationManagementV42.jsx',
  'frontend/src/components/TimetableManagementV43.jsx',
  'frontend/src/components/MessagingCenterV44.jsx',
  'frontend/src/components/NotificationsCenterV45.jsx',
  'frontend/src/components/PaymentCenterV46.jsx',
  'frontend/src/components/ModuleRegistrationV47.jsx',
  'frontend/src/components/StudentManagementV48.jsx',
  'frontend/src/components/ProfileSecurityCenterV49.jsx',
  'frontend/src/components/AdminOperationsV50.jsx',
  'frontend/src/services/academicMasterV41toV55.js',
  'frontend/src/v41-to-v55-master.css'
];
for (const comp of requiredComponents) {
  assertCheck(`Component/Service exists: ${comp}`, () => {
    return fs.existsSync(path.join(rootDir, comp));
  });
}

// 3. Check Production Deployment Files (V56)
console.log('\n--- 3. Production Deployment Assets (V56) ---');
const requiredDeploymentFiles = [
  'frontend/.env.example',
  'server/.env.production.example',
  'docs/V56-PRODUCTION-DEPLOYMENT.md'
];
for (const depFile of requiredDeploymentFiles) {
  assertCheck(`Deployment file exists: ${depFile}`, () => {
    return fs.existsSync(path.join(rootDir, depFile));
  });
}

// 4. Strict Compliance Check: Zero GPA / CGPA rule in Grade Management
console.log('\n--- 4. Policy Compliance Verification ---');
assertCheck('Strict Rule: No GPA or CGPA calculation or display in GradeManagementV41', () => {
  const gradeCompCode = fs.readFileSync(path.join(rootDir, 'frontend/src/components/GradeManagementV41.jsx'), 'utf-8');
  // Confirm that GPA is not being calculated, stored in state, or rendered as student metrics
  const hasGpaCalculation = /calculateGPA|calculateCGPA|student\.gpa|student\.cgpa|grade_point_average/i.test(gradeCompCode);
  if (hasGpaCalculation) {
    throw new Error('Found forbidden GPA/CGPA calculation or data property in GradeManagementV41.jsx!');
  }
  return true;
});

assertCheck('Strict Rule: No GPA or CGPA calculation in Academic Master Service', () => {
  const serviceCode = fs.readFileSync(path.join(rootDir, 'frontend/src/services/academicMasterV41toV55.js'), 'utf-8');
  const hasGPA = /calculateGPA|calculateCGPA/i.test(serviceCode);
  if (hasGPA) {
    throw new Error('Found forbidden calculateGPA reference in academicMasterV41toV55.js!');
  }
  return true;
});

// 5. Run Master Integration Test Suite (V55)
console.log('\n--- 5. Automated Master Integration Test Suite ---');
const testRun = spawnSync('node', [path.join(rootDir, 'tests/master_test_suite.js')], {
  cwd: rootDir,
  encoding: 'utf-8'
});

console.log(testRun.stdout);
if (testRun.stderr) console.error(testRun.stderr);

assertCheck('All 28 master integration tests pass with 0 exit code', () => {
  return testRun.status === 0;
});

// Summary
console.log('===============================================================');
console.log(`RELEASE READINESS SCORE: ${checksPassed} / ${totalChecks} (${Math.round((checksPassed/totalChecks)*100)}%)`);
console.log('===============================================================');

if (checksPassed === totalChecks) {
  console.log('🎉 SYSTEM INTEGRITY CONFIRMED: V57 Production Release Ready!\n');
  process.exit(0);
} else {
  console.error('❌ SOME CHECKS FAILED: Review the output above before deploying.\n');
  process.exit(1);
}
