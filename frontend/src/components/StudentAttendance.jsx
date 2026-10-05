import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CalendarCheck, Calendar, Clock, MapPin, CheckCircle2,
  AlertCircle, Building, BookOpen, Users, RefreshCw,
  Navigation, ShieldCheck, ChevronRight, BarChart3, ListFilter
} from 'lucide-react';
import {
  getMyStudentProfile,
  getTodaysClasses,
  getMyAttendance,
  getDepartmentAttendanceLogs,
  markStudentAttendance
} from '../services/studentAttendance';
import { sendAcademicNotification } from '../services/liveNotificationService';

const getDeviceToken = () => {
  let t = localStorage.getItem('academic_pwa_device_token');
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem('academic_pwa_device_token', t);
  }
  return t;
};

export default function StudentAttendance() {
  const [profile, setProfile] = useState(null);
  const [todaysClasses, setTodaysClasses] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [deptLogs, setDeptLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('department'); // 'department' | 'today' | 'breakdown'
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gpsBusy, setGpsBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const student = await getMyStudentProfile();
      setProfile(student);

      const [todayRes, historyRes, deptRes] = await Promise.all([
        getTodaysClasses(student.id),
        getMyAttendance(student.id),
        getDepartmentAttendanceLogs(student.id)
      ]);

      setTodaysClasses(todayRes || []);
      setMyHistory(historyRes || []);
      setDeptLogs(deptRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle GPS Attendance Verification
  const handleMarkAttendance = async (cls) => {
    if (!navigator.geolocation) {
      setError('GPS Geolocation is not supported by your browser.');
      return;
    }

    try {
      setGpsBusy(true);
      setMessage('Acquiring high-accuracy GPS coordinates…');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await markStudentAttendance({
              classId: cls.id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              deviceToken: getDeviceToken()
            });

            const distance = Math.round(res.attendance?.distance_meters || 0);
            setMessage(`✓ Attendance recorded successfully for ${cls.module?.code || 'class'}! (Campus distance: ${distance}m)`);

            // Real-time Academic Notification for Marked Attendance
            sendAcademicNotification({
              recipientUserId: profile?.auth_user_id,
              title: `Attendance Marked: ${cls.module?.code || 'Class'}`,
              body: `Attendance successfully verified via GPS (${distance}m) for ${cls.module?.code || 'session'} ${cls.module?.title || ''}. Status: ${res.status?.toUpperCase() || 'PRESENT'}.`,
              category: 'attendance',
              linkUrl: 'attendance'
            }).catch(() => {});

            await loadData();
          } catch (apiErr) {
            setError(apiErr.message || 'Failed to record attendance verification.');
          } finally {
            setGpsBusy(false);
          }
        },
        (geoErr) => {
          setError(`GPS Location Error: ${geoErr.message}. Please allow location permissions.`);
          setGpsBusy(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch (err) {
      setError(err.message || 'Location verification failed.');
      setGpsBusy(false);
    }
  };

  // Calculate Overall Attendance Metrics
  const stats = useMemo(() => {
    const totalDeptSessions = deptLogs.length;
    const attendedSessions = deptLogs.filter(l => l.myStatus === 'present' || l.myStatus === 'late').length;
    const percentage = totalDeptSessions > 0 ? Math.round((attendedSessions / totalDeptSessions) * 100) : 100;

    // Distinct department modules
    const uniqueModules = Array.from(new Set(deptLogs.map(l => l.moduleCode).filter(Boolean)));

    return {
      totalDeptSessions,
      attendedSessions,
      percentage,
      uniqueModulesCount: uniqueModules.length || 4,
      uniqueModules
    };
  }, [deptLogs]);

  // Filter department logs by module
  const filteredDeptLogs = useMemo(() => {
    if (selectedModuleFilter === 'ALL') return deptLogs;
    return deptLogs.filter(l => l.moduleCode === selectedModuleFilter);
  }, [deptLogs, selectedModuleFilter]);

  // Group by Module for Breakdown tab
  const moduleBreakdown = useMemo(() => {
    const map = {};
    deptLogs.forEach(log => {
      const code = log.moduleCode;
      if (!map[code]) {
        map[code] = {
          code,
          title: log.moduleTitle,
          lecturer: log.lecturerName,
          total: 0,
          attended: 0
        };
      }
      map[code].total += 1;
      if (log.myStatus === 'present' || log.myStatus === 'late') {
        map[code].attended += 1;
      }
    });
    return Object.values(map);
  }, [deptLogs]);

  if (loading) {
    return (
      <div className="v15-wrap">
        <div className="v15-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <RefreshCw className="v-spin" size={28} color="#2563eb" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: 0, color: '#0f172a' }}>Loading Department Attendance…</h3>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>Connecting to academic registry & GPS beacons</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v15-wrap">
      {/* Header Banner */}
      <header className="v15-header">
        <div className="v15-header-title">
          <h2>Department Academic Attendance Hub</h2>
          <p>
            <span>{profile?.full_name || 'Student'}</span>
            <span>•</span>
            <span>ID: <strong>{profile?.student_id || '—'}</strong></span>
            <span>•</span>
            <span className="v15-badge-tag dept">
              <Building size={13} /> {profile?.programme || 'Department of Computer Science'}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="v15-action-btn"
          style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}
          onClick={loadData}
        >
          <RefreshCw size={15} /> Refresh Records
        </button>
      </header>

      {/* Global Metric Cards */}
      <section className="v15-stats-grid">
        <div className="v15-stat-card">
          <div className="v15-stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="v15-stat-info">
            <strong>{stats.percentage}%</strong>
            <span>Overall Attendance</span>
          </div>
        </div>

        <div className="v15-stat-card">
          <div className="v15-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="v15-stat-info">
            <strong>{stats.attendedSessions}</strong>
            <span>Lectures Attended</span>
          </div>
        </div>

        <div className="v15-stat-card">
          <div className="v15-stat-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
            <Calendar size={22} />
          </div>
          <div className="v15-stat-info">
            <strong>{stats.totalDeptSessions}</strong>
            <span>Department Lectures Held</span>
          </div>
        </div>

        <div className="v15-stat-card">
          <div className="v15-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <BookOpen size={22} />
          </div>
          <div className="v15-stat-info">
            <strong>{stats.uniqueModulesCount}</strong>
            <span>Department Modules</span>
          </div>
        </div>
      </section>

      {/* Status Messages */}
      {message && (
        <div className="v15-msg">
          <CheckCircle2 size={18} color="#2563eb" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="v15-msg" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
          <AlertCircle size={18} color="#b91c1c" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="v15-tabs-bar" aria-label="Attendance Views">
        <button
          type="button"
          className={`v15-tab-btn ${activeTab === 'department' ? 'active' : ''}`}
          onClick={() => setActiveTab('department')}
        >
          <Building size={16} /> All Department Attendance Log
        </button>
        <button
          type="button"
          className={`v15-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <Navigation size={16} /> Today's Classes & GPS Check-In ({todaysClasses.length})
        </button>
        <button
          type="button"
          className={`v15-tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          <BarChart3 size={16} /> Module Breakdown
        </button>
      </nav>

      {/* TAB 1: ALL DEPARTMENT ATTENDANCE LOG */}
      {activeTab === 'department' && (
        <section className="v15-card">
          <div className="v15-card-head">
            <div>
              <h3>
                <Building size={20} color="#2563eb" /> Department Attendance Roster
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                All official lecture sessions and attendance tracking for your department.
              </p>
            </div>

            {/* Module Filter Dropdown */}
            {stats.uniqueModules.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListFilter size={16} color="#64748b" />
                <select
                  value={selectedModuleFilter}
                  onChange={e => setSelectedModuleFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    background: '#ffffff'
                  }}
                >
                  <option value="ALL">All Modules ({deptLogs.length})</option>
                  {stats.uniqueModules.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!filteredDeptLogs.length ? (
            <div className="v15-empty-state">
              <Calendar size={44} color="#94a3b8" />
              <h4>No Attendance Sessions Recorded Yet</h4>
              <p>As lecturers schedule and complete class sessions, department attendance will appear here automatically.</p>
            </div>
          ) : (
            <div className="v15-table-wrap">
              <table className="v15-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Module</th>
                    <th>Lecturer</th>
                    <th>Lecture Venue</th>
                    <th>Total Present</th>
                    <th>Your Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeptLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.classDate}</strong>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          {log.startTime} – {log.endTime}
                        </div>
                      </td>
                      <td>
                        <span className="v15-code-chip">{log.moduleCode}</span>
                        <div style={{ fontWeight: 600, marginTop: '3px' }}>{log.moduleTitle}</div>
                      </td>
                      <td>
                        <span style={{ color: '#334155', fontWeight: 500 }}>{log.lecturerName}</span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                          <MapPin size={13} color="#2563eb" /> {log.venue}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Users size={14} color="#64748b" /> {log.totalPresent} students
                        </span>
                      </td>
                      <td>
                        <span className={`v15-status-pill ${log.myStatus}`}>
                          {log.myStatus === 'present' ? '✓ Present' : log.myStatus === 'absent' ? '✗ Absent' : log.myStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TODAY'S CLASSES & GPS CHECK-IN */}
      {activeTab === 'today' && (
        <section className="v15-card">
          <div className="v15-card-head">
            <div>
              <h3>
                <Clock size={20} color="#2563eb" /> Today's Scheduled Lectures & Live GPS Verification
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Check into active lecture halls via GPS geofencing when the class window opens.
              </p>
            </div>
          </div>

          {!todaysClasses.length ? (
            <div className="v15-empty-state">
              <CheckCircle2 size={44} color="#10b981" />
              <h4>No Lectures Scheduled for Today</h4>
              <p>You have no pending class sessions requiring attendance verification today.</p>
            </div>
          ) : (
            <div className="v15-class-list">
              {todaysClasses.map(cls => {
                const now = new Date();
                const openTime = new Date(`${cls.class_date}T${cls.end_time || '23:59'}Z`);
                openTime.setMinutes(openTime.getMinutes() - 30);
                const closeTime = new Date(`${cls.class_date}T${cls.end_time || '23:59'}Z`);

                const isOpen = now >= openTime && now <= closeTime;
                const isClosed = now > closeTime;
                const alreadyMarked = myHistory.some(h => h.class_id === cls.id);

                return (
                  <div className="v15-class-item" key={cls.id}>
                    <div className="v15-class-main">
                      <div className="v15-class-title">
                        <span className="v15-code-chip">{cls.module?.code || 'MOD'}</span>
                        <strong>{cls.module?.title || 'Lecture Session'}</strong>
                      </div>
                      <div className="v15-class-meta">
                        <span><Clock size={14} /> {cls.start_time} – {cls.end_time}</span>
                        <span><MapPin size={14} color="#2563eb" /> {cls.location_name || 'Main Hall'}</span>
                        <span><Users size={14} /> Lecturer: {cls.module?.lecturers?.full_name || 'Academic Staff'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`v15-action-btn ${alreadyMarked ? 'present' : ''}`}
                      disabled={alreadyMarked || !isOpen || gpsBusy}
                      onClick={() => handleMarkAttendance(cls)}
                    >
                      {alreadyMarked ? (
                        <>✓ Present (Verified)</>
                      ) : isOpen ? (
                        <><Navigation size={15} /> Mark Attendance (GPS)</>
                      ) : isClosed ? (
                        <>Session Closed</>
                      ) : (
                        <>Opens 30m before end</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: MODULE ATTENDANCE BREAKDOWN */}
      {activeTab === 'breakdown' && (
        <section className="v15-card">
          <div className="v15-card-head">
            <div>
              <h3>
                <BarChart3 size={20} color="#2563eb" /> Coursework Module Attendance Breakdown
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Track your attendance percentage per module against the university 75% exam requirement threshold.
              </p>
            </div>
          </div>

          {!moduleBreakdown.length ? (
            <div className="v15-empty-state">
              <BookOpen size={44} color="#94a3b8" />
              <h4>No Module Attendance Logs Yet</h4>
              <p>Module breakdown statistics will populate as department classes are recorded.</p>
            </div>
          ) : (
            <div className="v15-module-grid">
              {moduleBreakdown.map(m => {
                const pct = m.total > 0 ? Math.round((m.attended / m.total) * 100) : 100;
                const isGood = pct >= 75;

                return (
                  <div className="v15-module-card" key={m.code}>
                    <div className="v15-module-card-head">
                      <div>
                        <span className="v15-code-chip">{m.code}</span>
                        <h4 style={{ marginTop: '6px' }}>{m.title}</h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Lecturer: {m.lecturer}</span>
                      </div>
                      <span className={`v15-status-pill ${isGood ? 'present' : 'absent'}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="v15-progress-bar-bg">
                      <div
                        className="v15-progress-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: isGood ? '#10b981' : '#ef4444'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b' }}>
                      <span>Attended: <strong>{m.attended} / {m.total}</strong></span>
                      <span style={{ fontWeight: 600, color: isGood ? '#15803d' : '#b91c1c' }}>
                        {isGood ? 'Exam Eligible' : 'Low Attendance'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
