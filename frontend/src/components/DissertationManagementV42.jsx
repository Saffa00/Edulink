import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, FileText, CheckCircle2, AlertCircle, Upload, Download,
  Clock, ChevronRight, MessageSquare, Award, RefreshCw, UserCheck,
  Search, Filter, Check, X, Users, AlertTriangle, ArrowRight, ShieldCheck
} from 'lucide-react';
import {
  getStudentDissertation, registerDissertationTopic, submitDissertationChapterFile,
  getSupervisedDissertations, getUnassignedDissertations, claimSupervisee,
  reviewDissertationVersion, getAvailableSupervisors
} from '../services/academicMasterV41toV55.js';
import { getSignedFileUrl } from '../services/assignmentsV40.js';

const CHAPTER_DESCRIPTIONS = {
  'Chapter 1': 'Introduction, Background, Problem Statement, Objectives & Scope',
  'Chapter 2': 'Comprehensive Literature Review & Theoretical Framework',
  'Chapter 3': 'Research Methodology, System Architecture & Design',
  'Chapter 4': 'Implementation, System Testing, Results & Analysis',
  'Chapter 5': 'Conclusion, Recommendations, Limitations & Final Defense Draft'
};

export default function DissertationManagementV42({ role = 'student', onNavigate }) {
  const [studentData, setStudentData] = useState(null);
  const [supervisedList, setSupervisedList] = useState([]);
  const [unassignedList, setUnassignedList] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Lecturer view state
  const [lecturerTab, setLecturerTab] = useState('assigned'); // 'assigned' | 'unassigned'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Topic registration state
  const [topicInput, setTopicInput] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');

  // Student Chapter upload state
  const [selectedChapter, setSelectedChapter] = useState('Chapter 1');
  const [uploadDoc, setUploadDoc] = useState(null);

  // Supervisor Review State
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewVerdict, setReviewVerdict] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 6000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (role === 'student') {
        const [data, sups] = await Promise.all([
          getStudentDissertation(),
          getAvailableSupervisors()
        ]);
        setStudentData(data);
        setSupervisors(sups || []);
        if (data?.dissertation?.current_chapter) {
          setSelectedChapter(`Chapter ${data.dissertation.current_chapter}`);
        }
      } else {
        const assigned = await getSupervisedDissertations();
        setSupervisedList(assigned || []);
        setUnassignedList([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dissertation information.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegisterTopic = async (e) => {
    e.preventDefault();
    if (!topicInput.trim()) return setError('Please enter a dissertation research topic title.');
    try {
      setActionBusy(true);
      await registerDissertationTopic(topicInput, selectedSupervisorId || null);
      setMessage('Dissertation topic proposed successfully. You can now begin drafting Chapter 1.');
      setTopicInput('');
      setSelectedSupervisorId('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to register topic.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    if (!uploadDoc) return setError('Please select a document file (.pdf, .docx, .doc, or .zip) to submit.');
    if (!studentData?.dissertation?.id) return setError('Dissertation topic record not found.');
    try {
      setActionBusy(true);
      await submitDissertationChapterFile({
        dissertationId: studentData.dissertation.id,
        chapterName: selectedChapter,
        file: uploadDoc
      });
      setMessage(`${selectedChapter} submitted successfully. Your supervisor has been notified for review.`);
      setUploadDoc(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDownload = async (filePath) => {
    try {
      const url = await getSignedFileUrl('dissertation-documents', filePath);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError('Could not generate download link for this draft.');
      }
    } catch (err) {
      setError('Download failed.');
    }
  };

  const handleClaimStudent = async (dissertationId, studentName) => {
    try {
      setActionBusy(true);
      await claimSupervisee(dissertationId);
      setMessage(`You are now supervising ${studentName}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to accept student supervision.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    try {
      setActionBusy(true);
      await reviewDissertationVersion({
        versionId: reviewModalItem.versionId,
        dissertationId: reviewModalItem.dissertationId,
        status: reviewVerdict,
        comments: reviewNotes
      });
      setMessage(`Verdict recorded for ${reviewModalItem.chapter}. Student has been notified.`);
      setReviewModalItem(null);
      setReviewNotes('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to record review.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="v-master-wrap">
        <div className="v-card text-center" style={{ padding: '60px 20px' }}>
          <RefreshCw className="v-spin" size={32} style={{ color: '#2563eb', margin: '0 auto 16px' }} />
          <h3>Loading Dissertation Workspace…</h3>
          <p style={{ color: '#64748b' }}>Connecting to research records and chapter submissions</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STUDENT WORKSPACE VIEW
  // ============================================================================
  if (role === 'student') {
    const diss = studentData?.dissertation;
    const chapters = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];
    const currentCh = diss?.current_chapter || 1;
    const isCorrectionsRequired = diss?.status === 'corrections_required';
    const isFullyApproved = diss?.status === 'approved' && currentCh === 5;
    const supervisor = diss?.lecturers;

    return (
      <div className="v-master-wrap">
        <header className="v-master-header">
          <div>
            <h1>Dissertation & Thesis Workspace</h1>
            <p>Supervised academic research, chapter 1 to 5 progression, feedback, and defense clearance.</p>
          </div>
          {supervisor && (
            <div style={{ textAlign: 'right' }}>
              <span className="v-sub" style={{ display: 'block', fontSize: '0.8rem' }}>Assigned Supervisor</span>
              <strong style={{ color: '#0f172a' }}>{supervisor.full_name}</strong>
            </div>
          )}
        </header>

        {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
        {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

        {!diss ? (
          <section className="v-card v-create-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <BookOpen size={28} style={{ color: '#2563eb' }} />
              <div>
                <h2 style={{ margin: 0 }}>Register Dissertation Topic Proposal</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Propose your undergraduate or postgraduate research topic to begin chapter drafting and supervisor assignment.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterTopic} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Proposed Research Topic / Dissertation Title:
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Design and Implementation of a Secure Campus PWA for Goderich Campus"
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Preferred Academic Supervisor (Optional):
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={e => setSelectedSupervisorId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Let Department Assign Supervisor --</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.department ? `(${s.department})` : ''} {s.teaching_area ? `— ${s.teaching_area}` : ''}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                  If left unassigned, faculty lecturers in your department will review and claim your research topic.
                </small>
              </div>

              <div style={{ marginTop: '8px' }}>
                <button type="submit" className="v-btn primary" disabled={actionBusy}>
                  {actionBusy ? 'Submitting Topic…' : 'Submit Dissertation Proposal'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            {/* Dissertation Overview Hero Card */}
            <section className="v-card v-diss-hero">
              <div className="v-diss-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className={`v-status-pill ${diss.status}`}>
                      {diss.status === 'corrections_required' ? 'CORRECTIONS REQUIRED' : diss.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Stage: <b>Chapter {currentCh} of 5</b>
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', margin: '0 0 10px', color: '#0f172a' }}>{diss.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                    <Users size={16} />
                    <span>Supervisor: <b>{supervisor?.full_name || 'Department Assigned Pending'}</b></span>
                    {supervisor?.email && <small>({supervisor.email})</small>}
                  </div>
                </div>

                <div className="v-progress-radial" style={{ textAlign: 'center', background: '#f8fafc', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ fontSize: '1.8rem', color: '#2563eb', display: 'block' }}>
                    {diss.progress_percentage || (currentCh * 20)}%
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isFullyApproved ? 'Defense Ready' : 'Overall Progress'}
                  </span>
                </div>
              </div>

              {/* 5-Chapter Stepper */}
              <div className="v-stepper" style={{ margin: '30px 0 16px' }}>
                {chapters.map((ch, idx) => {
                  const chNum = idx + 1;
                  const isDone = currentCh > chNum || (isFullyApproved && chNum === 5);
                  const isCurrent = currentCh === chNum && !isFullyApproved;
                  return (
                    <div
                      key={ch}
                      className={`v-step-node ${isDone ? 'done' : isCurrent ? 'active' : ''}`}
                      onClick={() => setSelectedChapter(ch)}
                      style={{ cursor: 'pointer' }}
                      title={`Click to view/submit ${ch}`}
                    >
                      <span className="v-step-circle">
                        {isDone ? <Check size={16} /> : chNum}
                      </span>
                      <small style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#2563eb' : '#64748b' }}>
                        {ch}
                      </small>
                    </div>
                  );
                })}
              </div>

              {/* Current Chapter Description Pill */}
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '10px 14px', border: '1px solid #bfdbfe', fontSize: '0.88rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} />
                <span><b>{selectedChapter}:</b> {CHAPTER_DESCRIPTIONS[selectedChapter] || 'Dissertation research documentation'}</span>
              </div>
            </section>

            {/* Supervisor Feedback Banner if corrections required */}
            {isCorrectionsRequired && diss.supervisor_notes && (
              <section className="v-card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <AlertTriangle size={24} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: '0 0 6px', color: '#92400e' }}>Supervisor Corrections Required</h3>
                    <p style={{ margin: 0, color: '#b45309', whiteSpace: 'pre-wrap' }}>{diss.supervisor_notes}</p>
                    <small style={{ display: 'block', marginTop: '8px', color: '#78350f', fontWeight: 600 }}>
                      Please revise your draft according to the feedback above and submit a revised version below.
                    </small>
                  </div>
                </div>
              </section>
            )}

            {/* Fully Approved Celebration */}
            {isFullyApproved && (
              <section className="v-card" style={{ borderLeft: '4px solid #16a34a', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <ShieldCheck size={32} style={{ color: '#16a34a' }} />
                  <div>
                    <h3 style={{ margin: '0 0 4px', color: '#166534' }}>Dissertation Chapters Fully Approved</h3>
                    <p style={{ margin: 0, color: '#15803d' }}>
                      Congratulations! All 5 research chapters have been reviewed and approved by your supervisor. You are cleared for final defense and thesis binding.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Chapter Submission Form */}
            {!isFullyApproved && (
              <section className="v-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Upload size={20} style={{ color: '#2563eb' }} />
                  <h3 style={{ margin: 0 }}>
                    {isCorrectionsRequired ? `Submit Revision for ${selectedChapter}` : `Submit Draft for ${selectedChapter}`}
                  </h3>
                </div>

                <form onSubmit={handleChapterSubmit} className="v-form-grid">
                  <div className="v-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Target Chapter:</label>
                    <select
                      value={selectedChapter}
                      onChange={e => setSelectedChapter(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="v-form-group">
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Document File (.pdf, .docx, .zip):
                    </label>
                    <input
                      required
                      type="file"
                      accept=".pdf,.doc,.docx,.zip"
                      onChange={e => setUploadDoc(e.target.files?.[0] || null)}
                      style={{ width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="v-form-group full-width">
                    <button type="submit" className="v-btn primary" disabled={actionBusy}>
                      {actionBusy ? 'Uploading Document…' : (isCorrectionsRequired ? `Upload Revised ${selectedChapter} Draft` : `Upload ${selectedChapter} Draft`)}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Version History & Feedback Table */}
            <section className="v-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Version History & Review Records</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {studentData.versions.length} draft{studentData.versions.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              <div className="v-table-responsive">
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>Version</th>
                      <th>Submitted Date</th>
                      <th>Review Status</th>
                      <th>Supervisor Notes</th>
                      <th>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!studentData.versions.length ? (
                      <tr>
                        <td colSpan="6" className="v-no-data" style={{ textAlign: 'center', padding: '32px' }}>
                          No chapter drafts submitted yet. Upload Chapter 1 to start supervision.
                        </td>
                      </tr>
                    ) : (
                      studentData.versions.map(v => (
                        <tr key={v.id}>
                          <td><b>{v.chapter}</b></td>
                          <td><span className="v-id-badge">v{v.version_number}</span></td>
                          <td>{new Date(v.submitted_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`v-status-pill ${v.status}`}>
                              {v.status === 'corrections_needed' ? 'CORRECTIONS' : v.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            {v.lecturer_comment ? (
                              <span>{v.lecturer_comment}</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending review</span>
                            )}
                          </td>
                          <td>
                            <button className="v-btn-mini secondary" onClick={() => handleDownload(v.file_url)}>
                              <Download size={13} /> Download
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // LECTURER SUPERVISION VIEW
  // ============================================================================
  const filteredAssigned = supervisedList.filter(item => {
    const student = item.students || {};
    const matchesSearch = !searchQuery ||
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id?.includes(searchQuery) ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return item.status === 'chapter_review' || item.status === 'proposal';
    if (statusFilter === 'corrections') return item.status === 'corrections_required';
    if (statusFilter === 'approved') return item.status === 'approved';
    return true;
  });

  const pendingReviewCount = supervisedList.filter(s => s.status === 'chapter_review' || s.status === 'proposal').length;
  const approvedCount = supervisedList.filter(s => s.status === 'approved').length;

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Dissertation & Thesis Supervision</h1>
          <p>Supervise assigned undergraduate research students, review chapter progression, and approve defense drafts.</p>
        </div>
      </header>

      {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

      {/* Top Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#0f172a', display: 'block' }}>{supervisedList.length}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Active Supervisees</span>
        </div>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#f59e0b', display: 'block' }}>{pendingReviewCount}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Drafts Pending Review</span>
        </div>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#16a34a', display: 'block' }}>{approvedCount}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Approved for Defense</span>
        </div>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#0284c7', display: 'block' }}>
            {supervisedList.filter(s => s.defense_date).length}
          </strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Defenses Scheduled</span>
        </div>
      </div>

      {/* Supervisees Area */}

      {/* ASSIGNED SUPERVISEES TAB */}
      {lecturerTab === 'assigned' && (
        <>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search by student name, ID, or title…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="corrections">Corrections Required</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          <div className="v-cards-grid">
            {!filteredAssigned.length ? (
              <div className="v-card v-no-data full-width" style={{ textAlign: 'center', padding: '40px' }}>
                <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                <h3>No Supervisees Found</h3>
                <p style={{ color: '#64748b' }}>
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Check the "Unassigned Research Topics" tab to claim students in your department.'}
                </p>
              </div>
            ) : (
              filteredAssigned.map(item => {
                const student = item.students;
                const latestVer = item.dissertation_versions?.[0];
                return (
                  <article key={item.id} className="v-card v-supervisee-card">
                    <div className="v-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="v-id-badge">{student?.student_id || 'STU'}</span>
                      <span className={`v-status-pill ${item.status}`}>
                        {item.status === 'corrections_required' ? 'CORRECTIONS' : item.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px', color: '#0f172a' }}>{item.title}</h3>
                    <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 12px' }}>
                      <b>{student?.full_name}</b> · {student?.programme || 'Undergraduate'}
                    </p>

                    <div className="v-meta-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                      <span>Current Stage: <b>Chapter {item.current_chapter || 1}</b></span>
                      <span>Progress: <b>{item.progress_percentage || 20}%</b></span>
                    </div>

                    {latestVer ? (
                      <div className="v-latest-draft-box" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem' }}>
                            Latest: <b>{latestVer.chapter} (v{latestVer.version_number})</b>
                          </span>
                          <span className={`v-status-pill ${latestVer.status}`} style={{ fontSize: '0.75rem' }}>
                            {latestVer.status}
                          </span>
                        </div>
                        <div className="v-action-row" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="v-btn-mini secondary"
                            onClick={() => handleDownload(latestVer.file_url)}
                            style={{ flex: 1 }}
                          >
                            <Download size={13} /> Download File
                          </button>
                          <button
                            className="v-btn-mini primary"
                            onClick={() => setReviewModalItem({
                              dissertationId: item.id,
                              versionId: latestVer.id,
                              title: item.title,
                              studentName: student?.full_name,
                              chapter: latestVer.chapter,
                              versionNumber: latestVer.version_number,
                              fileUrl: latestVer.file_url
                            })}
                            style={{ flex: 1 }}
                          >
                            Review Draft
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                        Awaiting student's Chapter 1 draft upload.
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* UNASSIGNED TOPICS TAB */}
      {lecturerTab === 'unassigned' && (
        <div className="v-cards-grid">
          {!unassignedList.length ? (
            <div className="v-card v-no-data full-width" style={{ textAlign: 'center', padding: '40px' }}>
              <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
              <h3>All Topics Assigned</h3>
              <p style={{ color: '#64748b' }}>Every registered research student currently has an assigned supervisor.</p>
            </div>
          ) : (
            unassignedList.map(item => {
              const student = item.students;
              return (
                <article key={item.id} className="v-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="v-id-badge">{student?.student_id || 'STU'}</span>
                      <span className="v-status-pill yellow">Awaiting Supervisor</span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px', color: '#0f172a' }}>{item.title}</h3>
                    <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 12px' }}>
                      <b>{student?.full_name}</b> · {student?.programme || 'Undergraduate'}
                    </p>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                      Proposed: {new Date(item.created_at || item.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    className="v-btn primary"
                    onClick={() => handleClaimStudent(item.id, student?.full_name || 'Student')}
                    disabled={actionBusy}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <UserCheck size={16} /> Accept Supervision
                  </button>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* SUPERVISOR REVIEW MODAL */}
      {reviewModalItem && (
        <div className="v-modal-overlay">
          <div className="v-modal-card" style={{ maxWidth: '520px' }}>
            <div className="v-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Review {reviewModalItem.chapter} (v{reviewModalItem.versionNumber})</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{reviewModalItem.studentName} · {reviewModalItem.title}</span>
              </div>
              <button className="v-close-btn" onClick={() => setReviewModalItem(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveReview} className="v-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: '#475569' }}>Submitted Document:</span>
                <button
                  type="button"
                  className="v-btn-mini secondary"
                  onClick={() => handleDownload(reviewModalItem.fileUrl)}
                >
                  <Download size={13} /> Download File
                </button>
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Review Verdict:</label>
                <select
                  value={reviewVerdict}
                  onChange={e => setReviewVerdict(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="approved">Approved (Advance student to next chapter)</option>
                  <option value="corrections_needed">Corrections Required (Request revised submission)</option>
                  <option value="rejected">Rejected (Needs complete resubmission)</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Detailed Supervisor Feedback & Corrections:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Specify academic feedback, literature suggestions, methodology corrections, or next chapter goals…"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div className="v-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="v-btn outline" onClick={() => setReviewModalItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="v-btn primary" disabled={actionBusy}>
                  {actionBusy ? 'Saving Verdict…' : 'Record Review & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
