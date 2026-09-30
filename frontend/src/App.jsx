import React, { useState, lazy, Suspense } from "react";
import { signInById, signUpStudent, signUpLecturer, signOut } from './services/auth';
import { supabase } from './services/supabase';
import { verifyCurrentDevice, registerCurrentDevice } from './services/device';
import { requestPasswordRecovery } from './services/recovery';
import { openRegistrationCheckout, registerStudentApplicantAndCheckout } from './services/payment';
import LiveNotificationToast from './components/LiveNotificationToast';
import { initLiveNotificationListener, fetchLiveUnreadCounts } from './services/liveNotificationService';

const PaymentSuccess = lazy(() => import('./components/PaymentSuccess'));
const PaymentCheckout = lazy(() => import('./components/PaymentCheckout'));
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
import './v39-attendance.css';
import './v15-attendance.css';
import './v40-assignments.css';
import './v41-to-v55-master.css';
import {
  CAMPUSES,
  getFacultiesByCampusId,
  getDepartmentsByCampusAndFaculty,
  getProgrammesByCampusAndFaculty,
  getModulesByCampusAndFaculty,
  getModulesByCampusFacultyDept
} from './data/academicCatalogue.js';
import {
  Bell, BookOpen, CalendarCheck, ChevronRight, ClipboardList, FileText,
  GraduationCap, Home, LockKeyhole, LogOut, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, User, Users,
  X, MapPin, Clock3, Award, Upload, Eye, KeyRound, CreditCard, Activity,
  ChevronLeft, PanelLeftClose, PanelLeftOpen
} from "lucide-react";

const modules = [
  { code: "CSOR 224", title: "Operations Research", students: 22, level: "Level 3" },
  { code: "C++ 101", title: "C++ Programming", students: 18, level: "Level 2" },
  { code: "CS 302", title: "Distributed & Concurrent Systems", students: 20, level: "Level 3" },
  { code: "CS 401", title: "Research Methods in Software Engineering", students: 26, level: "Level 4" }
];

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

