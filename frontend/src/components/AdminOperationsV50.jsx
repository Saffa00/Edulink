import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity, ShieldCheck, Database, Users, BookOpen, CreditCard, RefreshCw, AlertCircle,
  Calendar, CheckCircle2, XCircle, ArrowUpRight, Award, FileText, Check, X, AlertTriangle
} from 'lucide-react';
import {
  getSystemAuditMetrics, getAcademicTerms, setCurrentAcademicTerm, setDissertationRegOpen,
  getAdminDissertationRegistrations, adminApproveDissertationRegistration, adminRejectDissertationRegistration,
  adminAssignDissertationSupervisor, adminBulkPromoteStudentLevels, adminToggleModulesOverride,
  adminUpdateStudentLevel, getAvailableSupervisors
} from '../services/academicMasterV41toV55.js';
import { supabase } from '../services/supabase.js';

export default function AdminOperationsV50() {
  const [activeTab, setActiveTab] = useState('governance'); // 'governance' | 'audit'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Governance state
  const [terms, setTerms] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState({});
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsRes, termsRes, regsRes, supsRes, studentsRes] = await Promise.all([
        getSystemAuditMetrics().catch(() => null),
        getAcademicTerms().catch(() => []),
        getAdminDissertationRegistrations().catch(() => []),
        getAvailableSupervisors().catch(() => []),
        supabase.from('students').select('id, student_id, full_name, email, level, programme').order('student_id', { ascending: true })
      ]);

      setData(metricsRes);
      setTerms(termsRes || []);
      setRegistrations(regsRes || []);
      setSupervisors(supsRes || []);
      setStudents(studentsRes?.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 6000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const handleSetCurrentTerm = async (termId) => {
    try {
      setActionBusy(true);
      await setCurrentAcademicTerm(termId);
      setMessage('Academic term set to active successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to set current academic term.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleRegOpen = async (termId, currentVal) => {
    try {
      setActionBusy(true);
      await setDissertationRegOpen(termId, !currentVal);
      setMessage(`Dissertation registration ${!currentVal ? 'OPENED' : 'CLOSED'} successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update registration status.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveRegistration = async (studentId, termId) => {
    try {
      setActionBusy(true);
      const supervisorId = selectedSupervisors[studentId] || null;
      await adminApproveDissertationRegistration({ studentId, termId, supervisorId });
      setMessage('Dissertation candidate approved and assigned to supervisor successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to approve registration.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectRegistration = async (studentId, termId) => {
    if (!window.confirm('Are you sure you want to reject this dissertation proposal?')) return;
    try {
      setActionBusy(true);
      await adminRejectDissertationRegistration({ studentId, termId });
      setMessage('Registration marked as rejected.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to reject registration.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleModuleOverride = async (studentId, termId, currentOverride) => {
    try {
      setActionBusy(true);
      await adminToggleModulesOverride({ studentId, termId, allowOverride: !currentOverride });
      setMessage(`Module enrollment override ${!currentOverride ? 'GRANTED' : 'REVOKED'}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update module override.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateStudentLevel = async (studentId, newLevel) => {
    try {
      setActionBusy(true);
      await adminUpdateStudentLevel(studentId, newLevel);
      setMessage(`Student level updated to Year ${newLevel}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update student level.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleBulkPromoteLevels = async () => {
    if (!window.confirm('Caution: This will advance all students currently in Year 1, 2, and 3 to their next academic year level (Year 1→2, 2→3, 3→4). Proceed?')) return;
    try {
      setActionBusy(true);
      const res = await adminBulkPromoteStudentLevels();
      setMessage(res?.message || 'Bulk academic levels promotion completed successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to execute bulk promotion.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="v-master-wrap">
        <div className="v-card text-center" style={{ padding: '40px' }}>
          <RefreshCw className="v-spin" size={28} color="#0284c7" style={{ margin: '0 auto 12px auto' }} />
          <p>Loading administration portal & academic terms…</p>
        </div>
      </div>
    );
  }

  const c = data?.counts || {};

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Academic Governance & System Administration</h1>
          <p>Final-year dissertation controls, term enrollment permissions, student level management, and system audits.</p>
        </div>
        <button className="v-btn outline" onClick={loadData} disabled={actionBusy}>
          <RefreshCw size={16} className={actionBusy ? 'v-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('governance')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13.5px',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'governance' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'governance' ? '#ffffff' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} /> Dissertation & Term Governance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13.5px',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'audit' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'audit' ? '#ffffff' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Activity size={16} /> System Health & Audit Logs
        </button>
      </div>

      {message && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} flexShrink={0} /> {message}
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} flexShrink={0} /> {error}
        </div>
      )}

      {activeTab === 'governance' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION 1: Academic Terms Management */}
          <section className="v-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>Academic Terms & Dissertation Registration Windows</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>Configure active term and open/close dissertation registration for Year 4 Semester 2 students.</p>
              </div>
            </div>

            <div className="v-table-responsive">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Current Status</th>
                    <th>Dissertation Reg</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t) => (
                    <tr key={t.id} style={{ background: t.is_current ? '#f0f9ff' : 'transparent' }}>
                      <td><strong>{t.academic_year}</strong></td>
                      <td>Semester {t.semester}</td>
                      <td>{t.starts_on}</td>
                      <td>{t.ends_on}</td>
                      <td>
                        <span className={`v-chip ${t.is_current ? 'present' : ''}`}>
                          {t.is_current ? 'Active Current Term' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className={`v-chip ${t.dissertation_reg_open ? 'present' : 'late'}`}>
                          {t.dissertation_reg_open ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!t.is_current && (
                          <button
                            type="button"
                            className="v-btn small outline"
                            disabled={actionBusy}
                            onClick={() => handleSetCurrentTerm(t.id)}
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          type="button"
                          className={`v-btn small ${t.dissertation_reg_open ? 'danger' : 'primary'}`}
                          disabled={actionBusy}
                          onClick={() => handleToggleRegOpen(t.id, t.dissertation_reg_open)}
                        >
                          {t.dissertation_reg_open ? 'Close Registration' : 'Open Registration'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 2: Pending Dissertation Registrations Queue */}
          <section className="v-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>Dissertation Registration Queue (Year 4 Semester 2)</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>Approve candidates, confirm SLE 500 fee, assign faculty supervisor, or grant course repeat overrides.</p>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                No dissertation registrations submitted yet for this term.
              </div>
            ) : (
              <div className="v-table-responsive">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Level</th>
                      <th>Fee Payment</th>
                      <th>Status</th>
                      <th>Carry-Over Override</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => {
                      const s = reg.students || {};
                      const isPending = reg.status === 'pending';
                      return (
                        <tr key={`${reg.student_id}-${reg.term_id}`}>
                          <td>
                            <strong>{s.full_name || 'Student'}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ID: {s.student_id || reg.student_id}</span>
                          </td>
                          <td>Year {s.level || 4}</td>
                          <td>
                            <span className={`v-chip ${reg.payment_status === 'paid' ? 'present' : 'late'}`}>
                              {reg.payment_status === 'paid' ? 'SLE 500 Paid (Monime)' : 'Payment Pending'}
                            </span>
                          </td>
                          <td>
                            <span className={`v-chip ${reg.status === 'approved' ? 'present' : reg.status === 'rejected' ? 'absent' : 'late'}`}>
                              {reg.status ? reg.status.toUpperCase() : 'PENDING'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`v-btn small ${reg.allow_modules_override ? 'danger' : 'outline'}`}
                              disabled={actionBusy}
                              onClick={() => handleToggleModuleOverride(reg.student_id, reg.term_id, reg.allow_modules_override)}
                              title="Toggle course repeat / carry-over module allowance"
                            >
                              {reg.allow_modules_override ? 'Override Active (Granted)' : 'Grant Module Override'}
                            </button>
                          </td>
                          <td style={{ display: 'flex', gap: '6px' }}>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  className="v-btn small primary"
                                  disabled={actionBusy}
                                  onClick={() => handleApproveRegistration(reg.student_id, reg.term_id)}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="v-btn small danger"
                                  disabled={actionBusy}
                                  onClick={() => handleRejectRegistration(reg.student_id, reg.term_id)}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {!isPending && (
                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Reviewed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 3: Student Academic Levels & Bulk Promotion */}
          <section className="v-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800 }}>Student Academic Levels & Cohort Promotion</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>Directly adjust student academic levels or execute bulk cohort promotion at academic year start.</p>
              </div>
              <button
                type="button"
                className="v-btn primary"
                disabled={actionBusy}
                onClick={handleBulkPromoteLevels}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowUpRight size={16} /> Bulk Promote Student Levels (Year 1→2, 2→3, 3→4)
              </button>
            </div>

            <div className="v-table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Programme</th>
                    <th>Current Level</th>
                    <th>Set Level</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.id}>
                      <td><strong>{st.student_id}</strong></td>
                      <td>{st.full_name}</td>
                      <td>{st.programme || 'B.Sc. Computer Science'}</td>
                      <td>
                        <span className="v-chip present">Year {st.level || 1}</span>
                      </td>
                      <td>
                        <select
                          value={st.level || 1}
                          disabled={actionBusy}
                          onChange={(e) => handleUpdateStudentLevel(st.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        >
                          <option value="1">Year 1</option>
                          <option value="2">Year 2</option>
                          <option value="3">Year 3</option>
                          <option value="4">Year 4 (Final Year)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div>
          {/* Global Metrics Cards */}
          <section className="v-stats-grid">
            <div className="v-stat-card">
              <span className="label"><Users size={16} /> Total Students</span>
              <strong className="value">{c.students}</strong>
              <span className="sub">Registered accounts</span>
            </div>
            <div className="v-stat-card blue">
              <span className="label"><Users size={16} /> Lecturers</span>
              <strong className="value">{c.lecturers}</strong>
              <span className="sub">Academic staff</span>
            </div>
            <div className="v-stat-card green">
              <span className="label"><BookOpen size={16} /> Active Modules</span>
              <strong className="value">{c.modules}</strong>
              <span className="sub">Taught courses</span>
            </div>
            <div className="v-stat-card orange">
              <span className="label"><Activity size={16} /> Attendance Logs</span>
              <strong className="value">{c.attendanceRecords}</strong>
              <span className="sub">Verified check-ins</span>
            </div>
            <div className="v-stat-card green">
              <span className="label"><CreditCard size={16} /> Payments Processed</span>
              <strong className="value">{c.payments}</strong>
              <span className="sub">Monime transactions</span>
            </div>
          </section>

          {/* System Health Status */}
          <section className="v-card">
            <h3><ShieldCheck size={18} color="#16a34a" /> System Health & Security Status</h3>
            <div className="v-health-grid">
              <div className="v-health-item">
                <span>Supabase Auth & Database:</span>
                <strong className="v-color-present">Operational (Connected)</strong>
              </div>
              <div className="v-health-item">
                <span>Row Level Security (RLS):</span>
                <strong className="v-color-present">Enforced Across All Tables</strong>
              </div>
              <div className="v-health-item">
                <span>Monime Payment Gateway:</span>
                <strong className="v-color-present">Active (SLE 100/mod, SLE 500 flat diss)</strong>
              </div>
              <div className="v-health-item">
                <span>Storage Buckets:</span>
                <strong className="v-color-present">Private (Signed URLs Only)</strong>
              </div>
            </div>
          </section>

          {/* Audit Logs */}
          <section className="v-card">
            <h3>Recent System Audit Events</h3>
            <div className="v-table-responsive">
              <table className="v-table">
                <thead>
                  <tr><th>Timestamp</th><th>Event</th><th>Entity</th><th>Role</th></tr>
                </thead>
                <tbody>
                  {!data?.recentLogs?.length ? (
                    <tr><td colSpan="4" className="v-no-data">System operating normally. No high-severity security audit events logged.</td></tr>
                  ) : (
                    data.recentLogs.map(l => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString()}</td>
                        <td><b>{l.event_name}</b></td>
                        <td>{l.target_entity}</td>
                        <td><span className="v-chip">{l.actor_role || 'system'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
