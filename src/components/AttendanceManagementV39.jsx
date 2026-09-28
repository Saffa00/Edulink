import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  CalendarCheck, Clock, MapPin, Users, CheckCircle2, AlertCircle,
  XCircle, Download, RefreshCw, Search, ChevronRight,
  ShieldCheck, Smartphone, Navigation, Filter, Radio
} from 'lucide-react';
import {
  getLecturerModules,
  getLecturerClasses,
  getClassAttendanceDetails,
  setAttendanceStatus,
  updateStudentAttendance,
  subscribeToClassAttendance,
  getAttendanceHistory,
  exportAttendanceCSV,
  calculateHaversineDistance
} from '../services/attendanceV39';

export default function AttendanceManagementV39({ initialClassId = null, onNavigate }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [classDetails, setClassDetails] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'late'

  // Manual Override Modal / Selection State
  const [overrideStudent, setOverrideStudent] = useState(null);
  const [overrideNotes, setOverrideNotes] = useState('');

  // Clear messages after 5s
  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  // Load initial modules & classes
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [modList, clsList] = await Promise.all([
        getLecturerModules(),
        getLecturerClasses()
      ]);
      setModules(modList);
      setClasses(clsList);

      if (clsList.length > 0) {
        if (!selectedClassId || !clsList.some(c => c.id === selectedClassId)) {
          setSelectedClassId(clsList[0].id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance management data.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load details for selected class
  const loadSelectedClass = useCallback(async (classId) => {
    if (!classId) {
      setClassDetails(null);
      return;
    }
    try {
      setRosterLoading(true);
      const data = await getClassAttendanceDetails(classId);
      setClassDetails(data);
    } catch (err) {
      setError(err.message || 'Failed to load class attendance roster.');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadSelectedClass(selectedClassId);
    }
  }, [selectedClassId, loadSelectedClass]);

  // Realtime subscription to selected class
  useEffect(() => {
    if (!selectedClassId) return;
    const unsubscribe = subscribeToClassAttendance(selectedClassId, () => {
      loadSelectedClass(selectedClassId);
    });
    return () => {
      unsubscribe();
    };
  }, [selectedClassId, loadSelectedClass]);

  // Load History when tab clicked
  useEffect(() => {
    if (activeTab === 'history') {
      getAttendanceHistory()
        .then(setHistoryList)
        .catch(err => setError(err.message));
    }
  }, [activeTab]);

  // Open / Close Attendance Handler
  const handleToggleAttendance = async (newStatus) => {
    if (!selectedClassId) return;
    try {
      setActionBusy(true);
      await setAttendanceStatus(selectedClassId, newStatus);
      setMessage(`Attendance is now ${newStatus.toUpperCase()}.`);
      // Refresh local classes list
      setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, attendance_status: newStatus } : c));
      await loadSelectedClass(selectedClassId);
    } catch (err) {
      setError(err.message || 'Could not update attendance status.');
    } finally {
      setActionBusy(false);
    }
  };

  // Manual Status Override Handler
  const handleManualStatus = async (student, newStatus) => {
    if (!selectedClassId) return;
    try {
      setActionBusy(true);
      await updateStudentAttendance({
        classId: selectedClassId,
        studentInternalId: student.studentInternalId,
        status: newStatus,
        notes: overrideNotes || `Manual mark by lecturer (${newStatus})`
      });
      setMessage(`${student.fullName} status updated to ${newStatus.toUpperCase()}.`);
      setOverrideStudent(null);
      setOverrideNotes('');
      await loadSelectedClass(selectedClassId);
    } catch (err) {
      setError(err.message || 'Failed to update student status.');
    } finally {
      setActionBusy(false);
    }
  };


  // Filtered Roster: Shows ONLY students who marked attendance
  const filteredRoster = useMemo(() => {
    if (!classDetails?.roster) return [];
    // Only include students who have marked attendance
    let list = classDetails.roster.filter(
      r => r.status === 'present' || r.status === 'late' || r.markedAt != null
    );

    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.studentId.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.programme.toLowerCase().includes(q)
      );
    }

    return list;
  }, [classDetails, statusFilter, searchQuery]);

  const currentClass = classes.find(c => c.id === selectedClassId) || classDetails?.classInfo;

  if (loading) {
    return (
      <div className="v39-attendance-wrap">
        <div className="v39-card text-center">
          <RefreshCw className="v39-spin" size={28} />
          <p>Loading attendance records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v39-attendance-wrap">
      {/* Top Header */}
      <header className="v39-header">
        <div>
          <h1>Student Attendance Records</h1>
          <p>Live check-in monitoring, GPS verification, and records of students who marked attendance.</p>
        </div>

        <div className="v39-tab-group">
          <button
            className={`v39-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Radio size={16} /> Live & Marked Students
          </button>
          <button
            className={`v39-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <CalendarCheck size={16} /> History & Logs
          </button>
        </div>
      </header>

      {/* Notifications */}
      {message && <div className="v39-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v39-banner error"><AlertCircle size={18} /> {error}</div>}

      {/* TAB 1: LIVE ATTENDANCE & ROSTER */}
      {activeTab === 'live' && (
        <>
          {/* Class Selector & Hero Controls */}
          <section className="v39-card v39-session-hero">
            <div className="v39-session-top">
              <div className="v39-select-box">
                <label>Select Scheduled Class Session:</label>
                <select
                  value={selectedClassId || ''}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="v39-class-select"
                >
                  {!classes.length && <option value="">No classes scheduled</option>}
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.modules?.code} — {c.class_date} ({c.start_time} - {c.end_time}) [{c.attendance_status || 'scheduled'}]
                    </option>
                  ))}
                </select>
              </div>

              {currentClass && (
                <div className="v39-status-pill-wrap">
                  <span className={`v39-status-badge ${currentClass.attendance_status || 'scheduled'}`}>
                    {currentClass.attendance_status === 'open' ? (
                      <>
                        <span className="v39-live-dot" /> LIVE: ATTENDANCE OPEN
                      </>
                    ) : currentClass.attendance_status === 'closed' ? (
                      'ATTENDANCE CLOSED'
                    ) : (
                      'SCHEDULED'
                    )}
                  </span>
                </div>
              )}
            </div>

            {currentClass ? (
              <div className="v39-session-meta-grid">
                <div>
                  <strong>{currentClass.modules?.code} · {currentClass.modules?.title}</strong>
                  <span><Clock size={14} /> {currentClass.class_date} | {currentClass.start_time} – {currentClass.end_time}</span>
                </div>
                <div>
                  <strong><MapPin size={14} /> {currentClass.location_name || 'Campus'}</strong>
                  <span>Geofence radius: <b>{currentClass.radius_meters || 100}m</b> | Late cutoff: <b>{currentClass.late_threshold_minutes || 15} mins</b></span>
                </div>

                <div className="v39-session-actions">
                  {currentClass.attendance_status === 'open' ? (
                    <button
                      className="v39-btn danger"
                      onClick={() => handleToggleAttendance('closed')}
                      disabled={actionBusy}
                    >
                      <XCircle size={16} /> Close Attendance
                    </button>
                  ) : (
                    <button
                      className="v39-btn success"
                      onClick={() => handleToggleAttendance('open')}
                      disabled={actionBusy}
                    >
                      <Radio size={16} /> Open Attendance Now
                    </button>
                  )}

                  <button
                    className="v39-btn secondary"
                    onClick={() => {
                      if (classDetails) {
                        exportAttendanceCSV(classDetails.classInfo, classDetails.roster);
                      }
                    }}
                    disabled={!classDetails?.roster?.length}
                  >
                    <Download size={16} /> Export CSV
                  </button>

                  <button
                    className="v39-btn outline"
                    onClick={() => loadSelectedClass(selectedClassId)}
                    title="Refresh Roster"
                  >
                    <RefreshCw size={16} className={rosterLoading ? 'v39-spin' : ''} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="v39-empty-state">
                <p>Select a lecture session from the dropdown above to view students who marked attendance.</p>
              </div>
            )}
          </section>

          {/* Stats Bar */}
          {classDetails?.stats && (
            <section className="v39-stats-grid">
              <div className="v39-stat-card green">
                <span className="label"><CheckCircle2 size={16} /> Students Marked</span>
                <strong className="value">{classDetails.stats.present + classDetails.stats.late}</strong>
                <span className="sub">Checked In / Recorded</span>
              </div>
              <div className="v39-stat-card">
                <span className="label"><Users size={16} /> Present (On Time)</span>
                <strong className="value">{classDetails.stats.present}</strong>
                <span className="sub">{classDetails.stats.presentRate}% of total cohort</span>
              </div>
              <div className="v39-stat-card orange">
                <span className="label"><Clock size={16} /> Marked Late</span>
                <strong className="value">{classDetails.stats.late}</strong>
                <span className="sub">{classDetails.stats.lateRate}% marked late</span>
              </div>
              <div className="v39-stat-card blue">
                <span className="label"><Navigation size={16} /> Avg GPS Distance</span>
                <strong className="value">{classDetails.stats.avgDistance}m</strong>
                <span className="sub">Within geofence radius</span>
              </div>
            </section>
          )}

          {/* Student Roster Section */}
          {classDetails && (
            <section className="v39-card">
              <div className="v39-roster-header">
                <div className="v39-roster-title">
                  <h3>Students Who Marked Attendance</h3>
                  <span>Live verified check-ins and GPS records for this lecture session</span>
                </div>

                {/* Filter Chips & Search Bar */}
                <div className="v39-roster-controls">
                  <div className="v39-search-input-wrap">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search marked student ID or name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="v39-filter-chips">
                    <button
                      className={`v39-chip ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All Marked ({classDetails.stats.present + classDetails.stats.late})
                    </button>
                    <button
                      className={`v39-chip green ${statusFilter === 'present' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('present')}
                    >
                      Present ({classDetails.stats.present})
                    </button>
                    <button
                      className={`v39-chip orange ${statusFilter === 'late' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('late')}
                    >
                      Late ({classDetails.stats.late})
                    </button>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="v39-table-responsive">
                <table className="v39-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Programme / Level</th>
                      <th>Status</th>
                      <th>GPS Distance</th>
                      <th>Marked Time</th>
                      <th>Verification</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredRoster.length && (
                      <tr>
                        <td colSpan="8" className="v39-no-records" style={{ textAlign: 'center', padding: '36px 20px' }}>
                          <CalendarCheck size={36} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                          <strong>No students have marked attendance for this session yet.</strong>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                            Students who mark attendance will appear here in real time with their marked timestamp and GPS verification tag.
                          </p>
                        </td>
                      </tr>
                    )}
                    {filteredRoster.map(s => (
                      <tr key={s.studentInternalId} className={`v39-row-${s.status}`}>
                        <td>
                          <span className="v39-id-badge">{s.studentId}</span>
                        </td>
                        <td>
                          <strong>{s.fullName}</strong>
                          <small className="v39-block-email">{s.email}</small>
                        </td>
                        <td>
                          <span>{s.programme}</span>
                          <small className="v39-block-sub">Level {s.level}</small>
                        </td>
                        <td>
                          <span className={`v39-pill-status ${s.status}`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {s.distanceMeters != null ? (
                            <span className="v39-distance-tag">
                              <MapPin size={12} /> {Math.round(s.distanceMeters)}m
                            </span>
                          ) : (
                            <span className="v39-muted">—</span>
                          )}
                        </td>
                        <td>
                          {s.markedAt ? (
                            <span>{new Date(s.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          ) : (
                            <span className="v39-muted">Not marked</span>
                          )}
                        </td>
                        <td>
                          {s.verificationMethod === 'gps_device' ? (
                            <span className="v39-tag verified" title="Verified via Browser Geolocation & Device Key">
                              <ShieldCheck size={13} /> GPS & Device
                            </span>
                          ) : s.verificationMethod === 'manual_lecturer' ? (
                            <span className="v39-tag manual" title="Manually adjusted by lecturer">
                              Manual
                            </span>
                          ) : (
                            <span className="v39-muted">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="v39-action-buttons">
                            {s.status !== 'present' && (
                              <button
                                className="v39-btn-mini success"
                                onClick={() => handleManualStatus(s, 'present')}
                                title="Mark Present"
                              >
                                Present
                              </button>
                            )}
                            {s.status !== 'late' && (
                              <button
                                className="v39-btn-mini orange"
                                onClick={() => handleManualStatus(s, 'late')}
                                title="Mark Late"
                              >
                                Late
                              </button>
                            )}
                            {s.status !== 'excused' && (
                              <button
                                className="v39-btn-mini blue"
                                onClick={() => handleManualStatus(s, 'excused')}
                                title="Mark Excused"
                              >
                                Excuse
                              </button>
                            )}
                            {s.status !== 'absent' && (
                              <button
                                className="v39-btn-mini danger"
                                onClick={() => handleManualStatus(s, 'absent')}
                                title="Mark Absent"
                              >
                                Absent
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* TAB 2: ATTENDANCE HISTORY & ANALYTICS */}
      {activeTab === 'history' && (
        <section className="v39-card">
          <div className="v39-section-heading">
            <h2>Class Attendance History & Analytics</h2>
            <p>Review attendance performance across all scheduled sessions and export historical CSV records.</p>
          </div>

          <div className="v39-table-responsive">
            <table className="v39-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Date & Time</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Roster</th>
                  <th>Present / Late</th>
                  <th>Attendance %</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!historyList.length ? (
                  <tr>
                    <td colSpan="8" className="v39-no-records">
                      No past classes found.
                    </td>
                  </tr>
                ) : (
                  historyList.map(h => (
                    <tr key={h.id}>
                      <td>
                        <strong>{h.moduleCode}</strong>
                        <small className="v39-block-sub">{h.moduleTitle}</small>
                      </td>
                      <td>
                        <span>{h.classDate}</span>
                        <small className="v39-block-sub">{h.startTime} – {h.endTime}</small>
                      </td>
                      <td>{h.locationName}</td>
                      <td>
                        <span className={`v39-pill-status ${h.attendanceStatus}`}>
                          {h.attendanceStatus.toUpperCase()}
                        </span>
                      </td>
                      <td><b>{h.totalRoster}</b> students</td>
                      <td>
                        <span className="v39-color-present">{h.present} P</span> ·{' '}
                        <span className="v39-color-late">{h.late} L</span> ·{' '}
                        <span className="v39-color-absent">{h.absent} A</span>
                      </td>
                      <td>
                        <div className="v39-progress-wrap">
                          <div className="v39-progress-bar" style={{ width: `${h.rate}%` }} />
                          <span>{h.rate}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="v39-btn-mini secondary"
                          onClick={() => {
                            setSelectedClassId(h.id);
                            setActiveTab('live');
                          }}
                        >
                          View Roster
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