function Auth({ onAuthenticated, initialScreen = 'login', initialRole = 'student', initialStudentId = '' }) {
  const [role, setRole] = useState(initialRole);
  const [screen, setScreen] = useState(initialScreen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deviceRequired, setDeviceRequired] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [form, setForm] = useState({
    id: initialStudentId || '', password:'', confirmPassword:'', email:'', fullName:'', studentId: initialStudentId || '', phone:'',
    facultyId:'', departmentId:'', programmeId:'', programme:'', level:'3',
    academicYear:'2026/2027', semester:'First Semester', campus:'goderich', registrationType:'normal',
    modules:[], teachingArea:'', deviceName:''
  });

  React.useEffect(() => {
    if (initialStudentId) {
      setForm(f => ({ ...f, id: initialStudentId, studentId: initialStudentId }));
    }
  }, [initialStudentId]);

  React.useEffect(() => {
    if (initialScreen) setScreen(initialScreen);
    if (initialRole) setRole(initialRole);
  }, [initialScreen, initialRole]);

  const update = (key, value) => setForm(f => ({...f, [key]: value}));
  const resetState = () => { setError(''); setMessage(''); setDeviceRequired(false); };

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
            throw new Error('Access denied: This account is already bound to another registered device (One device per account policy). To change devices, contact the university administrator.');
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
        if (!form.campus || !form.facultyId || !form.departmentId) {
          throw new Error('Please select your Campus, Faculty, and Department.');
        }
        await registerStudentApplicantAndCheckout(form);
        setForm(f => ({...f, id: form.studentId}));
        setScreen('checkout');
      } else {
        if (!form.email || !form.password || form.password.length < 8) {
          throw new Error('Use a valid email and a password of at least 8 characters.');
        }
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter your password.');
        }
        if (!form.facultyId || !form.departmentId) {
          throw new Error('Please select both a Faculty and a Department.');
        }
        const result = await signUpLecturer(form);
        setForm(f => ({...f, id: result.lecturerId}));
        setMessage(result.session ? `Account created. Your Lecturer ID is ${result.lecturerId}.` : `Account created. Your Lecturer ID is ${result.lecturerId}. Verify your email, then log in.`);
        setScreen('registered');
      }
    } catch (err) { setError(err.message || 'Registration failed.'); }
    finally { setBusy(false); }
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

  if (screen === 'checkout') {
    return (
      <PaymentCheckout
        applicant={form}
        onPaymentCompleted={(result) => {
          setPaymentResult(result);
          setScreen('payment-success');
        }}
        onCancel={() => setScreen('register')}
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
      {role === 'lecturer' && <div className="registration-summary"><span>Your Lecturer ID</span><strong>{form.id}</strong></div>}
      {role === 'student' && <button className="primary-btn full-btn" disabled={busy} onClick={continuePayment}>{busy ? 'Opening payment…' : 'Continue to Monime Payment'}</button>}
      <button className="outline-btn full-btn" onClick={()=>{resetState();setScreen('login')}}>Go to Login</button>
    </div>{error && <div className="error-box">{error}</div>}
  </section></main>;


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
            <label>Faculty</label>
            <select
              value={form.facultyId}
              onChange={e => {
                const facId = e.target.value;
                update('facultyId', facId);
                update('departmentId', '');
                update('teachingArea', '');
                update('modules', []);
              }}
              required
              disabled={!form.campus}
            >
              <option value="">{form.campus ? 'Select Faculty' : 'Select Campus First'}</option>
              {getFacultiesByCampusId(form.campus).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Department</label>
            <select
              value={form.departmentId}
              onChange={e => {
                const deptId = e.target.value;
                const depts = getDepartmentsByCampusAndFaculty(form.campus, form.facultyId);
                const dept = depts.find(d => d.id === deptId);
                update('departmentId', deptId);
                update('teachingArea', dept ? dept.name : '');
                update('modules', []);
              }}
              required
              disabled={!form.facultyId}
            >
              <option value="">{form.facultyId ? 'Select Department' : 'Select Faculty First'}</option>
              {getDepartmentsByCampusAndFaculty(form.campus, form.facultyId).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
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
          <div className="full-span">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Department Module(s) Teaching</label>
              {form.departmentId && (
                <span style={{ fontSize: '11px', color: '#0a2540', fontWeight: 600 }}>
                  {form.modules.length} selected
                </span>
              )}
            </div>
            {!form.departmentId ? (
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Please select a Campus, Faculty, and Department above to see teaching modules.
              </div>
            ) : (
              <div className="module-select-grid">
                {getModulesByCampusFacultyDept(form.campus, form.facultyId, form.departmentId).map(m => (
                  <label className="module-check" key={m.code}>
                    <input
                      type="checkbox"
                      checked={form.modules.includes(m.code)}
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
                    </span>
                  </label>
                ))}
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
                update('programme', '');
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
            <label>Faculty</label>
            <select
              value={form.facultyId}
              onChange={e => {
                const facId = e.target.value;
                update('facultyId', facId);
                update('departmentId', '');
                update('programme', '');
                update('modules', []);
              }}
              required
              disabled={!form.campus}
            >
              <option value="">{form.campus ? 'Select Faculty' : 'Select Campus First'}</option>
              {getFacultiesByCampusId(form.campus).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Department</label>
            <select
              value={form.departmentId}
              onChange={e => update('departmentId', e.target.value)}
              required
              disabled={!form.facultyId}
            >
              <option value="">{form.facultyId ? 'Select Department' : 'Select Faculty First'}</option>
              {getDepartmentsByCampusAndFaculty(form.campus, form.facultyId).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Programme</label>
            <select
              value={form.programme}
              onChange={e => update('programme', e.target.value)}
              required
              disabled={!form.facultyId}
            >
              <option value="">{form.facultyId ? 'Select Programme' : 'Select Faculty First'}</option>
              {getProgrammesByCampusAndFaculty(form.campus, form.facultyId).map((prog, idx) => (
                <option key={idx} value={prog}>{prog}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Academic Level / Year</label>
            <select value={form.level} onChange={e=>update('level',e.target.value)}>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
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
          <div className="full-span">
            <label>Registration Type</label>
            <select value={form.registrationType} onChange={e=>update('registrationType',e.target.value)}>
              <option value="normal">Normal Student — SLE 100</option>
              <option value="dissertation">Dissertation Student — SLE 500</option>
            </select>
          </div>
          <div className="full-span" style={{
            background: '#eaf1f8',
            border: '1px solid #c7dcfa',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13px',
            color: '#0a2540',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '4px'
          }}>
            <BookOpen size={18} color="#0a2540" style={{ flexShrink: 0 }} />
            <div>
              <strong>Automated Curriculum Assignment:</strong> All required modules for your selected academic level and programme will be assigned automatically upon completion of registration. You do not need to add modules manually.
            </div>
          </div>
        </>
      )}
      {role === 'lecturer' && (
        <>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e=>update('password',e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label>Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e=>update('confirmPassword',e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
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
      {busy ? 'Processing…' : (role === 'student' ? 'Proceed to Registration Payment' : 'Create Lecturer Account')}
    </button></form>
    <p className="signup">Already registered? <button type="button" className="text-btn" onClick={()=>setScreen('login')}>Login</button></p>
  </section></main>;

  if (screen === 'forgot') return <main className="auth-screen"><section className="auth-card"><Logo/><button className="back-link" onClick={()=>setScreen('login')}>← Back to login</button><div className="auth-heading"><div className="auth-icon"><KeyRound/></div><h1>Forgot Password</h1><p>Enter your registered email. Supabase will send a secure reset link.</p></div><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await requestPasswordRecovery(form.email);setMessage('If an account uses that email, recovery instructions have been sent.');}catch{setMessage('If an account uses that email, recovery instructions have been sent.');}finally{setBusy(false)}}}><label>Email Address</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required/><button className="primary-btn full-btn" disabled={busy}>{busy?'Sending…':'Send Reset Link'}</button></form>{message&&<div className="security-note"><ShieldCheck size={18}/><span>{message}</span></div>}</section></main>;

  return <main className="auth-screen"><section className="auth-card"><Logo/><div className="role-switch"><button className={role==='lecturer'?'active':''} onClick={()=>setRole('lecturer')}>Lecturer</button><button className={role==='student'?'active':''} onClick={()=>setRole('student')}>Student</button></div><div className="auth-heading"><h1>{role==='lecturer'?'Lecturer Login':'Student Login'}</h1><p>Sign in with your {role==='lecturer'?'Lecturer ID':'Student ID'} and password.</p></div><form onSubmit={login}><label>{role==='lecturer'?'Lecturer ID':'Student ID'}</label><input value={form.id} onChange={e=>update('id',e.target.value)} required placeholder={role==='lecturer'?'LECT-2026-0001':'8100'} autoComplete="username"/><label>Password</label><input type="password" value={form.password} onChange={e=>update('password',e.target.value)} required autoComplete="current-password" placeholder="••••••••"/><div className="form-row"><label className="check"><input type="checkbox" defaultChecked/><span>Remember this device</span></label><button type="button" className="text-btn" onClick={()=>{resetState();setScreen('forgot')}}>Forgot Password?</button></div>{error&&<div className="error-box">{error}</div>}<button className="primary-btn full-btn" disabled={busy}>{busy?'Signing in…':'Login'}</button></form><p className="signup">Don't have an account? <button className="text-btn" onClick={()=>{resetState();setScreen('register')}}>Create {role==='lecturer'?'Lecturer':'Student'} Account</button></p></section></main>;
}

function Header({ onToggleSidebar, role, onLogout, profile, collapsed, page, setPage, onNavigateSettings, unreadNotifsCount = 0 }) {
  const [open, setOpen] = useState(false);
  const displayName = profile?.full_name || (role === "lecturer" ? "Lecturer" : "Student");
  const displayId = profile?.student_id || profile?.lecturer_id || (role === "lecturer" ? "Lecturer Portal" : "Student Portal");
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || (role === "lecturer" ? "LT" : "ST");

  const titles = {
    home: "Dashboard",
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

  const activeTitle = titles[page] || "EduLink";

  return <header className="topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
      <button
        className="icon-btn sidebar-toggle-btn desktop-only"
        onClick={onToggleSidebar}
        title={collapsed ? "Expand sidebar menu" : "Toggle sidebar menu"}
        aria-label="Toggle sidebar menu"
      >
        <Menu size={20} />
      </button>

      {/* Clean Native Mobile Header Title (No logo image, no 'EduLink Portal' text) */}
      <div className="mobile-header-clean-title">
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#061626', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {activeTitle}
        </h1>
      </div>
    </div>

    <div className="search desktop-only"><Search size={18}/><input placeholder="Search modules, courses, or features..."/></div>

    <div className="top-actions">
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
  </header>;
}

function Sidebar({ role, page, setPage, open, setOpen, collapsed, setCollapsed, onLogout, profile, unreadNotifsCount = 0, unreadMessagesCount = 0 }) {
  const displayName = profile?.full_name || (role === "lecturer" ? "Lecturer" : "Student");
  const displayId = profile?.student_id || profile?.lecturer_id || (role === "lecturer" ? "Lecturer Portal" : "Student Portal");
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || (role === "lecturer" ? "LT" : "ST");

  const lecturerItems = [
    ["home","Dashboard",Home],
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
    ["home","Dashboard",Home],
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
              {/* Desktop Toggle Button */}
              <button
                type="button"
                className="icon-btn sidebar-collapse-btn desktop-only"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar width"
              >
                <ChevronLeft size={19} />
              </button>

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

  // Student: Home | Modules | Grades | Messages | Profile (5 clean spaced dock buttons)
  const studentItems = [
    ["home", "Home", Home],
    ["modules", "Modules", BookOpen],
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

function Stat({ icon:Icon, title, value, sub }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={21}/></div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>
}

function Dashboard({ setPage }) {
  return <div className="page">
    <div className="welcome"><div><p className="eyebrow">LECT-2026-0001</p><h1>Good Morning, Lecturer</h1><p>Here’s an overview of your teaching and academic activities.</p></div><div className="date-chip">Academic Year 2026/2027<br/><strong>First Semester</strong></div></div>

    {/* Campus Services Quick Actions Grid */}
    <div className="quick-services-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>Lecturer Services</h2>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Quick Actions</span>
      </div>
      <div className="quick-services-grid">
        <button type="button" className="quick-service-btn" onClick={() => setPage('attendance')}>
          <div className="quick-service-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <CalendarCheck size={22} />
          </div>
          <span className="quick-service-label">Attendance</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('timetable')}>
          <div className="quick-service-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Clock3 size={22} />
          </div>
          <span className="quick-service-label">Timetable</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('assignments')}>
          <div className="quick-service-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
            <ClipboardList size={22} />
          </div>
          <span className="quick-service-label">Assignments</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('grades')}>
          <div className="quick-service-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Award size={22} />
          </div>
          <span className="quick-service-label">Grades</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('modules')}>
          <div className="quick-service-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
            <BookOpen size={22} />
          </div>
          <span className="quick-service-label">Modules</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('students')}>
          <div className="quick-service-icon" style={{ background: '#fdf2f8', color: '#db2777' }}>
            <Users size={22} />
          </div>
          <span className="quick-service-label">Students</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('messages')}>
          <div className="quick-service-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <MessageSquare size={22} />
          </div>
          <span className="quick-service-label">Messages</span>
        </button>

        <button type="button" className="quick-service-btn" onClick={() => setPage('notifications')}>
          <div className="quick-service-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Bell size={22} />
          </div>
          <span className="quick-service-label">Notices</span>
        </button>
      </div>
    </div>
    <div className="stats-grid">
      <Stat icon={Users} title="Total Students" value="86" sub="Across 4 modules"/>
      <Stat icon={BookOpen} title="Modules Teaching" value="4" sub="View modules"/>
      <Stat icon={ClipboardList} title="Pending Assignments" value="12" sub="Need review"/>
      <Stat icon={Award} title="Pending Grades" value="28" sub="Marks to enter"/>
    </div>
    <div className="content-grid">
      <section className="panel"><div className="panel-head"><h2><BookOpen/> My Modules</h2><button className="text-btn" onClick={()=>setPage("modules")}>View All <ChevronRight size={15}/></button></div>
        <div className="module-list">{modules.map(m=><div className="module-row" key={m.code}><div className="module-code">{m.code}</div><div className="module-info"><strong>{m.title}</strong><span>{m.level} • {m.students} students</span></div><button className="outline-btn" onClick={()=>setPage("modules")}>View</button></div>)}</div>
      </section>
      <section className="panel"><div className="panel-head"><h2><Clock3/> Upcoming Classes</h2><button className="text-btn">Calendar</button></div>
        {[["09:00–11:00","CSOR 224","Room 201"],["11:00–13:00","C++ 101","IT Lab 2"],["14:00–16:00","CS 302","Room 304"]].map(x=><div className="class-row" key={x[1]}><strong>{x[0]}</strong><div><b>{x[1]}</b><span>{x[2]}</span></div><button className="outline-btn" onClick={()=>setPage("attendance")}>Attendance</button></div>)}
      </section>
    </div>
    <div className="content-grid">
      <section className="panel"><div className="panel-head"><h2><CalendarCheck/> Recent Attendance</h2><button className="text-btn" onClick={()=>setPage("attendance")}>View All</button></div>
        {["18 Sep • CSOR 224 • 22/22","16 Sep • C++ 101 • 17/18","14 Sep • CS 302 • 19/20","11 Sep • CS 401 • 25/26"].map(x=><div className="simple-row" key={x}><span>{x}</span><b className="status success">Completed</b></div>)}
      </section>
      <section className="panel"><div className="panel-head"><h2><ClipboardList/> Assignment Submissions</h2><button className="text-btn" onClick={()=>setPage("assignments")}>View All</button></div>
        {modules.map((m,i)=><div className="simple-row" key={m.code}><span>{m.code}</span><span>{18-i*2} submissions</span><b className="badge">{4+i}</b></div>)}
      </section>
    </div>
  </div>
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

function Attendance({ role, onNavigate }) {
  if (role === 'student') {
    return <StudentAttendance />;
  }
  return <AttendanceManagementV39 onNavigate={onNavigate} />;
}

function Assignments({ role, onNavigate }) {
  return <AssignmentManagementV40 role={role} onNavigate={onNavigate} />;
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
  if (page==="home") content = role === "student" ? <StudentDashboardV36 onNavigate={setPage} profile={profile}/> : <Dashboard setPage={setPage}/>;
  else if (page==="modules") content = role==="student" ? <ModuleRegistrationV47/> : <ModuleManagement setPage={setPage}/>;
  else if (page==="timetable") content = <TimetableManagementV43 role={role}/>;
  else if (page==="attendance") content = <Attendance role={role} onNavigate={setPage}/>;
  else if (page==="assignments") content = <Assignments role={role} onNavigate={setPage}/>;
  else if (page==="grades") content = role === "student" ? <StudentGradeInbox /> : <GradeManagementV41/>;
  else if (page==="dissertation") content = <DissertationManagementV42 role={role}/>;
  else if (page==="messages") content = <MessagingCenterV44 role={role} profile={profile} onNavigate={setPage}/>;
  else if (page==="notifications") content = <NotificationsCenterV45 onNavigate={setPage}/>;
  else if (page==="students") content = role==="lecturer" ? <StudentManagementV48/> : <Students/>;
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
        />
        <main className="app-main-content">
          <Suspense fallback={<div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', color: '#64748b' }}>Loading content...</div>}>
            {content}
          </Suspense>
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
  const [forceAuthScreen, setForceAuthScreen] = useState(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) {
        setSessionState(null);
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
    return (
      <Auth
        onAuthenticated={handleAuthenticated}
        initialScreen={forceAuthScreen?.screen || 'login'}
        initialRole={forceAuthScreen?.role || 'student'}
        initialStudentId={forceAuthScreen?.studentId || ''}
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
