import React, { useState, lazy, Suspense } from "react";
import { signInById, signUpStudent, signUpLecturer, signOut } from './services/auth';
import { supabase } from './services/supabase';
import { verifyCurrentDevice, registerCurrentDevice } from './services/device';
import { requestPasswordRecovery } from './services/recovery';
import { openRegistrationCheckout, registerStudentApplicantAndCheckout } from './services/payment';
import LiveNotificationToast from './components/LiveNotificationToast';
import { initLiveNotificationListener, fetchLiveUnreadCounts } from './services/liveNotificationService';
import { setOneSignalUser, clearOneSignalUser } from './services/oneSignalService';

const PaymentSuccess = lazy(() => import('./components/PaymentSuccess'));
const PaymentCheckout = lazy(() => import('./components/PaymentCheckout'));
const ResetPasswordScreen = lazy(() => import('./components/ResetPasswordScreen'));
const OnboardingScreen = lazy(() => import('./components/OnboardingScreen'));
const PortalGatewayScreen = lazy(() => import('./components/PortalGatewayScreen'));
const SetPermanentPasswordModal = lazy(() => import('./components/SetPermanentPasswordModal'));
const AttendanceManagementV39 = lazy(() => import('./components/AttendanceManagementV39'));
const StudentAttendance = lazy(() => import('./components/StudentAttendance'));
const AssignmentManagementV40 = lazy(() => import('./components/AssignmentManagementV40'));
const GradeManagementV41 = lazy(() => import('./components/GradeManagementV41'));
const DissertationManagementV42 = lazy(() => import('./components/DissertationManagementV42'));
const TimetableManagementV43 = lazy(() => import('./components/TimetableManagementV43'));
const MessagingCenterV44 = lazy(() => import('./components/MessagingCenterV44'));
const NotificationsCenterV45 = lazy(() => import('./components/NotificationsCenterV45'));
const PaymentCenterV46 = lazy(() => import('./components/PaymentCenterV46'));
const ModuleRegistrationV47 = lazy(() => import('./components/ModuleRegistrationV47'));
const ModuleManagement = lazy(() => import('./components/ModuleManagement'));
const StudentManagementV48 = lazy(() => import('./components/StudentManagementV48'));
const ProfileSecurityCenterV49 = lazy(() => import('./components/ProfileSecurityCenterV49'));
const AdminOperationsV50 = lazy(() => import('./components/AdminOperationsV50'));
const StudentDashboardV36 = lazy(() => import('./components/StudentDashboardV36'));
const StudentGradeInbox = lazy(() => import('./components/StudentGradeInbox'));
const PaymentGate = lazy(() => import('./components/PaymentGate'));
import NotificationSubscribeButton from './components/NotificationSubscribeButton';
import { getTimeBasedGreeting } from './utils/greeting';
import './v39-attendance.css';
import './v15-attendance.css';
import './v40-assignments.css';
import './v41-to-v55-master.css';
import {
  CAMPUSES,
  PROGRAMME_TYPES,
  getProgrammeInfo,
  getLevelsForProgramme,
  getDepartmentsByCampus,
  getFacultiesByCampusId,
  getDepartmentsByCampusAndFaculty,
  getProgrammesByCampusAndFaculty,
  getModulesByCampusAndFaculty,
  getModulesByCampusFacultyDept,
  getCurriculumModules,
  getModulesForLecturerTeaching
} from './data/academicCatalogue.js';
import {
  Bell, BookOpen, CalendarCheck, ChevronRight, ClipboardList, FileText,
  GraduationCap, Home, LockKeyhole, LogOut, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, User, Users,
  X, MapPin, Clock3, Award, Upload, Eye, EyeOff, KeyRound, CreditCard, Activity,
  ChevronLeft, PanelLeftClose, PanelLeftOpen, Layers, Radio, Check, Copy, ArrowRight
} from "lucide-react";

const modules = [
  { id: 'ea906b5e-be88-41e8-9cb3-aca4128247f8', code: "BSCS411", title: "Oracle", students: 45, level: "Year 3", studentsCount: 45 },
  { id: 'mod-bscs-412-cpp', code: "BSCS412", title: "C++", students: 45, level: "Year 3", studentsCount: 45 }
];

function TopLeftCapDateTime() {
  const [now, setNow] = useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div
      className="top-left-cap-datetime"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 12px',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(18, 59, 99, 0.04))',
        border: '1px solid rgba(2, 132, 199, 0.2)',
        borderRadius: '24px',
        color: '#0a2540',
        fontSize: '12px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
      }}
      title="Current Academic System Date & Time"
    >
      <div
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
        }}
      >
        <GraduationCap size={15} color="#ffffff" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.1px' }}>
        <span style={{ color: '#0f172a', fontWeight: '600' }}>{dateStr}</span>
        <span style={{ color: '#94a3b8' }}>•</span>
        <span style={{ color: '#0284c7', fontWeight: '700', fontFamily: 'monospace', fontSize: '12.5px' }}>{timeStr}</span>
      </div>
    </div>
  );
}

function Logo({ small=false }) {
  return (
    <div className={"logo-wrap " + (small ? "small" : "")} style={{ justifyContent: 'center', marginBottom: small ? 0 : '20px' }}>
      <img
        src="/edulink-logo.jpg"
        alt="EduLink"
        className={`edulink-img-logo ${small ? 'small' : ''}`}
        style={{
          width: small ? '42px' : '96px',
          height: small ? '42px' : '96px',
          borderRadius: small ? '10px' : '18px',
          objectFit: 'cover',
          boxShadow: '0 8px 24px rgba(18, 59, 99, 0.18)'
        }}
      />
    </div>
  );
}

