import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ClipboardList, Plus, FileText, CheckCircle2, AlertCircle, Clock,
  Upload, Download, Award, ChevronRight, MessageSquare, History,
  FileCheck, Calendar, X, RefreshCw, Filter, Search, ShieldCheck
} from 'lucide-react';
import {
  getLecturerModules,
  getLecturerAssignments,
  createAssignmentWithBrief,
  getAssignmentSubmissionsWithRoster,
  gradeStudentSubmission,
  getStudentAssignments,
  submitStudentAssignment,
  getSignedFileUrl
} from '../services/assignmentsV40';

export default function AssignmentManagementV40({ role = 'lecturer', initialAssignmentId = null, onNavigate, scopedModule = null }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(scopedModule?.id || '');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(initialAssignmentId);
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    if (scopedModule?.id) {
      setSelectedModuleId(scopedModule.id);
      setForm(f => ({ ...f, module_id: scopedModule.id }));
    }
  }, [scopedModule]);

  // Student specific state
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');

  // Lecturer Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [gradeStatus, setGradeStatus] = useState('graded');

  // Loading & feedback
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Create Form State
  const [form, setForm] = useState({
    module_id: '',
    title: '',
    description: '',
    due_at: '',
    max_mark: 100,
    allow_late: true,
    grace_period_hours: 0
  });
  const [briefFile, setBriefFile] = useState(null);

  // Roster Filter in Review
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'submitted' | 'graded' | 'pending' | 'unsubmitted'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  // Load lecturer or student assignments
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (role === 'lecturer') {
        const [mods, list] = await Promise.all([
          getLecturerModules(),
          getLecturerAssignments(selectedModuleId || null)
        ]);
        setModules(mods);
        setAssignments(list);
        if (list.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(list[0].id);
        }
      } else {
        const { student, assignments: sList } = await getStudentAssignments();
        setStudentProfile(student);
        setStudentAssignments(sList);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignment data.');
    } finally {
      setLoading(false);
    }
  }, [role, selectedModuleId, selectedAssignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load submissions for selected assignment
  const loadSubmissions = useCallback(async (assignmentId) => {
    if (!assignmentId || role !== 'lecturer') return;
    try {
      setReviewLoading(true);
      const data = await getAssignmentSubmissionsWithRoster(assignmentId);
      setReviewData(data);
    } catch (err) {
      setError(err.message || 'Failed to load submissions for this assignment.');
    } finally {
      setReviewLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (selectedAssignmentId && role === 'lecturer') {
      loadSubmissions(selectedAssignmentId);
    }
  }, [selectedAssignmentId, role, loadSubmissions]);

  // Open Grading Modal
  const handleOpenGrading = (sub) => {
    setGradingSubmission(sub);
    setGradeScore(sub.mark != null ? String(sub.mark) : '');
    setGradeComment(sub.lecturerComment || '');
    setGradeStatus(sub.status === 'needs_revision' ? 'needs_revision' : 'graded');
  };

  // Submit Grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      setActionBusy(true);
      const maxMark = reviewData?.assignment?.max_mark || 100;
      if (gradeScore !== '' && (Number(gradeScore) < 0 || Number(gradeScore) > maxMark)) {
        throw new Error(`Grade must be between 0 and ${maxMark}.`);
      }
      await gradeStudentSubmission({
        submissionId: gradingSubmission.submissionId,
        mark: gradeScore === '' ? null : Number(gradeScore),
        comment: gradeComment,
        status: gradeStatus
      });
      setMessage(`Grade and feedback recorded for ${gradingSubmission.fullName}.`);
      setGradingSubmission(null);
      await loadSubmissions(selectedAssignmentId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save grade.');
    } finally {
      setActionBusy(false);
    }
  };

  // Download Brief or Submission file - supports mobile Chrome, Safari, and Desktop
  const handleDownloadFile = async (bucket, filePath, fileName = 'academic_document') => {
    try {
      setError('');
      const url = await getSignedFileUrl(bucket, filePath);
      if (url) {
        // 1. Programmatic anchor click for mobile Safari, Chrome & Desktop
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 300);

        // 2. Mobile WebView / Capacitor / Cordova system browser fallback
        if (window?.cordova?.InAppBrowser) {
          window.cordova.InAppBrowser.open(url, '_system');
        } else {
          // Detect mobile devices to ensure external browser opens
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isMobile) {
            const popup = window.open(url, '_system') || window.open(url, '_blank');
            if (!popup) {
              window.location.assign(url);
            }
          }
        }
      } else {
        setError('Unable to generate secure download link.');
      }
    } catch (err) {
      setError(err.message || 'File download failed.');
    }
  };

  // Create Assignment Submit
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      setActionBusy(true);
      const created = await createAssignmentWithBrief(form, briefFile);
      setMessage(`Assignment "${created.title}" published successfully.`);
      setForm({
        module_id: '',
        title: '',
        description: '',
        due_at: '',
        max_mark: 100,
        allow_late: true,
        grace_period_hours: 0
      });
      setBriefFile(null);
      setActiveTab('list');
      await loadData();
      setSelectedAssignmentId(created.id);
    } catch (err) {
      setError(err.message || 'Failed to create assignment.');
    } finally {
      setActionBusy(false);
    }
  };

  // Student Submit Assignment File
  const handleStudentSubmit = async (e, assignmentId) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please choose a file to submit.');
      return;
    }
    try {
      setActionBusy(true);
      await submitStudentAssignment({
        assignmentId,
        file: uploadFile,
        notes: uploadNotes
      });
      setMessage('Assignment submitted successfully! Version recorded.');
      setSubmittingId(null);
      setUploadFile(null);
      setUploadNotes('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setActionBusy(false);
    }
  };

  // Filtered submissions list in lecturer review
  const filteredSubmissions = useMemo(() => {
    if (!reviewData?.submissions) return [];
    let list = reviewData.submissions;

    if (reviewFilter === 'submitted') {
      list = list.filter(s => s.hasSubmitted);
    } else if (reviewFilter === 'graded') {
      list = list.filter(s => s.status === 'graded');
    } else if (reviewFilter === 'pending') {
      list = list.filter(s => s.hasSubmitted && s.status !== 'graded');
    } else if (reviewFilter === 'unsubmitted') {
      list = list.filter(s => !s.hasSubmitted);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.studentId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.programme.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reviewData, reviewFilter, searchQuery]);

  if (loading) {
    return (
      <div className="v40-wrap">
        <div className="v40-card text-center">
          <RefreshCw className="v40-spin" size={28} />
          <p>Loading assignment management system…</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STUDENT VIEW
  // =========================================================================
  if (role === 'student') {
    return (
      <div className="v40-wrap">
        <header className="v40-header">
          <div>
            <h1>Student Assignments</h1>
            <p>View upcoming tasks, submit homework or coursework, and review feedback and marks.</p>
          </div>
        </header>

        {message && <div className="v40-banner success"><CheckCircle2 size={18} /> {message}</div>}
        {error && <div className="v40-banner error"><AlertCircle size={18} /> {error}</div>}

        <div className="v40-student-list">
          {!studentAssignments.length ? (
            <div className="v40-card v40-empty-state">
              <ClipboardList size={36} />
              <h3>No assignments found</h3>
              <p>You have no pending assignments for your registered modules.</p>
            </div>
          ) : (
            studentAssignments.map(a => {
              const sub = a.submission;
              const isDue = new Date(a.due_at) < new Date();
              const isSubmitting = submittingId === a.id;

              return (
                <article key={a.id} className="v40-card v40-student-card">
                  <div className="v40-card-head">
                    <div>
                      <span className="v40-module-badge">{a.modules?.code}</span>
                      <h3>{a.title}</h3>
                    </div>
                    <div className="v40-status-pills">
                      {sub ? (
                        sub.status === 'graded' ? (
                          <span className="v40-pill graded">
                            <Award size={13} /> {sub.mark} / {a.max_mark}
                          </span>
                        ) : sub.is_late ? (
                          <span className="v40-pill late">Submitted Late (v{sub.version_number})</span>
                        ) : (
                          <span className="v40-pill submitted">Submitted (v{sub.version_number})</span>
                        )
                      ) : isDue ? (
                        <span className="v40-pill past-due">Deadline Passed</span>
                      ) : (
                        <span className="v40-pill pending">Pending Submission</span>
                      )}
                    </div>
                  </div>

                  <p className="v40-assignment-desc">{a.description}</p>

                  <div className="v40-meta-strip">
                    <span>
                      <Calendar size={14} /> Due: <b>{new Date(a.due_at).toLocaleString()}</b>
                    </span>
                    <span>
                      <Award size={14} /> Max Marks: <b>{a.max_mark}</b>
                    </span>
                    {a.brief_file_path && (
                      <button
                        type="button"
                        className="v40-link-btn"
                        onClick={() => handleDownloadFile('assignment-briefs', a.brief_file_path)}
                      >
                        <FileText size={14} /> Download Assignment Brief
                      </button>
                    )}
                  </div>

                  {/* Submission Details If Submitted */}
                  {sub && (
                    <div className="v40-submitted-box">
                      <div className="v40-sub-header">
                        <strong><FileCheck size={16} /> Submission Receipt (Version {sub.version_number})</strong>
                        <span>Submitted on {new Date(sub.submitted_at).toLocaleString()}</span>
                      </div>
                      <div className="v40-sub-actions">
                        <button
                          type="button"
                          className="v40-btn secondary small"
                          onClick={() => handleDownloadFile('assignment-submissions', sub.file_url)}
                        >
                          <Download size={14} /> Download Submitted File
                        </button>
                        {sub.is_late && (
                          <span className="v40-late-tag">
                            Submitted {Math.round(sub.late_duration_minutes / 60)}h late
                          </span>
                        )}
                      </div>

                      {/* Feedback from Lecturer */}
                      {sub.status === 'graded' && (
                        <div className="v40-feedback-panel">
                          <div className="v40-feedback-title">
                            <Award size={16} /> <strong>Lecturer Evaluation & Feedback:</strong>
                          </div>
                          <p className="v40-feedback-text">
                            {sub.lecturer_comment || 'No written comments provided.'}
                          </p>
                          <span className="v40-score-highlight">
                            Score: <b>{sub.mark}</b> / {a.max_mark} ({Math.round((sub.mark / a.max_mark) * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Form or Resubmit Trigger */}
                  {!isSubmitting ? (
                    <div className="v40-card-actions">
                      <button
                        className="v40-btn primary"
                        onClick={() => setSubmittingId(a.id)}
                        disabled={isDue && !a.allow_late}
                      >
                        <Upload size={16} /> {sub ? 'Submit Revised Version' : 'Upload Submission'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={e => handleStudentSubmit(e, a.id)} className="v40-upload-form">
                      <div className="v40-form-group">
                        <label>Choose File (PDF, DOC, DOCX, ZIP - Max 20MB):</label>
                        <input
                          type="file"
                          required
                          accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                          onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      <div className="v40-form-group">
                        <label>Submission Notes / Remarks (Optional):</label>
                        <input
                          type="text"
                          placeholder="e.g. Added section 3 corrections"
                          value={uploadNotes}
                          onChange={e => setUploadNotes(e.target.value)}
                        />
                      </div>
                      <div className="v40-form-actions">
                        <button
                          type="button"
                          className="v40-btn outline"
                          onClick={() => { setSubmittingId(null); setUploadFile(null); }}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="v40-btn success" disabled={actionBusy}>
                          {actionBusy ? 'Uploading…' : sub ? `Upload Version ${(sub.version_number || 1) + 1}` : 'Submit File'}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LECTURER VIEW
  // =========================================================================
  const currentAssignment = assignments.find(a => a.id === selectedAssignmentId) || reviewData?.assignment;

  return (
    <div className="v40-wrap">
      {/* Header */}
      <header className="v40-header">
        <div>
          <h1>Assignment Management System</h1>
          <p>Create assignment briefs, enforce submission deadlines, review student submissions, and submit qualitative feedback.</p>
        </div>

        <div className="v40-tab-group">
          <button
            className={`v40-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <ClipboardList size={16} /> Assignments & Submissions
          </button>
          <button
            className={`v40-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={16} /> Create Assignment
          </button>
        </div>
      </header>

      {message && <div className="v40-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v40-banner error"><AlertCircle size={18} /> {error}</div>}

      {/* TAB 1: ASSIGNMENTS LIST & SUBMISSIONS REVIEW */}
      {activeTab === 'list' && (
        <>
          {/* Assignment Selector & Hero Banner */}
          <section className="v40-card v40-session-hero">
            <div className="v40-session-top">
              <div className="v40-select-box">
                <label>Select Assignment to Review:</label>
                <select
                  value={selectedAssignmentId || ''}
                  onChange={e => setSelectedAssignmentId(e.target.value)}
                  className="v40-class-select"
                >
                  {!assignments.length && <option value="">No assignments created</option>}
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.modules?.code} — {a.title} (Due: {new Date(a.due_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {currentAssignment && (
                <div className="v40-status-pill-wrap">
                  <span className={`v40-status-badge ${currentAssignment.isPastDue ? 'closed' : 'open'}`}>
                    {currentAssignment.isPastDue ? 'DEADLINE PASSED' : 'ACTIVE / OPEN'}
                  </span>
                </div>
              )}
            </div>

            {currentAssignment ? (
              <div className="v40-session-meta-grid">
                <div>
                  <strong>{currentAssignment.modules?.code} · {currentAssignment.title}</strong>
                  <span><Clock size={14} /> Due: {new Date(currentAssignment.due_at).toLocaleString()}</span>
                </div>
                <div>
                  <strong>Max Marks: {currentAssignment.max_mark}</strong>
                  <span>
                    Late submissions: <b>{currentAssignment.allow_late ? 'Allowed' : 'Blocked'}</b>
                    {currentAssignment.grace_period_hours > 0 && ` (${currentAssignment.grace_period_hours}h grace)`}
                  </span>
                </div>
                <div className="v40-session-actions">
                  {currentAssignment.brief_file_path && (
                    <button
                      className="v40-btn secondary"
                      onClick={() => handleDownloadFile('assignment-briefs', currentAssignment.brief_file_path)}
                    >
                      <FileText size={16} /> View Brief
                    </button>
                  )}
                  <button
                    className="v40-btn outline"
                    onClick={() => loadSubmissions(selectedAssignmentId)}
                    title="Refresh Submissions"
                  >
                    <RefreshCw size={16} className={reviewLoading ? 'v40-spin' : ''} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="v40-empty-state">
                <p>No assignments created yet. Click below to create your first assignment.</p>
                <button className="v40-btn primary" onClick={() => setActiveTab('create')}>
                  Create Assignment
                </button>
              </div>
            )}
          </section>

          {/* Aggregate Stats Cards */}
          {reviewData?.stats && (
            <section className="v40-stats-grid">
              <div className="v40-stat-card">
                <span className="label">Enrolled Roster</span>
                <strong className="value">{reviewData.stats.total}</strong>
                <span className="sub">Registered Students</span>
              </div>
              <div className="v40-stat-card green">
                <span className="label">Submitted</span>
                <strong className="value">{reviewData.stats.submitted}</strong>
                <span className="sub">{reviewData.stats.submissionRate}% submission rate</span>
              </div>
              <div className="v40-stat-card blue">
                <span className="label">Graded</span>
                <strong className="value">{reviewData.stats.graded}</strong>
                <span className="sub">{reviewData.stats.gradedRate}% of submissions</span>
              </div>
              <div className="v40-stat-card orange">
                <span className="label">Pending Grading</span>
                <strong className="value">{reviewData.stats.pending}</strong>
                <span className="sub">Need lecturer review</span>
              </div>
              <div className="v40-stat-card red">
                <span className="label">Late Submissions</span>
                <strong className="value">{reviewData.stats.late}</strong>
                <span className="sub">Past due date</span>
              </div>
            </section>
          )}

          {/* Submissions Roster Table */}
          {reviewData && (
            <section className="v40-card">
              <div className="v40-roster-header">
                <div className="v40-roster-title">
                  <h3>Submissions & Marking Roster</h3>
                  <span>Enrolled students cross-referenced with uploaded files</span>
                </div>

                <div className="v40-roster-controls">
                  <div className="v40-search-input-wrap">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search student ID, name, or programme..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="v40-filter-chips">
                    <button
                      className={`v40-chip ${reviewFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('all')}
                    >
                      All ({reviewData.stats.total})
                    </button>
                    <button
                      className={`v40-chip green ${reviewFilter === 'submitted' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('submitted')}
                    >
                      Submitted ({reviewData.stats.submitted})
                    </button>
                    <button
                      className={`v40-chip blue ${reviewFilter === 'graded' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('graded')}
                    >
                      Graded ({reviewData.stats.graded})
                    </button>
                    <button
                      className={`v40-chip orange ${reviewFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('pending')}
                    >
                      Pending ({reviewData.stats.pending})
                    </button>
                    <button
                      className={`v40-chip red ${reviewFilter === 'unsubmitted' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('unsubmitted')}
                    >
                      Unsubmitted ({reviewData.stats.notSubmitted})
                    </button>
                  </div>
                </div>
              </div>

              <div className="v40-table-responsive">
                <table className="v40-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Programme / Level</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                      <th>Version</th>
                      <th>Score</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredSubmissions.length && (
                      <tr>
                        <td colSpan="8" className="v40-no-records">
                          No records match the current filter or search.
                        </td>
                      </tr>
                    )}
                    {filteredSubmissions.map(s => (
                      <tr key={s.studentInternalId} className={s.hasSubmitted ? 'submitted-row' : ''}>
                        <td>
                          <span className="v40-id-badge">{s.studentId}</span>
                        </td>
                        <td>
                          <strong>{s.fullName}</strong>
                          <small className="v40-block-sub">{s.email}</small>
                        </td>
                        <td>
                          <span>{s.programme}</span>
                          <small className="v40-block-sub">Level {s.level}</small>
                        </td>
                        <td>
                          {s.hasSubmitted ? (
                            s.status === 'graded' ? (
                              <span className="v40-pill graded">GRADED</span>
                            ) : s.isLate ? (
                              <span className="v40-pill late">LATE</span>
                            ) : (
                              <span className="v40-pill submitted">SUBMITTED</span>
                            )
                          ) : (
                            <span className="v40-pill unsubmitted">NOT SUBMITTED</span>
                          )}
                        </td>
                        <td>
                          {s.submittedAt ? (
                            <span>{new Date(s.submittedAt).toLocaleString()}</span>
                          ) : (
                            <span className="v40-muted">—</span>
                          )}
                        </td>
                        <td>
                          {s.versionNumber > 0 ? (
                            <span className="v40-version-pill">v{s.versionNumber}</span>
                          ) : (
                            <span className="v40-muted">—</span>
                          )}
                        </td>
                        <td>
                          {s.mark != null ? (
                            <strong className="v40-score-tag">
                              {s.mark} / {reviewData.assignment?.max_mark}
                            </strong>
                          ) : (
                            <span className="v40-muted">Not graded</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="v40-action-buttons">
                            {s.hasSubmitted && (
                              <>
                                <button
                                  className="v40-btn-mini secondary"
                                  onClick={() => handleDownloadFile('assignment-submissions', s.fileUrl)}
                                  title="Download Submitted File"
                                >
                                  <Download size={13} /> File
                                </button>
                                <button
                                  className="v40-btn-mini primary"
                                  onClick={() => handleOpenGrading(s)}
                                  title="Enter Grade & Feedback"
                                >
                                  <Award size={13} /> Grade
                                </button>
                              </>
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

          {/* Grading Modal */}
          {gradingSubmission && (
            <div className="v40-modal-overlay">
              <div className="v40-modal-card">
                <div className="v40-modal-head">
                  <div>
                    <h3>Grade Submission: {gradingSubmission.fullName}</h3>
                    <span>Student ID: {gradingSubmission.studentId} · Version {gradingSubmission.versionNumber}</span>
                  </div>
                  <button className="v40-close-btn" onClick={() => setGradingSubmission(null)}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveGrade} className="v40-modal-form">
                  <div className="v40-form-row">
                    <div className="v40-form-group">
                      <label>Mark (Out of {reviewData?.assignment?.max_mark || 100}) *</label>
                      <input
                        required
                        type="number"
                        step="0.5"
                        min="0"
                        max={reviewData?.assignment?.max_mark || 100}
                        placeholder={`0 - ${reviewData?.assignment?.max_mark || 100}`}
                        value={gradeScore}
                        onChange={e => setGradeScore(e.target.value)}
                      />
                    </div>
                    <div className="v40-form-group">
                      <label>Marking Status</label>
                      <select value={gradeStatus} onChange={e => setGradeStatus(e.target.value)}>
                        <option value="graded">Graded (Complete)</option>
                        <option value="needs_revision">Needs Revision (Allow Resubmit)</option>
                      </select>
                    </div>
                  </div>

                  <div className="v40-form-group">
                    <label>Qualitative Feedback & Comments:</label>
                    <textarea
                      rows={4}
                      placeholder="Enter detailed constructive feedback for the student..."
                      value={gradeComment}
                      onChange={e => setGradeComment(e.target.value)}
                    />
                  </div>

                  {gradingSubmission.studentNotes && (
                    <div className="v40-note-box">
                      <strong>Student Submission Note:</strong>
                      <p>{gradingSubmission.studentNotes}</p>
                    </div>
                  )}

                  {gradingSubmission.pastVersions?.length > 0 && (
                    <div className="v40-versions-box">
                      <strong>Previous Submission Versions:</strong>
                      {gradingSubmission.pastVersions.map(pv => (
                        <div key={pv.id} className="v40-past-version-row">
                          <span>Version {pv.version_number} — {new Date(pv.submitted_at).toLocaleString()}</span>
                          <button
                            type="button"
                            className="v40-btn-mini outline"
                            onClick={() => handleDownloadFile('assignment-submissions', pv.file_url)}
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="v40-modal-actions">
                    <button
                      type="button"
                      className="v40-btn outline"
                      onClick={() => setGradingSubmission(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="v40-btn primary" disabled={actionBusy}>
                      {actionBusy ? 'Saving…' : 'Save Grade & Feedback'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: CREATE ASSIGNMENT */}
      {activeTab === 'create' && (
        <section className="v40-card v40-create-section">
          <div className="v40-section-heading">
            <h2>Create New Assignment</h2>
            <p>Publish coursework, set due dates, configure late submission policies, and attach assignment briefs.</p>
          </div>

          <form onSubmit={handleCreateAssignment} className="v40-form-grid">
            <div className="v40-form-group full-width">
              <label>Target Module *</label>
              <select
                required
                value={form.module_id}
                onChange={e => setForm({ ...form, module_id: e.target.value })}
              >
                <option value="">-- Choose Module --</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title} (Level {m.level || '—'})
                  </option>
                ))}
              </select>
            </div>

            <div className="v40-form-group full-width">
              <label>Assignment Title *</label>
              <input
                required
                type="text"
                placeholder="e.g. Distributed Consensus Implementation Assignment"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="v40-form-group full-width">
              <label>Instructions & Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Specify detailed instructions, formatting requirements, and deliverables..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="v40-form-group">
              <label>Submission Deadline *</label>
              <input
                required
                type="datetime-local"
                value={form.due_at}
                onChange={e => setForm({ ...form, due_at: e.target.value })}
              />
            </div>

            <div className="v40-form-group">
              <label>Maximum Marks *</label>
              <input
                required
                type="number"
                min="1"
                max="1000"
                value={form.max_mark}
                onChange={e => setForm({ ...form, max_mark: e.target.value })}
              />
            </div>

            <div className="v40-form-group">
              <label>Allow Late Submissions</label>
              <select
                value={form.allow_late ? 'yes' : 'no'}
                onChange={e => setForm({ ...form, allow_late: e.target.value === 'yes' })}
              >
                <option value="yes">Yes (Flag as late)</option>
                <option value="no">No (Strict deadline cut-off)</option>
              </select>
            </div>

            <div className="v40-form-group">
              <label>Grace Period (Hours)</label>
              <input
                type="number"
                min="0"
                max="72"
                value={form.grace_period_hours}
                onChange={e => setForm({ ...form, grace_period_hours: e.target.value })}
              />
            </div>

            <div className="v40-form-group full-width">
              <label>Attach Assignment Brief / Question Paper (PDF, DOCX, ZIP):</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.zip,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                onChange={e => setBriefFile(e.target.files?.[0] || null)}
              />
              <small className="v40-block-sub">Optional. Students can download this document directly from their portal.</small>
            </div>

            <div className="v40-form-actions full-width">
              <button type="submit" className="v40-btn primary large" disabled={actionBusy}>
                {actionBusy ? 'Publishing Assignment…' : 'Publish Assignment to Students'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
