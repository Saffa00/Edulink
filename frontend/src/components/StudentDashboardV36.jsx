import React, { useEffect, useState, useCallback } from 'react';
import { getStudentDashboardSummary } from '../services/studentDashboard';
import {
  BookOpen, CalendarCheck, ClipboardList, Award, Clock3,
  ChevronRight, MessageSquare, CreditCard, AlertCircle,
  FileText, CheckCircle2, ArrowRight, RefreshCw, Bell
} from 'lucide-react';

export default function StudentDashboardV36({ onNavigate, profile }) {
  const [data, setData] = useState(() => {
    if (profile) {
      return {
        student: {
          student_id: profile.student_id || '8100',
          full_name: profile.full_name || 'Peter Saffa',
          programme: profile.programme || 'B.Sc. Computer Science',
          level: profile.level || 3,
          academic_year: profile.academic_year || '2026/2027',
          semester: profile.semester || 'First Semester'
        },
        modules: [],
        grades: [],
        assignments: [],
        attendance: [],
        notifications: [],
        conversations: []
      };
    }
    return null;
  });

  const [loading, setLoading] = useState(!profile);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError('');

    try {
      const summary = await getStudentDashboardSummary(profile);
      setData(summary);
    } catch (e) {
      console.warn('Dashboard fetch warning:', e);
      if (!data) {
        setError(e.message || 'Could not load student dashboard.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="page">
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '18px', color: '#061626', marginBottom: '6px' }}>Loading Student Dashboard</h2>
          <p style={{ color: '#738299', fontSize: '14px' }}>Connecting to your academic records…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 12px auto' }} />
          <h2 style={{ fontSize: '18px', color: '#0f172a' }}>Unable to load dashboard</h2>
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button className="primary-btn" onClick={() => loadData()}>Try Again</button>
        </div>
      </div>
    );
  }

  const student = data?.student || profile || {};
  const modules = data?.modules || [];
  const assignments = data?.assignments || [];
  const grades = data?.grades || [];
  const attendance = data?.attendance || [];
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 100;

  return (
    <div className="page">
      {/* Welcome Hero Banner */}
      <div className="welcome">
        <div>
          <p className="eyebrow">
            {student.student_id ? `Student ID: ${student.student_id}` : 'Student Portal'} • {student.programme || 'Computer Science'}
          </p>
          <h1>Welcome, {student.full_name || 'Peter Saffa'}</h1>
          <p>Here is an overview of your enrolled modules, upcoming classes, assignments, and results.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="date-chip">
            {student.academic_year || 'Academic Year 2026/2027'}<br />
            <strong>{student.semester || 'First Semester'}</strong>
          </div>
        </div>
      </div>

      {/* Native Campus Services Quick Actions Grid */}
      <div className="quick-services-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>Campus Services</h2>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>All Features</span>
        </div>
        <div className="quick-services-grid">
          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('attendance')}>
            <div className="quick-service-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <CalendarCheck size={22} />
            </div>
            <span className="quick-service-label">Attendance</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('timetable')}>
            <div className="quick-service-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <Clock3 size={22} />
            </div>
            <span className="quick-service-label">Timetable</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('assignments')}>
            <div className="quick-service-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <ClipboardList size={22} />
            </div>
            <span className="quick-service-label">Assignments</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('grades')}>
            <div className="quick-service-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Award size={22} />
            </div>
            <span className="quick-service-label">Grades</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('modules')}>
            <div className="quick-service-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <BookOpen size={22} />
            </div>
            <span className="quick-service-label">Modules</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('payments')}>
            <div className="quick-service-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
              <CreditCard size={22} />
            </div>
            <span className="quick-service-label">Tuition Fees</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('messages')}>
            <div className="quick-service-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <MessageSquare size={22} />
            </div>
            <span className="quick-service-label">Messages</span>
          </button>

          <button type="button" className="quick-service-btn" onClick={() => onNavigate?.('notifications')}>
            <div className="quick-service-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <Bell size={22} />
            </div>
            <span className="quick-service-label">Notices</span>
          </button>
        </div>
      </div>

      {/* Primary Key Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate?.('modules')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon"><BookOpen size={21} /></div>
          <span>Enrolled Modules</span>
          <strong>{modules.length}</strong>
          <small>{modules.length ? 'Click to view modules' : 'Click to register modules'}</small>
        </div>

        <div className="stat-card" onClick={() => onNavigate?.('attendance')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon"><CalendarCheck size={21} /></div>
          <span>Attendance Rate</span>
          <strong>{attendancePct}%</strong>
          <small>{presentCount} of {attendance.length || 0} classes recorded</small>
        </div>

        <div className="stat-card" onClick={() => onNavigate?.('assignments')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon"><ClipboardList size={21} /></div>
          <span>Assignments</span>
          <strong>{assignments.length}</strong>
          <small>{assignments.length ? 'Pending submissions' : 'All caught up'}</small>
        </div>

        <div className="stat-card" onClick={() => onNavigate?.('grades')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon"><Award size={21} /></div>
          <span>Published Results</span>
          <strong>{grades.length}</strong>
          <small>{grades.length ? 'Grades available' : 'Awaiting publication'}</small>
        </div>
      </div>

      {/* Main Content Grid 1: Modules and Upcoming Deadlines */}
      <div className="content-grid">
        {/* Enrolled Modules Panel */}
        <section className="panel">
          <div className="panel-head">
            <h2><BookOpen size={18} /> My Enrolled Modules</h2>
            <button className="text-btn" onClick={() => onNavigate?.('modules')}>
              View All <ChevronRight size={15} />
            </button>
          </div>

          {modules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '10px' }}>
              <BookOpen size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: '0 0 12px 0', color: '#475569', fontWeight: 500 }}>No modules enrolled for this semester yet.</p>
              <button className="primary-btn small-btn" onClick={() => onNavigate?.('modules')}>
                Register Modules Now
              </button>
            </div>
          ) : (
            <div className="module-list">
              {modules.slice(0, 4).map((reg, idx) => {
                const mod = reg.modules || reg;
                return (
                  <div className="module-row" key={reg.id || mod.code || idx}>
                    <div className="module-code">{mod.code || 'MOD'}</div>
                    <div className="module-info">
                      <strong>{mod.title || 'Untitled Module'}</strong>
                      <span>{mod.lecturers?.full_name ? `Lecturer: ${mod.lecturers.full_name}` : 'Level ' + (mod.level || '3')}</span>
                    </div>
                    <button
                      className="outline-btn"
                      onClick={() => onNavigate?.('messages')}
                      title="Contact lecturer"
                    >
                      <MessageSquare size={13} /> Message
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Assignments Panel */}
        <section className="panel">
          <div className="panel-head">
            <h2><ClipboardList size={18} /> Upcoming Assignments</h2>
            <button className="text-btn" onClick={() => onNavigate?.('assignments')}>
              View All <ChevronRight size={15} />
            </button>
          </div>

          {assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '10px' }}>
              <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: '0', color: '#475569', fontWeight: 500 }}>No upcoming assignment deadlines.</p>
              <small style={{ color: '#94a3b8' }}>You are completely up to date!</small>
            </div>
          ) : (
            <div className="module-list">
              {assignments.map((a, idx) => (
                <div className="simple-row" key={a.id || idx} style={{ padding: '12px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#061626', fontSize: '13px' }}>{a.title}</strong>
                    <span style={{ fontSize: '11px', color: '#738299' }}>
                      {a.modules?.code} • Due: {a.due_at ? new Date(a.due_at).toLocaleDateString() : 'TBA'}
                    </span>
                  </div>
                  <button className="outline-btn" onClick={() => onNavigate?.('assignments')}>
                    Submit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Main Content Grid 2: Attendance & Latest Grades */}
      <div className="content-grid">
        {/* Attendance Records */}
        <section className="panel">
          <div className="panel-head">
            <h2><CalendarCheck size={18} /> Recent Class Attendance</h2>
            <button className="text-btn" onClick={() => onNavigate?.('attendance')}>
              Details <ChevronRight size={15} />
            </button>
          </div>

          {attendance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#738299', fontSize: '13px' }}>
              No attendance records marked yet.
            </div>
          ) : (
            <div className="simple-list">
              {attendance.slice(0, 4).map((att, idx) => {
                const cls = att.classes || {};
                const isPresent = att.status === 'present';
                return (
                  <div className="simple-row" key={att.id || idx}>
                    <div style={{ flex: 1 }}>
                      <strong>{cls.modules?.code || 'CSOR 224'}</strong>
                      <span style={{ fontSize: '11px', color: '#738299', marginLeft: '6px' }}>
                        {cls.class_date ? new Date(cls.class_date).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <b className={`status ${isPresent ? 'success' : 'badge'}`}>
                      {isPresent ? 'Present' : 'Absent'}
                    </b>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Latest Published Grades (NO GPA) */}
        <section className="panel">
          <div className="panel-head">
            <h2><Award size={18} /> Published Grades</h2>
            <button className="text-btn" onClick={() => onNavigate?.('grades')}>
              View All <ChevronRight size={15} />
            </button>
          </div>

          {grades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#738299', fontSize: '13px' }}>
              No grades published yet for this semester.
            </div>
          ) : (
            <div className="simple-list">
              {grades.slice(0, 4).map((g, idx) => (
                <div className="simple-row" key={g.id || idx}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#061626' }}>{g.modules?.code || 'Module'}</strong>
                    <span style={{ fontSize: '11px', color: '#738299', marginLeft: '8px' }}>
                      {g.modules?.title || ''}
                    </span>
                  </div>
                  <b className="status info" style={{ fontSize: '12px', fontWeight: 700 }}>
                    {g.score} {g.grade ? `(${g.grade})` : ''}
                  </b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Student Quick Action Shortcuts */}
      <section className="panel">
        <div className="panel-head">
          <h2>Quick Actions</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '10px' }}>
          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('modules')}
          >
            <BookOpen size={18} color="#0a2540" />
            <span>Module Registration</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('timetable')}
          >
            <Clock3 size={18} color="#0891b2" />
            <span>Class Timetable</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('attendance')}
          >
            <CalendarCheck size={18} color="#25814b" />
            <span>Mark Attendance</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('assignments')}
          >
            <ClipboardList size={18} color="#ea580c" />
            <span>Assignments</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('grades')}
          >
            <Award size={18} color="#16a34a" />
            <span>My Grades</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('payments')}
          >
            <CreditCard size={18} color="#7c3aed" />
            <span>Payments</span>
          </button>

          <button
            className="outline-btn"
            style={{ padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => onNavigate?.('settings')}
          >
            <FileText size={18} color="#475569" />
            <span>Profile &amp; Security</span>
          </button>
        </div>
      </section>
    </div>
  );
}