function Auth({ onAuthenticated, initialScreen = 'gateway', initialRole = 'student', initialStudentId = '', onShowOnboarding }) {
  const [role, setRole] = useState(initialRole);
  const [screen, setScreen] = useState(initialScreen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deviceRequired, setDeviceRequired] = useState(false);
  const [pendingRebindAccount, setPendingRebindAccount] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    id: initialStudentId || '', password:'', confirmPassword:'', email:'', fullName:'', studentId: initialStudentId || '', phone:'',
    facultyId:'faculty-applied-sciences', departmentId:'dept-computer-science', programmeId:'', programme:'BSc', level:'1',
    programmeLecturing: 'BSc', levelLecturing: '1',
    academicYear:'2026/2027', semester:'First Semester', campus:'goderich', registrationType:'normal', selectedModulesCount: 1,
    selectedModuleCodes: [], modules:[], teachingArea:'Department of Computer Science', deviceName:''
  });

  const handleProgrammeSelect = (progCode) => {
    const prog = getProgrammeInfo(progCode);
    update('programme', prog.code);
    const validLevels = prog.levels.map(l => l.value);
    if (!validLevels.includes(form.level)) {
      update('level', '1');
    }
  };

  const getLevelsForLecturerProgramme = (progCode) => {
    const code = String(progCode || 'BSc').trim().toUpperCase();
    if (code === 'DIPLOMA') {
      return [
        { value: '1', label: 'Year 1' },
        { value: '2', label: 'Year 2' }
      ];
    }
    if (code === 'HND') {
      return [
        { value: '1', label: 'Year 1' },
        { value: '2', label: 'Year 2' },
        { value: '3', label: 'Year 3' }
      ];
    }
    return [
      { value: '1', label: 'Year 1' },
      { value: '2', label: 'Year 2' },
      { value: '3', label: 'Year 3' },
      { value: '4', label: 'Year 4' }
    ];
  };

  const handleLecturerProgrammeSelect = (progCode) => {
    update('programmeLecturing', progCode);
    const validLevels = getLevelsForLecturerProgramme(progCode).map(l => l.value);
    if (!validLevels.includes(form.levelLecturing)) {
      update('levelLecturing', '1');
    }
    update('modules', []);
  };

  const studentCurriculumModules = React.useMemo(() => {
    if (role !== 'student' || !form.departmentId) return [];
    return getCurriculumModules({
      campusId: form.campus,
      facultyId: form.facultyId,
      departmentId: form.departmentId,
      programme: form.programme,
      level: form.level,
      semester: form.semester
    });
  }, [role, form.campus, form.facultyId, form.departmentId, form.programme, form.level, form.semester]);

  const lecturerAvailableModules = React.useMemo(() => {
    if (role !== 'lecturer' || !form.departmentId) return [];
    return getModulesForLecturerTeaching({
      campusId: form.campus,
      facultyId: form.facultyId,
      departmentId: form.departmentId,
      programme: form.programmeLecturing || 'BSc',
      level: form.levelLecturing || '1'
    });
  }, [role, form.campus, form.facultyId, form.departmentId, form.programmeLecturing, form.levelLecturing]);

  const totalDepartmentModules = studentCurriculumModules.length || 8;
  const activeSelectedModulesCount = form.registrationType === 'dissertation'
    ? 1
    : Math.max(1, Math.min(Number(form.selectedModulesCount) || 1, totalDepartmentModules));
  const studentTuition = form.registrationType === 'dissertation' ? 500 : activeSelectedModulesCount * 100;

  React.useEffect(() => {
    if (initialStudentId) {
      setForm(f => ({ ...f, id: initialStudentId, studentId: initialStudentId }));
    }
  }, [initialStudentId]);

  React.useEffect(() => {
    if (initialScreen) setScreen(initialScreen);
    if (initialRole) setRole(initialRole);
  }, [initialScreen, initialRole]);

  React.useEffect(() => {
    if (screen === 'student-modules' && role === 'student') {
      const quota = Number(form.selectedModulesCount) || 1;
      const currentCodes = Array.isArray(form.selectedModuleCodes) ? form.selectedModuleCodes : [];
      if (currentCodes.length === 0 && studentCurriculumModules.length > 0) {
        update('selectedModuleCodes', studentCurriculumModules.slice(0, Math.min(quota, studentCurriculumModules.length)).map(m => m.code));
      }
    }
  }, [screen, role, studentCurriculumModules]);

  const update = (key, value) => setForm(f => ({...f, [key]: value}));
  const resetState = () => { setError(''); setMessage(''); setDeviceRequired(false); setPendingRebindAccount(null); };

  async function handleRebindDevice() {
    if (!pendingRebindAccount) return;
    setBusy(true); setError('');
    try {
      await registerCurrentDevice({
        role: pendingRebindAccount.role,
        profileId: pendingRebindAccount.profile?.id,
        replaceExisting: true
      });
      const savedAcc = {
        id: pendingRebindAccount.profile?.student_id || pendingRebindAccount.profile?.lecturer_id || form.id.trim(),
        name: pendingRebindAccount.profile?.full_name || (pendingRebindAccount.role === 'lecturer' ? 'Lecturer' : 'Student'),
        role: pendingRebindAccount.role,
        avatar: pendingRebindAccount.profile?.avatar_url || localStorage.getItem('edulink_active_avatar') || null
      };
      if (savedAcc.id) {
        try { localStorage.setItem('edulink_last_account', JSON.stringify(savedAcc)); } catch (e) {}
      }
      onAuthenticated({ role: pendingRebindAccount.role, profile: pendingRebindAccount.profile });
    } catch (err) {
      setError(err.message || 'Unable to switch device.');
    } finally {
      setBusy(false);
    }
  }

  async function login(e) {
    e.preventDefault(); resetState(); setBusy(true);
    try {
      const result = await signInById({ role, id: form.id.trim(), password: form.password });

      // One Device Per Account verification (silent & seamless - no device name prompt)
      try {
        const device = await verifyCurrentDevice({ role });
        if (!device.registered) {
          // If the account already has another device registered on a different phone/browser
          if (device.code === 'UNKNOWN_DEVICE' || device.reason === 'UNKNOWN_DEVICE') {
            setPendingRebindAccount({ role, profile: result.profile });
            throw new Error('Access denied: This account is already bound to another registered device (One device per account policy). To change devices, contact the university administrator or switch your active device below.');
          }
          // If the account does not have a registered device yet, auto-register this current browser
          await registerCurrentDevice({ role, profileId: result.profile?.id });
        }
      } catch (devErr) {
        if (devErr.message?.includes('One device per account policy')) {
          throw devErr;
        }
        console.warn('Device verification grace notice:', devErr.message);
      }

      const savedAcc = {
        id: result.profile?.student_id || result.profile?.lecturer_id || form.id.trim(),
        name: result.profile?.full_name || (role === 'lecturer' ? 'Lecturer' : 'Student'),
        role,
        avatar: result.profile?.avatar_url || localStorage.getItem('edulink_active_avatar') || null
      };
      if (savedAcc.id) {
        try {
          localStorage.setItem('edulink_last_account', JSON.stringify(savedAcc));
        } catch (e) {}
      }

      onAuthenticated({ role, profile: result.profile });
    } catch (err) {
      const rawMsg = err.message || 'Login failed.';
      const friendlyMsg = rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')
        ? 'Unable to connect to the authentication server. Please check your network connection.'
        : rawMsg;
      setError(friendlyMsg);
    }
    finally { setBusy(false); }
  }

  async function register(e) {
    e.preventDefault(); resetState(); setBusy(true);
    try {
      if (role === 'student') {
        if (!form.studentId || !form.fullName || !form.email) {
          throw new Error('Student ID, Full Name, and Email are required.');
        }
        if (!form.campus || !form.departmentId) {
          throw new Error('Please select your Campus and Department.');
        }
        let resolvedFacultyId = form.facultyId;
        if (!resolvedFacultyId) {
          const depts = getDepartmentsByCampus(form.campus);
          const found = depts.find(d => d.id === form.departmentId);
          if (found) resolvedFacultyId = found.facultyId;
        }
        setForm(f => ({
          ...f,
          id: f.studentId,
          facultyId: resolvedFacultyId,
          programme: f.programme || 'BSc',
          level: f.level || '1',
          semester: f.semester || 'First Semester',
          academicYear: f.academicYear || '2026/2027'
        }));
        setScreen('student-modules');
      } else {
        if (!form.fullName || !form.fullName.trim()) {
          throw new Error('Please enter your Full Name.');
        }
        if (!form.email || !form.password || form.password.length < 8) {
          throw new Error('Use a valid email and a password of at least 8 characters.');
        }
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }
        if (!form.campus || !form.departmentId) {
          throw new Error('Please select both a Campus and a Department.');
        }
        let resolvedFacultyId = form.facultyId;
        if (!resolvedFacultyId && form.campus && form.departmentId) {
          const depts = getDepartmentsByCampus(form.campus);
          const found = depts.find(d => d.id === form.departmentId);
          if (found) resolvedFacultyId = found.facultyId;
        }
        if (!resolvedFacultyId || !form.departmentId) {
          throw new Error('Please select both a Campus and a Department.');
        }
        setForm(f => ({
          ...f,
          facultyId: resolvedFacultyId,
          programmeLecturing: f.programmeLecturing || 'BSc',
          levelLecturing: f.levelLecturing || '1'
        }));
        setScreen('lecturer-modules');
      }
    } catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setBusy(false); }
  }

  async function completeStudentModuleSelection(e) {
    if (e) e.preventDefault();
    resetState();
    setBusy(true);
    try {
      const isDissertation = form.registrationType === 'dissertation';
      const targetQuota = isDissertation ? 1 : (Number(form.selectedModulesCount) || 1);
      const selectedCodes = isDissertation
        ? ['DISSERTATION-RES']
        : (Array.isArray(form.selectedModuleCodes) ? form.selectedModuleCodes : []);

      if (!isDissertation && selectedCodes.length === 0) {
        throw new Error('Please select at least 1 module to continue to payment.');
      }
      if (!isDissertation && selectedCodes.length < targetQuota) {
        throw new Error(`Please select ${targetQuota - selectedCodes.length} more ${targetQuota - selectedCodes.length === 1 ? 'module' : 'modules'} to complete your chosen quota of ${targetQuota}.`);
      }

      const chosenModules = isDissertation ? ['DISSERTATION-RES'] : selectedCodes;
      const chosenCount = chosenModules.length;
      const totalAmount = isDissertation ? 500 : chosenCount * 100;

      const chosenModulesData = isDissertation
        ? [{ code: 'DISSERTATION', title: 'Honours Research Dissertation & Defense', lecturerName: 'Peter Saffa', fee: 500 }]
        : studentCurriculumModules
            .filter(m => chosenModules.includes(m.code))
            .map(m => ({
              code: m.code,
              title: m.title,
              lecturerName: m.lecturerName || 'Department Lecturer',
              fee: 100
            }));

      const applicantData = {
        ...form,
        id: form.studentId,
        modulesCount: chosenCount,
        modules: chosenModules,
        modulesData: chosenModulesData,
        registrationType: form.registrationType,
        amount: totalAmount
      };

      await registerStudentApplicantAndCheckout(applicantData);
      setForm(f => ({
        ...f,
        id: form.studentId,
        modulesCount: chosenCount,
        modules: chosenModules,
        modulesData: chosenModulesData,
        registrationType: form.registrationType,
        amount: totalAmount
      }));
      setScreen('checkout');
    } catch (err) {
      setError(err.message || 'Unable to proceed to payment.');
    } finally {
      setBusy(false);
    }
  }

  async function completeLecturerRegistration(e) {
    if (e) e.preventDefault();
    resetState();
    setBusy(true);
    try {
      let resolvedFacultyId = form.facultyId;
      if (!resolvedFacultyId && form.campus && form.departmentId) {
        const depts = getDepartmentsByCampus(form.campus);
        const found = depts.find(d => d.id === form.departmentId);
        if (found) resolvedFacultyId = found.facultyId;
      }
      if (!resolvedFacultyId || !form.departmentId) {
        throw new Error('Please select both a Campus and a Department.');
      }
      if (!Array.isArray(form.modules) || form.modules.length === 0) {
        throw new Error('Please select at least one teaching module for your designated programme and level before generating your Lecturer ID.');
      }
      const result = await signUpLecturer({
        ...form,
        facultyId: resolvedFacultyId,
        programme: form.programmeLecturing || 'BSc',
        level: form.levelLecturing || '1',
        programmeLecturing: form.programmeLecturing || 'BSc',
        levelLecturing: form.levelLecturing || '1'
      });
      setForm(f => ({ ...f, id: result.lecturerId, facultyId: resolvedFacultyId }));
      setMessage(
        result.session
          ? `Account created. Your official Lecturer ID is ${result.lecturerId}.`
          : `Account created. Your official Lecturer ID is ${result.lecturerId}. Verify your email, then log in.`
      );
      setScreen('registered');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function registerDevice() {
    setBusy(true); setError('');
    try {
      const result = await registerCurrentDevice({ role, deviceName: form.deviceName || undefined });
      if (!result.registered && !result.offline) throw new Error('Device registration was not completed.');
      const { data: { user } } = await supabase.auth.getUser();
      onAuthenticated({ role, profile: { auth_user_id: user?.id, ...(result.profile || {}) } });
    } catch (err) {
      const rawMsg = err.message || 'Device registration failed.';
      const friendlyMsg = rawMsg.includes('Failed to fetch')
        ? 'Could not reach device registration server. Please try again.'
        : rawMsg;
      setError(friendlyMsg);
    }
    finally { setBusy(false); }
  }

  async function continuePayment() {
    setBusy(true); setError('');
    try {
      setScreen('checkout');
    } catch (err) { setError(err.message || 'Unable to start payment.'); setBusy(false); }
  }

  if (screen === 'gateway') {
    return (
      <Suspense fallback={<main className="auth-screen"><div className="loading-panel">Loading EduLink…</div></main>}>
        <PortalGatewayScreen
          onFinish={() => {
            resetState();
            setScreen('login');
          }}
          onLogin={() => {
            resetState();
            setScreen('login');
          }}
        />
      </Suspense>
    );
  }

  if (screen === 'onboarding') {
    return (
      <Suspense fallback={<main className="auth-screen"><div className="loading-panel">Loading EduLink…</div></main>}>
        <OnboardingScreen
          onFinish={() => {
            resetState();
            setScreen('login');
          }}
        />
      </Suspense>
    );
  }

  if (screen === 'checkout') {
    return (
      <PaymentCheckout
        applicant={form}
        onPaymentCompleted={(result) => {
          setPaymentResult(result);
          setScreen('payment-success');
        }}
        onCancel={() => setScreen(role === 'student' ? 'student-modules' : 'register')}
      />
    );
  }

  if (screen === 'payment-success') {
    return (
      <PaymentSuccess
        data={paymentResult}
        onProceedToLogin={({ studentId } = {}) => {
          resetState();
          setScreen('login');
          setRole('student');
          if (studentId || form.studentId) {
            setForm(f => ({ ...f, id: studentId || form.studentId }));
          }
        }}
      />
    );
  }

  if (screen === 'registered') return <main className="auth-screen"><section className="auth-card">
    <Logo /><div className="success-panel"><div className="success-circle">✓</div><h1>{role === 'student' ? 'Student Account Created' : 'Lecturer Account Created'}</h1>
      <p>{message}</p>
      {role === 'lecturer' && (
        <div className="registration-summary">
          <span>Your Official Lecturer ID</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
            <strong style={{ fontSize: '18px', letterSpacing: '0.5px', color: '#0a2540' }}>{form.id}</strong>
            <button
              type="button"
              onClick={() => {
                if (form.id) {
                  navigator.clipboard?.writeText(form.id);
                  alert(`Lecturer ID ${form.id} copied to clipboard!`);
                }
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 600
              }}
              title="Copy Lecturer ID"
            >
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>
      )}
      {role === 'student' && <button className="primary-btn full-btn" disabled={busy} onClick={continuePayment}>{busy ? 'Opening payment…' : 'Continue to Monime Payment'}</button>}
      <button className="outline-btn full-btn" onClick={()=>{resetState();setScreen('login')}}>Go to Login</button>
    </div>{error && <div className="error-box">{error}</div>}
  </section></main>;

  if (screen === 'student-modules') {
    const currentDept = form.campus && form.departmentId
      ? getDepartmentsByCampus(form.campus).find(d => d.id === form.departmentId)
      : null;
    const currentDeptName = currentDept?.name || 'Department';
    const currentFacultyName = currentDept?.facultyName || 'Faculty';
    const currentProg = getProgrammeInfo(form.programme || 'BSc');

    const totalAvailable = studentCurriculumModules.length || 8;
    const isDissertation = form.registrationType === 'dissertation';
    const targetQuota = isDissertation ? 1 : Math.max(1, Math.min(Number(form.selectedModulesCount) || 1, totalAvailable));

    // Step 1 Quota Options: 1 Module (SLE 100), 2 Modules (SLE 200) ... up to totalAvailable (SLE total * 100)
    const quotaOptions = [];
    for (let c = 1; c <= totalAvailable; c++) {
      quotaOptions.push({
        type: 'normal',
        count: c,
        title: c === 1 ? '1 Module' : `${c} Modules`,
        desc: c === totalAvailable ? 'Full Semester Curriculum' : `Pay & register ${c} modules in department`,
        fee: c * 100
      });
    }

    const maxYear = currentProg?.levels ? currentProg.levels.length : 4;
    if (Number(form.level || 1) >= maxYear) {
      quotaOptions.push({
        type: 'dissertation',
        count: 1,
        title: 'Dissertation Student',
        desc: 'Final year research thesis only',
        fee: 500
      });
    }

    // Selected module codes & objects
    const selectedCodes = Array.isArray(form.selectedModuleCodes) ? form.selectedModuleCodes : [];
    const selectedModulesList = studentCurriculumModules.filter(m => selectedCodes.includes(m.code));
    const totalFee = isDissertation ? 500 : selectedCodes.length * 100;

    const handleSelectQuota = (opt) => {
      resetState();
      if (opt.type === 'dissertation') {
        update('registrationType', 'dissertation');
        update('selectedModulesCount', 1);
        update('selectedModuleCodes', ['DISSERTATION-RES']);
      } else {
        update('registrationType', 'normal');
        update('selectedModulesCount', opt.count);
        if (selectedCodes.includes('DISSERTATION-RES')) {
          const initialSlice = studentCurriculumModules.slice(0, Math.min(opt.count, studentCurriculumModules.length)).map(m => m.code);
          update('selectedModuleCodes', initialSlice);
        } else if (selectedCodes.length > opt.count) {
          update('selectedModuleCodes', selectedCodes.slice(0, opt.count));
        } else if (selectedCodes.length === 0 && studentCurriculumModules.length > 0) {
          update('selectedModuleCodes', studentCurriculumModules.slice(0, Math.min(opt.count, studentCurriculumModules.length)).map(m => m.code));
        }
      }
    };

    const handleToggleModule = (code) => {
      resetState();
      if (isDissertation) return;

      if (selectedCodes.includes(code)) {
        update('selectedModuleCodes', selectedCodes.filter(c => c !== code));
      } else {
        if (selectedCodes.length < targetQuota) {
          update('selectedModuleCodes', [...selectedCodes, code]);
        } else if (targetQuota === 1) {
          update('selectedModuleCodes', [code]);
        } else {
          setError(`You selected a quota of ${targetQuota} modules. Uncheck one module first or select a higher module count in Step 1.`);
        }
      }
    };

    return (
      <main className="auth-screen">
        <section className="auth-card wide" style={{ maxWidth: '680px', padding: '32px 28px' }}>
          <Logo />

          {/* Header & Back Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <button
              type="button"
              className="back-link"
              style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { resetState(); setScreen('register'); }}
              disabled={busy}
            >
              ← Back to Details
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Step 2 of 2: Module Selection</span>
          </div>

          <div className="auth-heading" style={{ marginBottom: '18px' }}>
            <h1>Module Registration & Payment</h1>
            <p>Select how many modules you want to pay for, then choose your modules below.</p>
          </div>

          {/* Student Profile Summary Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Student Profile</small>
              <div style={{ fontWeight: 800, color: '#061626', fontSize: '15px' }}>
                {form.fullName} <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>({form.studentId})</span>
              </div>
              <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>
                🏛️ {form.campus} • {currentDeptName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                background: currentProg.badgeBg || '#e0f2fe',
                color: currentProg.badgeColor || '#0369a1',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '99px'
              }}>
                {form.programme || 'BSc'}
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '99px'
              }}>
                Year {form.level || 1}
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '11.5px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '99px'
              }}>
                {form.semester || 'First Semester'}
              </span>
            </div>
          </div>

          <form onSubmit={completeStudentModuleSelection}>
            {/* ========================================================
                STEP 1 — MODULE PAYMENT (HOW MANY MODULES?)
               ======================================================== */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '99px'
                  }}>
                    Step 1
                  </span>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>
                    Select Number of Modules to Pay For
                  </strong>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Choose your module registration tier (SLE 100 / Module).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {quotaOptions.map((opt) => {
                  const isChecked = opt.type === 'dissertation'
                    ? isDissertation
                    : (!isDissertation && targetQuota === opt.count);

                  return (
                    <label
                      key={`${opt.type}-${opt.count}`}
                      onClick={() => handleSelectQuota(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: isChecked ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                        background: isChecked ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isChecked ? '0 3px 10px rgba(2, 132, 199, 0.12)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          name="studentModuleQuotaRadio"
                          checked={isChecked}
                          onChange={() => handleSelectQuota(opt)}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: '#0284c7',
                            cursor: 'pointer',
                            margin: 0,
                            flexShrink: 0
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: isChecked ? '#0369a1' : '#1e293b' }}>
                            {opt.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isChecked ? '#0369a1' : '#0f172a',
                        background: isChecked ? '#e0f2fe' : '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap'
                      }}>
                        SLE {opt.fee}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                STEP 2 — SHOW ACTUAL MODULES OFFERED (CHECKBOX PICKER)
               ======================================================== */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '99px'
                    }}>
                      Step 2
                    </span>
                    <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>
                      {isDissertation ? 'Select Dissertation' : `Select ${targetQuota} ${targetQuota === 1 ? 'Module' : 'Modules'}`}
                    </strong>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Check the boxes below to choose the specific modules you wish to take.
                  </p>
                </div>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: (isDissertation || selectedCodes.length === targetQuota) ? '#15803d' : '#b45309',
                  background: (isDissertation || selectedCodes.length === targetQuota) ? '#dcfce7' : '#fef3c7',
                  padding: '3px 10px',
                  borderRadius: '99px'
                }}>
                  {isDissertation ? '1 Dissertation' : `${selectedCodes.length} of ${targetQuota} selected`}
                </span>
              </div>

              {studentCurriculumModules.length === 0 ? (
                <div style={{ padding: '18px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No curriculum modules currently listed for Year {form.level || 1}.
                </div>
              ) : isDissertation ? (
                <div style={{
                  padding: '16px 18px',
                  background: '#f0f9ff',
                  border: '1.5px solid #0284c7',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked readOnly style={{ width: '18px', height: '18px', accentColor: '#0284c7' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        Final Year Honours Dissertation & Defense
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        Supervised Academic Research & Defense • Lecturer: Peter Saffa
                      </div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '13px' }}>
                    SLE 500
                  </span>
                </div>
              ) : (
                <div className="module-select-grid" style={{ maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
                  {studentCurriculumModules.map((m) => {
                    const isChecked = selectedCodes.includes(m.code);
                    return (
                      <label
                        key={m.code}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleModule(m.code);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: isChecked ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                          background: isChecked ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer',
                          marginBottom: '8px',
                          transition: 'all 0.15s ease',
                          boxShadow: isChecked ? '0 2px 8px rgba(2, 132, 199, 0.1)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleModule(m.code)}
                            style={{
                              width: '18px',
                              height: '18px',
                              accentColor: '#0284c7',
                              cursor: 'pointer',
                              margin: 0,
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: isChecked ? '#0284c7' : '#0f172a', fontSize: '13.5px' }}>
                                {m.code}
                              </strong>
                              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
                                {m.title}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              Lecturer: {m.lecturerName || 'Department Lecturer'}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '12px',
                          color: isChecked ? '#0369a1' : '#475569',
                          background: isChecked ? '#e0f2fe' : '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap'
                        }}>
                          SLE 100
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

            {/* ========================================================
                LIVE SELECTION & PAYMENT SUMMARY
               ======================================================== */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              borderRadius: '14px',
              padding: '16px 18px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  {isDissertation ? '1 Dissertation Selected' : `${selectedCodes.length} ${selectedCodes.length === 1 ? 'Module' : 'Modules'} Selected`}
                </strong>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: (isDissertation || selectedCodes.length === targetQuota) ? '#15803d' : '#b45309',
                  background: (isDissertation || selectedCodes.length === targetQuota) ? '#dcfce7' : '#fef3c7',
                  padding: '3px 9px',
                  borderRadius: '99px'
                }}>
                  {isDissertation || selectedCodes.length === targetQuota
                    ? 'Quota Ready ✓'
                    : `Please select ${targetQuota - selectedCodes.length} more`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {isDissertation ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155' }}>
                    <span>✓ <strong>DISSERTATION</strong> — Honours Research Dissertation</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>SLE 500</span>
                  </div>
                ) : selectedModulesList.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No modules selected yet. Check boxes above.
                  </div>
                ) : (
                  selectedModulesList.map(sm => (
                    <div key={sm.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155' }}>
                      <span>✓ <strong style={{ color: '#0284c7' }}>{sm.code}</strong> — {sm.title}</span>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>SLE 100</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '10px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Total:</span>
                <span style={{ fontWeight: 900, fontSize: '18px', color: '#0284c7' }}>
                  SLE {isDissertation ? '500.00' : `${selectedCodes.length * 100}.00`}
                </span>
              </div>
            </div>

            <div className="security-note" style={{ marginBottom: '18px' }}>
              <ShieldCheck size={18} />
              <span>You will complete payment via Mobile Money (Orange Money / Afrimoney) on your phone in the next step.</span>
            </div>

            <button
              type="submit"
              className="primary-btn full-btn"
              disabled={busy || (!isDissertation && selectedCodes.length !== targetQuota)}
              style={{ height: '48px', fontSize: '15px', fontWeight: 700 }}
            >
              {busy
                ? 'Preparing Payment…'
                : (isDissertation || selectedCodes.length === targetQuota
                    ? 'Continue to Payment →'
                    : `Select ${targetQuota - selectedCodes.length} More Module${targetQuota - selectedCodes.length === 1 ? '' : 's'} to Continue`)}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (screen === 'lecturer-modules') {
    const currentDept = form.campus && form.departmentId
      ? getDepartmentsByCampus(form.campus).find(d => d.id === form.departmentId)
      : null;
    const currentDeptName = currentDept?.name || 'Department';
    const currentFacultyName = currentDept?.facultyName || 'Faculty';

    return (
      <main className="auth-screen">
        <section className="auth-card wide" style={{ maxWidth: '640px', padding: '32px 28px' }}>
          <Logo />
          
          {/* Header & Back Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <button
              type="button"
              className="back-link"
              style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => { resetState(); setScreen('register'); }}
              disabled={busy}
            >
              ← Back to Profile
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Step 2 of 2: Module Assignment</span>
          </div>

          <div className="auth-heading" style={{ marginBottom: '18px' }}>
            <h1>Select Teaching Modules</h1>
            <p>Select your programme, academic year level, and teaching modules before your Lecturer ID is generated.</p>
          </div>

          {/* Lecturer Profile Summary */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Lecturer Profile</small>
              <div style={{ fontWeight: 800, color: '#061626', fontSize: '15px' }}>{form.fullName}</div>
              <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>
                🏛️ {currentDeptName} • {currentFacultyName}
              </div>
            </div>
            <span style={{
              background: '#e0f2fe',
              color: '#0369a1',
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '99px'
            }}>
              ID Generation Pending
            </span>
          </div>

          <form onSubmit={completeLecturerRegistration}>
            {/* 1. Programme Lecturing */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Programme Lecturing</label>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>Select BSc, Diploma, or HND</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {PROGRAMME_TYPES.map(prog => {
                  const isSelected = (form.programmeLecturing || 'BSc').toUpperCase() === prog.code.toUpperCase();
                  return (
                    <button
                      key={prog.id}
                      type="button"
                      onClick={() => handleLecturerProgrammeSelect(prog.code)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${prog.badgeColor}` : '1.5px solid #cbd5e1',
                        background: isSelected ? prog.badgeBg : '#ffffff',
                        color: isSelected ? prog.badgeColor : '#334155',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.18s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>{prog.code}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9, fontWeight: 600 }}>{prog.duration}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Level Lecturing, Academic Year & Semester */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: '13px' }}>Level Lecturing</label>
                <select
                  value={form.levelLecturing || '1'}
                  onChange={e => {
                    update('levelLecturing', e.target.value);
                    update('modules', []);
                  }}
                  required
                >
                  {getLevelsForLecturerProgramme(form.programmeLecturing).map(lvl => (
                    <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: '13px' }}>Academic Year</label>
                <select value={form.academicYear} onChange={e => update('academicYear', e.target.value)}>
                  <option>2026/2027</option>
                  <option>2025/2026</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: '13px' }}>Semester</label>
                <select value={form.semester} onChange={e => update('semester', e.target.value)}>
                  <option>First Semester</option>
                  <option>Second Semester</option>
                </select>
              </div>
            </div>

            {/* 3. Department Module(s) Teaching Checkboxes */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>
                  Teaching Module(s) ({form.programmeLecturing || 'BSc'} • Year {form.levelLecturing || '1'})
                </label>
                <span style={{
                  fontSize: '11.5px',
                  color: form.modules.length > 0 ? '#166534' : '#64748b',
                  background: form.modules.length > 0 ? '#dcfce7' : '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: 700
                }}>
                  {form.modules.length} selected
                </span>
              </div>

              {lecturerAvailableModules.length === 0 ? (
                <div style={{ padding: '18px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No curriculum modules currently listed for {form.programmeLecturing || 'BSc'} Year {form.levelLecturing || '1'} in this department.
                </div>
              ) : (
                <div className="module-select-grid" style={{ maxHeight: '280px', overflowY: 'auto', padding: '4px' }}>
                  {lecturerAvailableModules.map(m => {
                    const isChecked = form.modules.includes(m.code);
                    return (
                      <label
                        className="module-check"
                        key={m.code}
                        style={{
                          border: isChecked ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                          background: isChecked ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...form.modules, m.code]
                              : form.modules.filter(x => x !== m.code);
                            update('modules', next);
                          }}
                        />
                        <span>
                          <strong>{m.code}</strong>
                          {m.title}
                          {m.semester && (
                            <small style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {m.semester}
                            </small>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <div className="error-box" style={{ marginBottom: '16px' }}>{error}</div>}

            <div className="security-note" style={{ marginBottom: '18px', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <ShieldCheck size={18} color="#16a34a" />
              <span>Your official Lecturer ID (LECT-YYYY-XXXXXX) will be generated and linked to your selected modules upon clicking below.</span>
            </div>

            <button
              type="submit"
              className="primary-btn full-btn"
              disabled={busy}
              style={{
                height: '48px',
                fontSize: '15px',
                fontWeight: 700,
                background: '#0a2540',
                borderColor: '#0a2540',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {busy ? 'Generating Lecturer ID…' : 'Generate Lecturer ID & Complete Registration ✓'}
            </button>
          </form>
        </section>
      </main>
    );
  }



  if (screen === 'register') return <main className="auth-screen"><section className="auth-card wide"><Logo />
    <button className="back-link" onClick={()=>{resetState();setScreen('login')}}>← Back to login</button>
    <div className="role-switch"><button className={role==='lecturer'?'active':''} onClick={()=>setRole('lecturer')}>Lecturer</button><button className={role==='student'?'active':''} onClick={()=>setRole('student')}>Student</button></div>
    <div className="auth-heading"><h1>{role==='lecturer'?'Lecturer Registration':'Student Registration'}</h1><p>{role==='lecturer'?'Your Lecturer ID is generated automatically.':'Register your modules before completing the registration payment.'}</p></div>
    <form onSubmit={register}><div className="form-grid">
      <div><label>Full Name</label><input value={form.fullName} onChange={e=>update('fullName',e.target.value)} required placeholder="Enter full name"/></div>
      <div><label>Email Address</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required placeholder="you@example.com"/></div>
      <div><label>Phone Number</label><input value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+232 7X XXX XXX"/></div>
      {role==='lecturer' ? (
        <>
          <div>
            <label>Campus</label>
            <select
              value={form.campus}
              onChange={e => {
                const cmp = e.target.value;
                update('campus', cmp);
                update('facultyId', '');
                update('departmentId', '');
                update('teachingArea', '');
                update('modules', []);
              }}
              required
            >
              {CAMPUSES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Department</label>
            <select
              value={form.departmentId}
              onChange={e => {
                const deptId = e.target.value;
                const depts = getDepartmentsByCampus(form.campus);
                const chosen = depts.find(d => d.id === deptId);
                update('departmentId', deptId);
                update('facultyId', chosen ? chosen.facultyId : '');
                update('teachingArea', chosen ? chosen.name : '');
                update('modules', []);
              }}
              required
              disabled={!form.campus}
            >
              <option value="">{form.campus ? 'Select Department' : 'Select Campus First'}</option>
              {getFacultiesByCampusId(form.campus).map(fac => {
                const deptsInFac = getDepartmentsByCampusAndFaculty(form.campus, fac.id);
                if (!deptsInFac.length) return null;
                return (
                  <optgroup key={fac.id} label={fac.name}>
                    {deptsInFac.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {form.departmentId && (
              <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
                🏛️ Faculty: {getDepartmentsByCampus(form.campus).find(d => d.id === form.departmentId)?.facultyName || 'Faculty of Pure and Applied Sciences'}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <label>Student ID</label>
            <input value={form.studentId} onChange={e=>update('studentId',e.target.value)} required placeholder="e.g. 8100"/>
          </div>
          <div>
            <label>Campus</label>
            <select
              value={form.campus}
              onChange={e => {
                const cmp = e.target.value;
                update('campus', cmp);
                update('facultyId', '');
                update('departmentId', '');
                update('modules', []);
              }}
              required
            >
              {CAMPUSES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Department</label>
            <select
              value={form.departmentId}
              onChange={e => {
                const deptId = e.target.value;
                const depts = getDepartmentsByCampus(form.campus);
                const chosen = depts.find(d => d.id === deptId);
                update('departmentId', deptId);
                update('facultyId', chosen ? chosen.facultyId : '');
                update('modules', []);
              }}
              required
              disabled={!form.campus}
            >
              <option value="">{form.campus ? 'Select Department' : 'Select Campus First'}</option>
              {getFacultiesByCampusId(form.campus).map(fac => {
                const deptsInFac = getDepartmentsByCampusAndFaculty(form.campus, fac.id);
                if (!deptsInFac.length) return null;
                return (
                  <optgroup key={fac.id} label={fac.name}>
                    {deptsInFac.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {form.departmentId && (
              <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
                🏛️ Faculty: {getDepartmentsByCampus(form.campus).find(d => d.id === form.departmentId)?.facultyName || 'Faculty of Pure and Applied Sciences'}
              </div>
            )}
          </div>
          <div className="full-span">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ margin: 0 }}>Academic Programme</label>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Select BSc, Diploma, or HND</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '6px' }}>
              {PROGRAMME_TYPES.map(prog => {
                const isSelected = (form.programme || 'BSc').toUpperCase() === prog.code.toUpperCase();
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => handleProgrammeSelect(prog.code)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${prog.badgeColor}` : '1.5px solid #cbd5e1',
                      background: isSelected ? prog.badgeBg : '#ffffff',
                      color: isSelected ? prog.badgeColor : '#334155',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{prog.code}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9, fontWeight: 600 }}>{prog.duration}</div>
                  </button>
                );
              })}
            </div>

            {/* Programme Specification Card */}
            {(() => {
              const prog = getProgrammeInfo(form.programme || 'BSc');
              return (
                <div style={{
                  marginTop: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: `1px solid ${prog.badgeColor}35`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={18} color={prog.badgeColor} />
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{prog.fullName}</strong>
                    </div>
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: prog.badgeBg,
                      color: prog.badgeColor
                    }}>
                      {prog.levels.length} Levels ({prog.years[0]} – {prog.years[prog.years.length - 1]})
                    </span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569' }}>
                    <strong style={{ color: '#0f172a' }}>Award: </strong>{prog.award} • {prog.duration}
                  </div>
                </div>
              );
            })()}
          </div>
          <div>
            <label>Academic Level / Year</label>
            <select
              value={form.level}
              onChange={e => update('level', e.target.value)}
              required
            >
              {getLevelsForProgramme(form.programme).map(lvl => (
                <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Academic Year</label>
            <select value={form.academicYear} onChange={e=>update('academicYear',e.target.value)}>
              <option>2026/2027</option>
              <option>2025/2026</option>
            </select>
          </div>
          <div>
            <label>Semester</label>
            <select value={form.semester} onChange={e=>update('semester',e.target.value)}>
              <option>First Semester</option>
              <option>Second Semester</option>
            </select>
          </div>
        </>
      )}
      {role === 'lecturer' && (
        <>
          <div>
            <label>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showRegisterPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e=>update('password',e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowRegisterPassword(p => !p)}
                aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label>Confirm Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e=>update('confirmPassword',e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat password"
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    {error && <div className="error-box">{error}</div>}
    {role === 'student' ? (
      <div className="security-note">
        <ShieldCheck size={18}/>
        <span>A temporary password will be generated and emailed to you immediately after successful payment with Monime.</span>
      </div>
    ) : (
      <div className="security-note">
        <ShieldCheck size={18}/>
        <span>After activation, first successful login registers this browser/device. Unknown devices are blocked.</span>
      </div>
    )}
    <button className="primary-btn full-btn" disabled={busy}>
      {busy ? 'Processing…' : (role === 'student' ? 'Continue to Module Selection →' : 'Continue to Teaching Modules →')}
    </button></form>
    <p className="signup">Already registered? <button type="button" className="text-btn" onClick={()=>setScreen('login')}>Login</button></p>
  </section></main>;

  if (screen === 'forgot') {
    const handleForgotSubmit = async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      setMessage('');
      try {
        const cleanEmail = (form.email || '').trim();
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          throw new Error('Please enter a valid registered email address.');
        }
        const res = await requestPasswordRecovery(cleanEmail, role);
        setMessage(`Password reset instructions have been sent to your registered email (${res.maskedEmail || cleanEmail}). Please check your inbox and click the reset link.`);
      } catch (err) {
        setError(err.message || 'Unable to send reset instructions. Please try again.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <main className="auth-screen">
        <section className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
          <button
            type="button"
            className="back-link"
            onClick={() => { resetState(); setScreen('login'); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#52657c',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '16px'
            }}
          >
            ← Back to login
          </button>

          <div className="role-switch">
            <button
              type="button"
              className={role === 'lecturer' ? 'active' : ''}
              onClick={() => { setRole('lecturer'); resetState(); }}
            >
              Lecturer
            </button>
            <button
              type="button"
              className={role === 'student' ? 'active' : ''}
              onClick={() => { setRole('student'); resetState(); }}
            >
              Student
            </button>
          </div>

          <div className="auth-heading" style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#eaf1f8',
                color: '#0a2540',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px'
              }}
            >
              <KeyRound size={26} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#061626', margin: '0 0 6px 0' }}>
              Forgot Password
            </h1>
            <p style={{ color: '#52657c', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Enter your registered email address to receive password reset instructions and a secure reset link.
            </p>
          </div>

          {message ? (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '20px 18px',
                textAlign: 'center',
                color: '#065f46',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <ShieldCheck size={36} color="#059669" />
              <p style={{ fontSize: '13.5px', lineHeight: 1.55, margin: 0, color: '#065f46' }}>
                {message}
              </p>
              <button
                type="button"
                className="outline-btn"
                onClick={() => { resetState(); setScreen('login'); }}
                style={{ marginTop: '6px' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit}>
              <label>Registered Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
                placeholder="Enter your registered email (e.g. you@example.com)"
                autoComplete="email"
              />

              {error && <div className="error-box" style={{ marginTop: '12px' }}>{error}</div>}

              <button
                type="submit"
                className="primary-btn full-btn"
                disabled={busy}
                style={{ marginTop: '16px' }}
              >
                {busy ? 'Sending Reset Link…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="signup" style={{ marginTop: '20px', textAlign: 'center' }}>
            Remembered your password?{' '}
            <button
              type="button"
              className="text-btn"
              onClick={() => { resetState(); setScreen('login'); }}
            >
              Login
            </button>
          </p>
        </section>
      </main>
    );
  }

  return <main className="auth-screen"><section className="auth-card"><Logo/><div className="role-switch"><button className={role==='lecturer'?'active':''} onClick={()=>setRole('lecturer')}>Lecturer</button><button className={role==='student'?'active':''} onClick={()=>setRole('student')}>Student</button></div><div className="auth-heading"><h1>{role==='lecturer'?'Lecturer Login':'Student Login'}</h1><p>Sign in with your {role==='lecturer'?'Lecturer ID':'Student ID'} and password.</p></div><form onSubmit={login}><label>{role==='lecturer'?'Lecturer ID':'Student ID'}</label><input value={form.id} onChange={e=>update('id',e.target.value)} required placeholder={role==='lecturer'?'LECT-2026-0001':'8100'} autoComplete="username"/><label>Password</label><div style={{ position: 'relative', width: '100%' }}><input type={showLoginPassword ? 'text' : 'password'} value={form.password} onChange={e=>update('password',e.target.value)} required autoComplete="current-password" placeholder="••••••••" style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}/><button type="button" onClick={()=>setShowLoginPassword(p=>!p)} aria-label={showLoginPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}>{showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><div className="form-row"><label className="check"><input type="checkbox" defaultChecked/><span>Remember this device</span></label><button type="button" className="text-btn" onClick={()=>{resetState();setScreen('forgot')}}>Forgot Password?</button></div>{error&&<div className="error-box"><div style={{ marginBottom: pendingRebindAccount ? '10px' : 0 }}>{error}</div>{pendingRebindAccount && <button type="button" className="primary-btn full-btn" style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: '13px', minHeight: '38px', padding: '8px 12px' }} disabled={busy} onClick={handleRebindDevice}>📱 Switch Active Device to This Device</button>}</div>}<button className="primary-btn full-btn" disabled={busy}>{busy?'Signing in…':'Login'}</button></form><p className="signup">Don't have an account? <button className="text-btn" onClick={()=>{resetState();setScreen('register')}}>Create {role==='lecturer'?'Lecturer':'Student'} Account</button></p><p className="signup" style={{ marginTop: '10px' }}><button type="button" className="text-btn" onClick={() => onShowOnboarding ? onShowOnboarding() : setScreen('onboarding')} style={{ color: '#0284c7', fontSize: '13px', fontWeight: 600 }}>🎓 View App Tour & Onboarding</button></p></section></main>;
}

function QuickSearchModal({ isOpen, onClose, role, setPage, onNavigateSettings }) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const searchableItems = [
    { id: "modules", label: role === "student" ? "Module Registration & Courses" : "Module Management & Courses", category: "Academic", page: "modules", keywords: "module registration course study credit syllabus" },
    { id: "grades", label: role === "student" ? "My Grades & Assessment Scores" : "Student Grade Management", category: "Academic", page: "grades", keywords: "grade result mark exam test score gpa cgpa" },
    { id: "timetable", label: "Class Timetable & Schedule", category: "Schedule", page: "timetable", keywords: "timetable class time lecture schedule slot room venue" },
    { id: "attendance", label: role === "student" ? "Attendance GPS Check-In" : "Attendance Tracking & QR", category: "Academic", page: "attendance", keywords: "attendance present check in scan gps location absent late" },
    { id: "assignments", label: "Assignments & Submissions", category: "Academic", page: "assignments", keywords: "assignment submit homework project coursework deadline task" },
    { id: "messages", label: "Direct Messages & Chats", category: "Communication", page: "messages", keywords: "message chat lecturer student inbox conversation communicate" },
    { id: "notifications", label: "Campus Notifications & Alerts", category: "Communication", page: "notifications", keywords: "notifications alert notice announcement unread news" },
    ...(role === "student" ? [
      { id: "payments", label: "Tuition & Registration Payments (Monime)", category: "Finance", page: "payments", keywords: "payment tuition fee monime orange money afrimoney bank checkout receipt" }
    ] : [
      { id: "students", label: "Student Directory & Enrollment", category: "Directory", page: "students", keywords: "student list directory search roll call records" }
    ]),
    { id: "dissertation", label: "Dissertation & Thesis Supervision", category: "Research", page: "dissertation", keywords: "dissertation thesis supervisor defense chapters research proposal" },
    { id: "settings_profile", label: "Profile & Personal Information", category: "Settings", page: "settings", tab: "profile", keywords: "profile name email avatar student id photo details" },
    { id: "settings_security", label: "Security & Registered Devices", category: "Settings", page: "settings", tab: "security", keywords: "security password device recovery fingerprint token 2fa auth" },
    { id: "settings_preferences", label: "Preferences & Notifications", category: "Settings", page: "settings", tab: "preferences", keywords: "settings theme dark sound push onesignal alerts preferences" }
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? searchableItems.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      )
    : searchableItems.slice(0, 7);

  const handleSelect = (item) => {
    onClose();
    if (item.tab && onNavigateSettings) {
      onNavigateSettings(item.tab);
    } else {
      setPage(item.page);
    }
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-container" onClick={e => e.stopPropagation()}>
        <div className="search-modal-head">
          <Search size={18} color="#0a2540" style={{ flexShrink: 0 }} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search modules, grades, timetable, services…"
            className="search-modal-input"
          />
          {query ? (
            <button type="button" className="icon-btn" onClick={() => setQuery("")} title="Clear query">
              <X size={16} />
            </button>
          ) : (
            <button type="button" className="search-modal-close-btn" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>

        {!q && (
          <div className="search-quick-chips">
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', paddingLeft: '4px' }}>POPULAR:</span>
            {["Modules", "Grades", "Timetable", "Assignments", "Attendance"].map(chip => (
              <button
                key={chip}
                type="button"
                className="search-chip-btn"
                onClick={() => setQuery(chip.toLowerCase())}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="search-modal-results">
          {filtered.length > 0 ? (
            filtered.map(item => (
              <button
                key={item.id}
                type="button"
                className="search-result-item"
                onClick={() => handleSelect(item)}
              >
                <div className="search-result-badge">{item.category}</div>
                <div className="search-result-info">
                  <div className="search-result-title">{item.label}</div>
                  <div className="search-result-path">Jump to {item.page.toUpperCase()}</div>
                </div>
                <ChevronRight size={16} color="#94a3b8" />
              </button>
            ))
          ) : (
            <div className="search-empty-state">
              <p>No results found for "<strong>{query}</strong>"</p>
              <small>Try searching for "Modules", "Grades", "Timetable", or "Attendance".</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ onToggleSidebar, role, onLogout, profile, collapsed, page, setPage, onNavigateSettings, unreadNotifsCount = 0, scopedModule = null, lecturerModulesList = [], onSelectScopedModule }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const displayName = profile?.full_name || (role === "lecturer" ? "Lecturer" : "Student");
  const displayId = profile?.student_id || profile?.lecturer_id || (role === "lecturer" ? "Lecturer Portal" : "Student Portal");
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || (role === "lecturer" ? "LT" : "ST");

  const titles = {
    home: "",
    modules: role === "student" ? "Module Registration" : "Modules",
    timetable: "Timetable",
    attendance: "Attendance",
    assignments: "Assignments",
    grades: role === "student" ? "My Grades" : "Grade Management",
    dissertation: "Dissertation",
    messages: "Messages",
    notifications: "Notifications",
    students: "Student Directory",
    payments: "Registration Payments",
    settings: "Profile & Settings",
    admin: "System Admin"
  };

  const activeTitle = titles[page] || "";

  return (
    <>
      <QuickSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        role={role}
        setPage={setPage}
        onNavigateSettings={onNavigateSettings}
      />
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexWrap: 'wrap' }}>
          <button
            className="icon-btn sidebar-toggle-btn desktop-only"
            onClick={onToggleSidebar}
            title={collapsed ? "Expand sidebar menu" : "Toggle sidebar menu"}
            aria-label="Toggle sidebar menu"
          >
            <Menu size={20} />
          </button>

          {/* Top Left: Graduation cap + live current date and time */}
          <TopLeftCapDateTime />

          {/* Lecturer Scoped Module Switcher Pill in Topbar */}
          {role === 'lecturer' && scopedModule && (
            <div className="scoped-module-topbar-pill desktop-only" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setScopeDropdownOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#166534',
                  cursor: 'pointer'
                }}
                title="Active Teaching Module Workspace - Click to switch"
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span>Scope: <b>{scopedModule.code}</b> ({scopedModule.title})</span>
                <ChevronRight size={13} style={{ transform: scopeDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </button>
              {scopeDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    padding: '6px',
                    zIndex: 9999,
                    minWidth: '250px'
                  }}
                >
                  <div style={{ padding: '6px 8px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Switch Teaching Assignment
                  </div>
                  {(lecturerModulesList && lecturerModulesList.length ? lecturerModulesList : modules).map(m => {
                    const isSelected = scopedModule?.id === m.id || scopedModule?.code === m.code;
                    return (
                      <button
                        key={m.id || m.code}
                        type="button"
                        onClick={() => {
                          onSelectScopedModule?.(m);
                          setScopeDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: isSelected ? '#f0fdf4' : 'transparent',
                          color: isSelected ? '#166534' : '#1e293b',
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <div>{m.code} — {m.title}</div>
                          <small style={{ color: '#64748b', fontSize: '11px' }}>Year 3 • {m.studentsCount || 45} registered</small>
                        </div>
                        {isSelected && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Clean Native Mobile Header Title (hidden on home screen) */}
          {activeTitle ? (
            <div className="mobile-header-clean-title">
              <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#061626', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {activeTitle}
              </h1>
            </div>
          ) : null}
        </div>

        <div className="search desktop-only" onClick={() => setSearchOpen(true)} style={{ cursor: 'pointer' }}>
          <Search size={18}/>
          <input readOnly placeholder="Search modules, courses, or features..." style={{ cursor: 'pointer' }} />
        </div>

        <div className="top-actions">
          {/* Functional Search Icon Button for Mobile & Desktop */}
          <button
            className="icon-btn"
            title="Search"
            onClick={() => setSearchOpen(true)}
            aria-label="Search portal"
          >
            <Search size={19} />
          </button>

          <NotificationSubscribeButton compact={true} />

          <button className="icon-btn" title="Notifications" onClick={() => setPage?.("notifications")}>
            <Bell size={19}/>
            {unreadNotifsCount > 0 && (
              <span className="notif-dot">{unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}</span>
            )}
          </button>
          <button className="profile-mini" onClick={()=>setOpen(!open)} aria-label="Profile menu">
            <div className="avatar" style={{ overflow: 'hidden', padding: 0 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="profile-text desktop-only">
              <strong>{displayName}</strong>
              <span>{displayId}</span>
            </div>
            <ChevronRight size={16} className="desktop-only"/>
          </button>
          {open && <div className="profile-menu">
            <div className="profile-menu-header mobile-only" style={{ padding: '8px 10px 10px', borderBottom: '1px solid #edf2f7', marginBottom: '6px' }}>
              <strong style={{ display: 'block', fontSize: '13px', color: '#061626' }}>{displayName}</strong>
              <small style={{ fontSize: '11px', color: '#718096' }}>{displayId}</small>
            </div>
            <button onClick={() => { onNavigateSettings?.('profile'); setOpen(false); }}><User size={15}/> My Profile</button>
            <button onClick={() => { onNavigateSettings?.('security'); setOpen(false); }}><ShieldCheck size={15}/> Security & Devices</button>
            <button onClick={() => { onNavigateSettings?.('preferences'); setOpen(false); }}><Settings size={15}/> Preferences</button>
            <button onClick={() => { setOpen(false); onLogout(); }} style={{ color: '#dc2626' }}><LogOut size={15}/> Logout</button>
          </div>}
        </div>
      </header>
    </>
  );
}

function Sidebar({ role, page, setPage, open, setOpen, collapsed, setCollapsed, onLogout, profile, unreadNotifsCount = 0, unreadMessagesCount = 0 }) {
  const displayName = profile?.full_name || (role === "lecturer" ? "Lecturer" : "Student");
  const displayId = profile?.student_id || profile?.lecturer_id || (role === "lecturer" ? "Lecturer Portal" : "Student Portal");
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || (role === "lecturer" ? "LT" : "ST");

  const lecturerItems = [
    ["home","Home",Home],
    ["modules","Modules",BookOpen],
    ["timetable","Timetable",Clock3],
    ["attendance","Attendance",CalendarCheck],
    ["assignments","Assignments",ClipboardList],
    ["grades","Grades",Award],
    ["students","Students",Users],
    ["messages","Messages",MessageSquare],
    ["notifications","Notifications",Bell],
    ["settings","Profile & Settings",Settings]
  ];

  const studentItems = [
    ["home","Home",Home],
    ["modules","Module Registration",BookOpen],
    ["timetable","Timetable",Clock3],
    ["attendance","Attendance",CalendarCheck],
    ["assignments","Assignments",ClipboardList],
    ["grades","My Grades",Award],
    ["messages","Messages",MessageSquare],
    ["notifications","Notifications",Bell],
    ["payments","Tuition & Fees",CreditCard],
    ["settings","Profile & Settings",Settings]
  ];

  const items = role === 'student' ? studentItems : lecturerItems;

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      {/* Pinned Top Brand & Toggle Header */}
      <div className="sidebar-head">
        {collapsed ? (
          <button
            type="button"
            className="sidebar-logo-btn"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: '1.5px solid rgba(255,255,255,0.15)'
              }}
            >
              <GraduationCap size={22} color="#ffffff" />
            </div>
          </button>
        ) : (
          <>
            <div className="sidebar-brand">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  flexShrink: 0
                }}
              >
                <GraduationCap size={23} color="#ffffff" />
              </div>
              <div className="sidebar-brand-info">
                <span className="sidebar-brand-title">EduLink</span>
                <span className="sidebar-brand-subtitle">
                  {role === 'student' ? 'Student Portal' : 'Lecturer Portal'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

              {/* Mobile Close Button */}
              <button
                type="button"
                className="icon-btn sidebar-close-btn mobile-only"
                onClick={() => setOpen(false)}
                title="Close menu"
                aria-label="Close menu"
              >
                <X size={19} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Drawer User Profile Summary */}
      <div className="mobile-drawer-user mobile-only" style={{ display: 'none', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px', marginBottom: '10px' }}>
        <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '13px' }}>{initials}</div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <strong style={{ color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</strong>
          <span style={{ color: '#93b3d4', fontSize: '11px' }}>{displayId}</span>
        </div>
      </div>

      {/* Scrollable Navigation Menu List */}
      <nav className="sidebar-nav">
        {items.map(([id, label, Icon]) => {
          const isActive = page === id;
          return (
            <button
              key={id}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => {
                setPage(id);
                setOpen(false);
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} className="nav-icon" />
              {!collapsed && <span>{label}</span>}
              {id === "messages" && unreadMessagesCount > 0 && (
                <b className="nav-badge">{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</b>
              )}
              {id === "notifications" && unreadNotifsCount > 0 && (
                <b className="nav-badge">{unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}</b>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pinned Bottom Footer Area */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="secure-box">
            <ShieldCheck size={20} />
            <div>
              <strong>Account secure</strong>
              <span>Registered device active</span>
            </div>
          </div>
        ) : (
          <div className="secure-box collapsed" title="Account secure • Registered device active">
            <ShieldCheck size={20} />
          </div>
        )}
      </div>
    </aside>
  );
}

function BottomNav({ page, setPage, role, profile, onNavigateSettings, unreadNotifsCount = 0, unreadMessagesCount = 0 }) {
  const isDissertationStudent = role === 'student' && (
    profile?.registration_type === 'dissertation' ||
    profile?.student_type === 'dissertation' ||
    profile?.is_dissertation === true ||
    String(profile?.registration_type || '').toLowerCase().includes('dissert')
  );

  const msgBadge = unreadMessagesCount > 0 ? (unreadMessagesCount > 99 ? '99+' : unreadMessagesCount) : null;

  // Student: Home | Assignments | Grades | Messages | Profile (5 clean spaced dock buttons)
  const studentItems = [
    ["home", "Home", Home],
    ["assignments", "Assignments", ClipboardList],
    ["grades", "Grades", Award],
    ["messages", "Messages", MessageSquare, msgBadge],
    ["settings", "Profile", User]
  ];

  // Dissertation student: Home | Dissertation | Grades | Messages | Profile
  const dissertationStudentItems = [
    ["home", "Home", Home],
    ["dissertation", "Dissertation", FileText],
    ["grades", "Grades", Award],
    ["messages", "Messages", MessageSquare, msgBadge],
    ["settings", "Profile", User]
  ];

  // Lecturer: Home | Modules | Grades | Messages | Profile
  const lecturerItems = [
    ["home", "Home", Home],
    ["modules", "Modules", BookOpen],
    ["grades", "Grades", Award],
    ["messages", "Messages", MessageSquare, msgBadge],
    ["settings", "Profile", User]
  ];

  const items = role === 'lecturer'
    ? lecturerItems
    : (isDissertationStudent ? dissertationStudentItems : studentItems);

  const handleTabClick = (id) => {
    if (id === 'settings' || id === 'profile') {
      if (onNavigateSettings) {
        onNavigateSettings('profile');
      } else {
        setPage('settings');
      }
    } else {
      setPage(id);
    }
  };

  return (
    <nav className="bottom-nav" aria-label="Mobile Bottom Navigation">
      {items.map(([id, label, Icon, badge]) => {
        const isActive = page === id || ((id === 'settings' || id === 'profile') && (page === 'settings' || page === 'profile'));
        return (
          <button
            key={id}
            type="button"
            className={`bottom-tab ${isActive ? "active" : ""}`}
            onClick={() => handleTabClick(id)}
            aria-label={label}
          >
            <div className="bottom-tab-icon-wrap">
              <Icon size={20} className="bottom-tab-icon" />
              {badge && <span className="bottom-tab-badge">{badge}</span>}
            </div>
            <span className="bottom-tab-label">{label}</span>
            {isActive && <div className="bottom-tab-indicator" />}
          </button>
        );
      })}
    </nav>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("EduLink ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', margin: '24px auto', maxWidth: '540px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '26px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Something went wrong</h3>
          <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.5, margin: '0 auto 20px' }}>
            {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13.5px' }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13.5px' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Stat({ icon:Icon, title, value, sub }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={21}/></div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>
}

function Dashboard({ setPage, profile, scopedModule, onSelectScopedModule, modulesList = [] }) {
  const activeTeachingModules = modulesList && modulesList.length > 0 ? modulesList : [
    {
      id: 'ea906b5e-be88-41e8-9cb3-aca4128247f8',
      code: 'BSCS411',
      title: 'Oracle',
      level: 3,
      semester: 'First Semester',
      studentsCount: 45
    },
    {
      id: 'mod-bscs-412-cpp',
      code: 'BSCS412',
      title: 'C++',
      level: 3,
      semester: 'First Semester',
      studentsCount: 45
    }
  ];

  const currentScoped = scopedModule || activeTeachingModules[0];
  const lecturerName = profile?.full_name || 'Peter Saffa';
  const lecturerId = profile?.lecturer_id || 'LECT-2026-790380';
  const departmentName = profile?.department || profile?.teaching_area || 'Department of Computer Science';

  return (
    <div className="page">
      <div className="welcome">
        <div>
          <p className="eyebrow">{lecturerId} • {departmentName}</p>
          <h1>{getTimeBasedGreeting(lecturerName)}</h1>
          <p>Teaching workspace for Level 3 Computer Science degree programmes.</p>
        </div>
        <div className="date-chip">Academic Year 2026/2027<br /><strong>First Semester</strong></div>
      </div>

      {/* My Teaching Modules Section */}
      <section className="my-teaching-modules-section" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              My Teaching Modules
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
              Computer Science Level 3. Select a module to scope all app features.
            </p>
          </div>
          <button
            type="button"
            className="outline-btn"
            style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setPage('modules')}
          >
            <Layers size={15} /> All Catalogue Modules
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {activeTeachingModules.map(m => {
            const isScoped = currentScoped?.id === m.id || currentScoped?.code?.replace(/\s+/g, '').toUpperCase() === m.code?.replace(/\s+/g, '').toUpperCase();
            const isOracle = m.code?.toLowerCase().includes('411') || m.title?.toLowerCase().includes('oracle');

            return (
              <div
                key={m.id || m.code}
                onClick={() => onSelectScopedModule?.(m)}
                style={{
                  background: '#ffffff',
                  border: isScoped ? '2.5px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: isScoped ? '0 10px 25px rgba(2, 132, 199, 0.16)' : '0 4px 12px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative'
                }}
              >
                {isScoped && (
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    ACTIVE SCOPE
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                  {/* Module Logo */}
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '14px',
                      background: isOracle
                        ? 'linear-gradient(135deg, #ea580c, #c2410c)'
                        : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '17px',
                      flexShrink: 0,
                      boxShadow: isOracle ? '0 6px 16px rgba(234, 88, 12, 0.3)' : '0 6px 16px rgba(37, 99, 235, 0.3)',
                      letterSpacing: '-0.5px'
                    }}
                  >
                    {isOracle ? 'ORA' : 'C++'}
                  </div>

                  <div style={{ minWidth: 0, flex: 1, paddingRight: isScoped ? '110px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: isOracle ? '#c2410c' : '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {m.code}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                      {m.title}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                      Year 3. {m.studentsCount || 45} student base on module registered
                    </p>
                  </div>
                </div>

                {/* Scoped Actions Toolbar */}
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  marginTop: '10px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ fontSize: '11.5px', padding: '5px 10px', height: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScopedModule?.(m);
                        setPage('attendance');
                      }}
                    >
                      <CalendarCheck size={13} /> Attendance
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ fontSize: '11.5px', padding: '5px 10px', height: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScopedModule?.(m);
                        setPage('assignments');
                      }}
                    >
                      <ClipboardList size={13} /> Assignments
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ fontSize: '11.5px', padding: '5px 10px', height: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScopedModule?.(m);
                        setPage('grades');
                      }}
                    >
                      <Award size={13} /> Grades
                    </button>
                    <button
                      type="button"
                      className="outline-btn"
                      style={{ fontSize: '11.5px', padding: '5px 10px', height: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectScopedModule?.(m);
                        setPage('students');
                      }}
                    >
                      <Users size={13} /> 45 Students
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: '700', color: isScoped ? '#0284c7' : '#64748b' }}>
                    {isScoped ? 'Active Workspace ✓' : 'Click to Scope →'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="stats-grid">
        <Stat icon={Users} title="Total Students" value="90" sub="45 per module (2 modules)" />
        <Stat icon={BookOpen} title="Teaching Assignments" value="2" sub="Bscs 411 & Bscs 412" />
        <Stat icon={ClipboardList} title="Active Scope" value={currentScoped?.code || 'Bscs 411'} sub={currentScoped?.title || 'Oracle'} />
        <Stat icon={Award} title="Programme Level" value="Year 3" sub="Computer Science BSC" />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <h2><CalendarCheck /> Recent Attendance ({currentScoped?.code || 'Bscs 411'})</h2>
            <button className="text-btn" onClick={() => setPage("attendance")}>Manage Attendance</button>
          </div>
          {[
            `Today • ${currentScoped?.code || 'Bscs 411'} • 43/45 Present`,
            `Yesterday • ${currentScoped?.code || 'Bscs 411'} • 44/45 Present`,
            `2 days ago • ${currentScoped?.code || 'Bscs 411'} • 45/45 Present`
          ].map(x => (
            <div className="simple-row" key={x}>
              <span>{x}</span>
              <b className="status success">Completed</b>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2><ClipboardList /> Assignment Submissions</h2>
            <button className="text-btn" onClick={() => setPage("assignments")}>View All</button>
          </div>
          {activeTeachingModules.map((m, i) => (
            <div className="simple-row" key={m.code}>
              <span>{m.code} — {m.title}</span>
              <span>42/45 submissions</span>
              <b className="badge">{38 + i} Graded</b>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function Modules({ setPage }) {
  return <div className="page"><PageTitle title="My Modules" subtitle="Modules assigned to you and their students." action="+ Create Module"/>
    <div className="cards-grid">{modules.map(m=><div className="module-card" key={m.code}><div className="card-top"><div className="module-code">{m.code}</div><button className="icon-btn"><MoreHorizontal/></button></div><h3>{m.title}</h3><span>{m.level}</span><div className="module-card-meta"><span><Users size={16}/> {m.students} students</span><span><CalendarCheck size={16}/> 3 classes/week</span></div><button className="primary-btn small-btn" onClick={()=>setPage("students")}>View Class</button></div>)}</div>
  </div>
}

function Students() {
  const students=[["8100","Peter Saffa","Computer Science","Year 3"],["8124","Ibrahim S.","Computer Science","Year 3"],["8151","Mariama K.","Information Systems","Year 2"],["8170","Abdul K.","Computer Science","Year 3"],["8192","Fatmata J.","Software Engineering","Year 3"]];
  return <div className="page"><PageTitle title="Class List" subtitle="Students automatically allocated through registered modules."/><div className="panel"><div className="filter-row"><div className="search inline"><Search size={17}/><input placeholder="Search student ID or name"/></div><button className="outline-btn">Filter Module</button></div><div className="student-list">{students.map(s=><div className="student-row" key={s[0]}><div className="avatar">{s[1].split(" ").map(n=>n[0]).join("").slice(0,2)}</div><div><strong>{s[1]}</strong><span>{s[0]} • {s[2]} • {s[3]}</span></div><button className="icon-btn"><ChevronRight/></button></div>)}</div></div></div>
}

function Attendance({ role, onNavigate, scopedModule }) {
  if (role === 'student') {
    return <StudentAttendance />;
  }
  return <AttendanceManagementV39 onNavigate={onNavigate} scopedModule={scopedModule} />;
}

function Assignments({ role, onNavigate, scopedModule }) {
  return <AssignmentManagementV40 role={role} onNavigate={onNavigate} scopedModule={scopedModule} />;
}

function Grades() {
  return <div className="page"><PageTitle title="Grades" subtitle="Enter and publish module results." action="Enter Grades"/><div className="panel"><div className="filter-row"><button className="outline-btn">CSOR 224 ▾</button><button className="outline-btn">Semester 1 ▾</button></div><div className="grade-table">{[["8100","Peter Saffa","82"],["8124","Ibrahim S.","76"],["8151","Mariama K.","88"],["8170","Abdul K.","69"]].map(s=><div className="grade-row" key={s[0]}><span>{s[0]}</span><strong>{s[1]}</strong><input defaultValue={s[2]}/><button className="outline-btn">Save</button></div>)}</div></div></div>
}

function Dissertation() {
  return <div className="page"><PageTitle title="Dissertation Supervision" subtitle="Review proposals, chapters, corrections and final submissions." action="+ New Student"/><div className="cards-grid">{[["Peter Saffa","Web-Based Academic Management System","Chapter 3","2 pending comments"],["Mariama K.","PWA Attendance System","Proposal","Awaiting review"],["Ibrahim S.","Payroll Management System","Chapter 4","1 correction"]].map(d=><div className="module-card" key={d[0]}><div className="avatar large">{d[0].split(" ").map(n=>n[0]).join("")}</div><h3>{d[0]}</h3><p>{d[1]}</p><span className="status info">{d[2]}</span><div className="module-card-meta"><span><FileText size={16}/> {d[3]}</span></div><button className="primary-btn small-btn"><Eye size={17}/> Review Documents</button></div>)}</div></div>
}

function Messages() { return <div className="page"><PageTitle title="Messages" subtitle="Communicate with your students." action="New Message"/><div className="panel">{["Peter Saffa","Mariama K.","Ibrahim S.","MMTU Academic Office"].map((n,i)=><div className="student-row" key={n}><div className="avatar">{n.split(" ").map(x=>x[0]).join("").slice(0,2)}</div><div><strong>{n}</strong><span>{i===0?"Can you review my latest submission?":"New message • Today"}</span></div><ChevronRight/></div>)}</div></div> }
function Generic({title}) { return <div className="page"><PageTitle title={title} subtitle="This section is included in the mobile PWA navigation and is ready for the next implementation stage."/><div className="empty-state"><div className="empty-icon"><Settings/></div><h2>{title}</h2><p>Connect this screen to Supabase data and permissions in the next stage.</p></div></div> }

function PageTitle({title,subtitle,action}) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="primary-btn"><Plus size={18}/>{action}</button>}</div> }

function AppShell({role,onLogout,profile,onProfileUpdate}) {
  const [page,setPage]=useState("home");
  const [settingsTab, setSettingsTab] = useState("profile");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const [scopedModule, setScopedModule] = useState(() => {
    try {
      const saved = localStorage.getItem('edulink_scoped_module_data');
      return saved ? JSON.parse(saved) : modules[0];
    } catch { return modules[0]; }
  });
  const [lecturerModulesList, setLecturerModulesList] = useState(modules);

  React.useEffect(() => {
    if (role === 'lecturer') {
      import('./services/modules.js').then(({ getMyModules }) => {
        getMyModules().then(res => {
          const list = res.modules || [];
          if (list.length > 0) {
            setLecturerModulesList(list);
            const savedId = localStorage.getItem('edulink_scoped_module_id');
            const match = savedId ? list.find(m => m.id === savedId || m.code === savedId) : null;
            const chosen = match || list[0];
            setScopedModule(chosen);
            try { localStorage.setItem('edulink_scoped_module_data', JSON.stringify(chosen)); } catch {}
          }
        }).catch(console.warn);
      });
    }
  }, [role]);

  const handleSelectScopedModule = (mod) => {
    setScopedModule(mod);
    try {
      localStorage.setItem('edulink_scoped_module_id', mod.id || mod.code);
      localStorage.setItem('edulink_scoped_module_data', JSON.stringify(mod));
    } catch {}
  };

  const refreshCounts = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const counts = await fetchLiveUnreadCounts(user.id);
        setUnreadNotifsCount(counts.notifications);
        setUnreadMessagesCount(counts.messages);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  React.useEffect(() => {
    let cleanup = () => {};
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        cleanup = initLiveNotificationListener(
          user.id,
          () => {
            setUnreadNotifsCount(prev => prev + 1);
          },
          () => {
            refreshCounts();
          }
        );
      }
    });

    return () => cleanup();
  }, [refreshCounts]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setSidebarOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  };

  const navigateToSettings = (tab = 'profile') => {
    setSettingsTab(tab);
    setPage("settings");
  };

  let content;
  if (page==="home") content = role === "student" ? <StudentDashboardV36 onNavigate={setPage} profile={profile}/> : <Dashboard setPage={setPage} profile={profile} scopedModule={scopedModule} onSelectScopedModule={handleSelectScopedModule} modulesList={lecturerModulesList}/>;
  else if (page==="modules") content = role==="student" ? <ModuleRegistrationV47/> : <ModuleManagement setPage={setPage} scopedModule={scopedModule} onSelectScopedModule={handleSelectScopedModule} />;
  else if (page==="timetable") content = <TimetableManagementV43 role={role} scopedModule={scopedModule}/>;
  else if (page==="attendance") content = <Attendance role={role} onNavigate={setPage} scopedModule={scopedModule}/>;
  else if (page==="assignments") content = <Assignments role={role} onNavigate={setPage} scopedModule={scopedModule}/>;
  else if (page==="grades") content = role === "student" ? <StudentGradeInbox /> : <GradeManagementV41 scopedModule={scopedModule}/>;
  else if (page==="dissertation") content = <DissertationManagementV42 role={role}/>;
  else if (page==="messages") content = <MessagingCenterV44 role={role} profile={profile} onNavigate={setPage}/>;
  else if (page==="notifications") content = <NotificationsCenterV45 onNavigate={setPage}/>;
  else if (page==="students") content = role==="lecturer" ? <StudentManagementV48 scopedModule={scopedModule}/> : <Students/>;
  else if (page==="payments") content = <PaymentCenterV46/>;
  else if (page==="settings" || page==="profile") content = (
    <ProfileSecurityCenterV49
      role={role}
      profile={profile}
      defaultTab={settingsTab || "profile"}
      onProfileUpdate={onProfileUpdate}
    />
  );
  else if (page==="admin") content = <AdminOperationsV50/>;
  else content = <Generic title={page[0].toUpperCase()+page.slice(1)}/>;

  return (
    <div className="app-shell">
      <LiveNotificationToast onNavigate={setPage} />
      <NotificationSubscribeButton floating={true} />
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        role={role}
        page={page}
        setPage={(newPage) => {
          if (newPage === "settings" || newPage === "profile") setSettingsTab("profile");
          setPage(newPage);
        }}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogout={onLogout}
        profile={profile}
        unreadNotifsCount={unreadNotifsCount}
        unreadMessagesCount={unreadMessagesCount}
      />
      <div className={`main ${collapsed ? 'collapsed' : ''}`}>
        <Header
          onToggleSidebar={handleToggleSidebar}
          role={role}
          onLogout={onLogout}
          profile={profile}
          collapsed={collapsed}
          page={page}
          setPage={setPage}
          onNavigateSettings={navigateToSettings}
          unreadNotifsCount={unreadNotifsCount}
          scopedModule={scopedModule}
          lecturerModulesList={lecturerModulesList}
          onSelectScopedModule={handleSelectScopedModule}
        />
        <main className="app-main-content">
          <ErrorBoundary key={page}>
            <Suspense fallback={<div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', color: '#64748b' }}>Loading content...</div>}>
              {content}
            </Suspense>
          </ErrorBoundary>
        </main>
        <BottomNav
          page={page}
          setPage={setPage}
          role={role}
          profile={profile}
          onNavigateSettings={navigateToSettings}
          unreadNotifsCount={unreadNotifsCount}
          unreadMessagesCount={unreadMessagesCount}
        />
      </div>
    </div>
  );
}

export default function App(){
  const [sessionState, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccessMode, setPaymentSuccessMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    return path.includes('payment-success') || search.has('session_id') || search.has('sessionId');
  });
  const [resetPasswordMode, setResetPasswordMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return path.includes('reset-password') || hash.includes('type=recovery') || search.includes('type=recovery');
  });
  const [forceAuthScreen, setForceAuthScreen] = useState(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        // If recovery token or route is reset-password, enter resetPasswordMode directly
        if (
          window.location.pathname.includes('reset-password') ||
          window.location.hash.includes('type=recovery') ||
          window.location.search.includes('type=recovery')
        ) {
          if (mounted) {
            setResetPasswordMode(true);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn('Supabase getSession warning:', error.message);
        if (!mounted) return;
        if (data?.session) {
          const user = data.session.user;
          const savedRole = localStorage.getItem('academic_active_role') || user.user_metadata?.role;
          let resolvedRole = savedRole;
          let userProfile = null;

          // If active role is lecturer, check lecturers table first
          if (savedRole === 'lecturer') {
            const { data: lecturerRecord } = await supabase
              .from('lecturers')
              .select('*')
              .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
              .maybeSingle();

            if (lecturerRecord) {
              resolvedRole = 'lecturer';
              const savedAvatar = user.user_metadata?.avatar_url ||
                (lecturerRecord.id && localStorage.getItem(`edulink_avatar_${lecturerRecord.id}`)) ||
                localStorage.getItem(`edulink_avatar_${user.id}`) ||
                localStorage.getItem('edulink_active_avatar') ||
                lecturerRecord.avatar_url ||
                null;
              userProfile = {
                ...lecturerRecord,
                avatar_url: savedAvatar || lecturerRecord.avatar_url || null,
                role: 'lecturer'
              };
              if (!lecturerRecord.auth_user_id) {
                supabase.from('lecturers').update({ auth_user_id: user.id }).eq('id', lecturerRecord.id).then(null, () => {});
              }
            }
          }

          // If not found yet or savedRole is student, check students table
          if (!userProfile) {
            const { data: studentRecord } = await supabase
              .from('students')
              .select('*')
              .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
              .maybeSingle();

            if (studentRecord) {
              resolvedRole = 'student';
              const savedAvatar = user.user_metadata?.avatar_url ||
                (studentRecord.id && localStorage.getItem(`edulink_avatar_${studentRecord.id}`)) ||
                localStorage.getItem(`edulink_avatar_${user.id}`) ||
                localStorage.getItem('edulink_active_avatar') ||
                studentRecord.avatar_url ||
                null;
              userProfile = {
                ...studentRecord,
                avatar_url: savedAvatar || studentRecord.avatar_url || null,
                role: 'student'
              };
              if (!studentRecord.auth_user_id) {
                supabase.from('students').update({ auth_user_id: user.id }).eq('id', studentRecord.id).then(null, () => {});
              }
            }
          }

          // Fallback to check lecturers if user profile still not found
          if (!userProfile && resolvedRole !== 'lecturer') {
            const { data: lecturerRecord } = await supabase
              .from('lecturers')
              .select('*')
              .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
              .maybeSingle();

            if (lecturerRecord) {
              resolvedRole = 'lecturer';
              const savedAvatar = user.user_metadata?.avatar_url ||
                (lecturerRecord.id && localStorage.getItem(`edulink_avatar_${lecturerRecord.id}`)) ||
                localStorage.getItem(`edulink_avatar_${user.id}`) ||
                localStorage.getItem('edulink_active_avatar') ||
                lecturerRecord.avatar_url ||
                null;
              userProfile = {
                ...lecturerRecord,
                avatar_url: savedAvatar || lecturerRecord.avatar_url || null,
                role: 'lecturer'
              };
              if (!lecturerRecord.auth_user_id) {
                supabase.from('lecturers').update({ auth_user_id: user.id }).eq('id', lecturerRecord.id).then(null, () => {});
              }
            }
          }

          if (!resolvedRole) resolvedRole = user.user_metadata?.role || 'student';
          if (!userProfile) {
            const savedAvatar = user.user_metadata?.avatar_url ||
              localStorage.getItem(`edulink_avatar_${user.id}`) ||
              localStorage.getItem('edulink_active_avatar') ||
              null;
            userProfile = {
              auth_user_id: user.id,
              email: user.email,
              role: resolvedRole,
              full_name: user.user_metadata?.full_name || (resolvedRole === 'student' ? 'Student' : 'Lecturer'),
              student_id: user.user_metadata?.student_id || (resolvedRole === 'student' ? '8100' : undefined),
              lecturer_id: user.user_metadata?.lecturer_id || (resolvedRole === 'lecturer' ? 'LECT-2026-0001' : undefined),
              avatar_url: savedAvatar
            };
          }

          const device = await verifyCurrentDevice({ role: resolvedRole }).catch(() => ({ registered: false }));
          if (device.registered && mounted) {
            setSessionState({ role: resolvedRole, profile: userProfile });
            setOneSignalUser(userProfile, resolvedRole).catch(() => {});
            if (user.user_metadata?.requires_password_change || userProfile?.requires_password_change || userProfile?.temporary_password) {
              setShowPasswordChangeModal(true);
            }
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (mounted) setResetPasswordMode(true);
      }
      if (!session && mounted) {
        setSessionState(null);
        clearOneSignalUser().catch(() => {});
        localStorage.removeItem('academic_active_role');
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function logout() {
    try {
      await signOut();
    } finally {
      clearOneSignalUser().catch(() => {});
      localStorage.removeItem('academic_active_role');
      setSessionState(null);
      setShowPasswordChangeModal(false);
    }
  }

  const handleAuthenticated = (data) => {
    if (data?.role) {
      localStorage.setItem('academic_active_role', data.role);
    }
    const profile = data?.profile || {};
    const avatar = profile.avatar_url ||
      data?.session?.user?.user_metadata?.avatar_url ||
      (profile.id && localStorage.getItem(`edulink_avatar_${profile.id}`)) ||
      (profile.student_id && localStorage.getItem(`edulink_avatar_${profile.student_id}`)) ||
      (profile.lecturer_id && localStorage.getItem(`edulink_avatar_${profile.lecturer_id}`)) ||
      (data?.session?.user?.id && localStorage.getItem(`edulink_avatar_${data.session.user.id}`)) ||
      localStorage.getItem('edulink_active_avatar') ||
      null;

    if (avatar) {
      try {
        localStorage.setItem('edulink_active_avatar', avatar);
        if (profile.id) localStorage.setItem(`edulink_avatar_${profile.id}`, avatar);
        if (profile.student_id) localStorage.setItem(`edulink_avatar_${profile.student_id}`, avatar);
        if (profile.lecturer_id) localStorage.setItem(`edulink_avatar_${profile.lecturer_id}`, avatar);
      } catch (e) {}
    }

    setOneSignalUser(profile, data?.role).catch(() => {});

    setSessionState({
      ...data,
      profile: {
        ...profile,
        avatar_url: avatar
      }
    });
    if (data?.profile?.requires_password_change || data?.profile?.temporary_password || data?.session?.user?.user_metadata?.requires_password_change) {
      setShowPasswordChangeModal(true);
    }
  };

  if (resetPasswordMode) {
    return (
      <Suspense fallback={<main className="auth-screen"><section className="auth-card"><div className="loading-panel">Loading password reset…</div></section></main>}>
        <ResetPasswordScreen
          onComplete={() => {
            setResetPasswordMode(false);
            try {
              window.history.replaceState({}, '', window.location.pathname.replace(/\/reset-password\/?$/, '') || '/');
            } catch (e) {}
            setForceAuthScreen({ screen: 'login', role: 'student' });
          }}
          onCancel={() => {
            setResetPasswordMode(false);
            try {
              window.history.replaceState({}, '', window.location.pathname.replace(/\/reset-password\/?$/, '') || '/');
            } catch (e) {}
            setForceAuthScreen({ screen: 'login', role: 'student' });
          }}
        />
      </Suspense>
    );
  }

  if (paymentSuccessMode) {
    return (
      <Suspense fallback={<main className="auth-screen"><section className="auth-card"><Logo/><div className="loading-panel">Loading...</div></section></main>}>
        <PaymentSuccess
          onProceedToLogin={({ studentId } = {}) => {
            setPaymentSuccessMode(false);
            try {
              window.history.replaceState({}, '', window.location.pathname.replace(/\/payment-success\/?$/, '') || '/');
            } catch (e) {}
            setForceAuthScreen({ screen: 'login', role: 'student', studentId: studentId || '' });
          }}
        />
      </Suspense>
    );
  }

  if (loading) return <main className="auth-screen"><section className="auth-card"><Logo/><div className="loading-panel">Checking secure session…</div></section></main>;
  if (!sessionState) {
    if (showOnboarding) {
      return (
        <Suspense fallback={<main className="auth-screen"><div className="loading-panel">Loading EduLink…</div></main>}>
          <OnboardingScreen
            onFinish={() => setShowOnboarding(false)}
          />
        </Suspense>
      );
    }
    return (
      <Auth
        onAuthenticated={handleAuthenticated}
        initialScreen={forceAuthScreen?.screen || 'gateway'}
        initialRole={forceAuthScreen?.role || 'student'}
        initialStudentId={forceAuthScreen?.studentId || ''}
        onShowOnboarding={() => setShowOnboarding(true)}
      />
    );
  }

  // Strict payment gate: unpaid students cannot access dashboard, modules, attendance or grades
  if (
    sessionState.role === 'student' &&
    sessionState.profile &&
    sessionState.profile.account_status &&
    sessionState.profile.account_status !== 'active'
  ) {
    return (
      <Suspense fallback={<main className="auth-screen"><section className="auth-card"><Logo/><div className="loading-panel">Loading payment gateway…</div></section></main>}>
        <PaymentGate
          profile={sessionState.profile}
          onActivated={(updatedProfile) => {
            setSessionState(prev => ({
              ...prev,
              profile: { ...prev.profile, ...updatedProfile, account_status: 'active' }
            }));
          }}
          onLogout={logout}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<main className="auth-screen"><section className="auth-card"><Logo/><div className="loading-panel">Loading portal…</div></section></main>}>
      {showPasswordChangeModal && (
        <SetPermanentPasswordModal
          profile={sessionState.profile}
          onComplete={() => {
            setShowPasswordChangeModal(false);
            setSessionState(prev => ({
              ...prev,
              profile: {
                ...prev.profile,
                requires_password_change: false,
                temporary_password: false
              }
            }));
          }}
        />
      )}
      <AppShell
        role={sessionState.role}
        onLogout={logout}
        profile={sessionState.profile}
        onProfileUpdate={(updatedProfile) => {
          setSessionState(prev => ({
            ...prev,
            profile: { ...prev.profile, ...updatedProfile }
          }));
        }}
      />
    </Suspense>
  );
}

export function V5AuthActions({ role, mode, form, onSuccess, onError }) {
  const run = async () => {
    try {
      let result;
      if (mode === 'login') {
        result = await signInById({ role, id: form.id, password: form.password });
      } else if (role === 'student') {
        result = await signUpStudent(form);
      } else {
        result = await signUpLecturer(form);
      }
      onSuccess?.(result);
    } catch (error) {
      onError?.(error);
    }
  };
  return run;
}
