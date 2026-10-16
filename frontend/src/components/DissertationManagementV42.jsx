import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, FileText, CheckCircle2, AlertCircle, Upload, Download,
  Clock, ChevronRight, MessageSquare, Award, RefreshCw, UserCheck,
  Search, Filter, Check, X, Users, AlertTriangle, ArrowRight, ShieldCheck,
  UserX, Settings, Send, Info
} from 'lucide-react';
import {
  getStudentDissertation, registerDissertationTopic, submitDissertationChapterFile,
  getSupervisedDissertations, reviewDissertationVersion, getAvailableSupervisors,
  getDepartmentSupervisors, getLecturerSupervisionRequests, confirmDissertationRequest,
  declineDissertationRequest, releaseDissertationStudent, getSupervisorProfile,
  saveSupervisorProfile
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
  const [supervisionRequests, setSupervisionRequests] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [profileData, setProfileData] = useState({
    department: 'Department of Computer Science',
    research_areas: ['Software Engineering', 'Information Systems'],
    max_students: 5,
    accepting_students: true,
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Lecturer view state: 'assigned' | 'requests' | 'profile'
  const [lecturerTab, setLecturerTab] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Decline request modal state
  const [declineModalItem, setDeclineModalItem] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Release student modal state
  const [releaseModalItem, setReleaseModalItem] = useState(null);
  const [releaseReason, setReleaseReason] = useState('');

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
          getDepartmentSupervisors()
        ]);
        setStudentData(data);
        setSupervisors(sups || []);
        if (data?.dissertation?.current_chapter) {
          setSelectedChapter(`Chapter ${data.dissertation.current_chapter}`);
        }
      } else {
        const [assigned, reqs] = await Promise.all([
          getSupervisedDissertations(),
          getLecturerSupervisionRequests()
        ]);
        setSupervisedList(assigned || []);
        setSupervisionRequests(reqs || []);

        try {
          const prof = await getSupervisorProfile();
          if (prof) setProfileData(prof);
        } catch {}
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

  const handleConfirmRequest = async (requestId, studentName) => {
    try {
      setActionBusy(true);
      await confirmDissertationRequest(requestId);
      setMessage(`Successfully confirmed ${studentName} as your supervisee!`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to confirm request.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeclineRequestSubmit = async (e) => {
    e.preventDefault();
    if (!declineModalItem?.id) return;
    try {
      setActionBusy(true);
      await declineDissertationRequest(declineModalItem.id, declineReason);
      setMessage(`Supervision request declined. The student has been notified.`);
      setDeclineModalItem(null);
      setDeclineReason('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to decline request.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReleaseStudentSubmit = async (e) => {
    e.preventDefault();
    if (!releaseModalItem?.id) return;
    try {
      setActionBusy(true);
      await releaseDissertationStudent(releaseModalItem.id, releaseReason);
      setMessage(`Student released from supervision pairing.`);
      setReleaseModalItem(null);
      setReleaseReason('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to release student.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setActionBusy(true);
      await saveSupervisorProfile({
        department: profileData.department,
        researchAreas: profileData.research_areas,
        maxStudents: profileData.max_students,
        acceptingStudents: profileData.accepting_students,
        bio: profileData.bio
      });
      setMessage('Supervision profile updated successfully! Eligible final-year students in your department will see your updated availability.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save supervision profile.');
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

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    try {
      setActionBusy(true);
      await reviewDissertationVersion({
        versionId: reviewModalItem.versionId,
        dissertationId: reviewModalItem.dissertationId,
        status: reviewVerdict === 'approved' ? 'approved' : reviewVerdict === 'corrections_needed' ? 'corrections_needed' : 'rejected',
        comments: reviewNotes
      });
      setMessage(`Review feedback recorded for ${reviewModalItem.chapter}. Student has been notified.`);
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
          <p style={{ color: '#64748b' }}>Connecting to research records and supervision details</p>
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
            <p>Supervised academic research, chapter 1 to 5 progression, supervisor feedback, and defense clearance.</p>
          </div>
          {supervisor && (
            <div style={{ textAlign: 'right' }}>
              <span className="v-sub" style={{ display: 'block', fontSize: '0.8rem' }}>Faculty Supervisor</span>
              <strong style={{ color: '#0f172a' }}>{supervisor.full_name}</strong>
            </div>
          )}
        </header>

        {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
        {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

        {!diss ? (
          <section className="v-card v-create-box" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <BookOpen size={36} style={{ color: '#0284c7', margin: '0 auto 14px' }} />
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>Choose Your Faculty Supervisor</h2>
            <p style={{ margin: '0 auto 20px auto', maxWidth: '480px', color: '#64748b', fontSize: '13.5px', lineHeight: 1.5 }}>
              Under institutional guidelines for Year 4 Semester 2, you directly choose a supervisor in your department with your proposed topic and abstract.
            </p>
            <button
              type="button"
              className="v-btn primary"
              onClick={() => onNavigate?.('home')}
              style={{ padding: '12px 24px', fontWeight: 700 }}
            >
              Select Department Supervisor on Home Screen
            </button>
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
                    <span>Supervisor: <b>{supervisor?.full_name || 'Department Faculty Supervisor'}</b></span>
                    {supervisor?.email && <span>({supervisor.email})</span>}
                  </div>
                </div>

                <div className="v-diss-progress-box" style={{ minWidth: '180px', textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
                    {diss.progress_percentage || 20}%
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Overall Completion</span>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${diss.progress_percentage || 20}%`, background: '#2563eb', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>

              {/* Defense Scheduled Notice */}
              {diss.defense_date && (
                <div className="v-defense-alert" style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Award size={24} style={{ color: '#16a34a' }} />
                  <div>
                    <strong style={{ color: '#166534' }}>Final Defense Scheduled!</strong>
                    <div style={{ color: '#15803d', fontSize: '0.9rem' }}>
                      Date: {new Date(diss.defense_date).toLocaleString()} • Venue: {diss.defense_location || 'Main Auditorium'}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Chapter Stepper Tracker */}
            <section className="v-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Chapter Milestones & Review Progression</h3>
              <div className="v-chapter-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {chapters.map((chName, idx) => {
                  const chNum = idx + 1;
                  const isDone = currentCh > chNum || (currentCh === 5 && diss.status === 'approved');
                  const isCurrent = currentCh === chNum && !isDone;
                  return (
                    <div
                      key={chName}
                      className={`v-ch-card ${isDone ? 'done' : isCurrent ? 'active' : 'locked'}`}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#e2e8f0'}`,
                        background: isDone ? '#f0fdf4' : isCurrent ? '#eff6ff' : '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isDone ? '#166534' : isCurrent ? '#1e40af' : '#64748b' }}>
                          {chName}
                        </span>
                        {isDone ? (
                          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                        ) : isCurrent ? (
                          <Clock size={18} style={{ color: '#2563eb' }} />
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Locked</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                        {CHAPTER_DESCRIPTIONS[chName]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Submission Section */}
            {!isFullyApproved && (
              <section className="v-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Upload size={20} style={{ color: '#2563eb' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Submit Draft for Review</h3>
                </div>

                {isCorrectionsRequired && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 600, marginBottom: '4px' }}>
                      <AlertTriangle size={16} /> Corrections Requested by Supervisor
                    </div>
                    <div style={{ color: '#92400e', fontSize: '0.9rem' }}>
                      Please review your supervisor's feedback below, revise your chapter draft, and upload version 2 (or higher).
                    </div>
                  </div>
                )}

                <form onSubmit={handleChapterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Current Chapter Stage:</label>
                      <select
                        value={selectedChapter}
                        onChange={e => setSelectedChapter(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        {chapters.map((ch, i) => (
                          <option key={ch} value={ch} disabled={i + 1 > currentCh}>
                            {ch} {i + 1 === currentCh ? '(Active Stage)' : i + 1 < currentCh ? '(Completed)' : '(Locked)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                        Attach Chapter Document (.pdf, .docx, .zip):
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.zip"
                        onChange={e => setUploadDoc(e.target.files?.[0] || null)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="submit" className="v-btn primary" disabled={actionBusy || !uploadDoc}>
                      {actionBusy ? 'Uploading & Submitting…' : `Submit ${selectedChapter} Draft`}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Submission History and Supervisor Feedback */}
            <section className="v-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>Chapter Submission History & Feedback Log</h3>
              {!studentData.versions?.length ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No chapter drafts submitted yet. Upload Chapter 1 above to initiate supervisor review.
                </div>
              ) : (
                <div className="v-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {studentData.versions.map(ver => (
                    <article
                      key={ver.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{ver.chapter}</strong>
                          <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                            Version {ver.version_number} · {new Date(ver.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`v-status-pill ${ver.status}`}>
                            {ver.status === 'corrections_needed' ? 'CORRECTIONS NEEDED' : ver.status.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            className="v-btn-mini secondary"
                            onClick={() => handleDownload(ver.file_url)}
                          >
                            <Download size={13} /> Download
                          </button>
                        </div>
                      </div>

                      {ver.lecturer_comment && (
                        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #2563eb', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            Supervisor Feedback:
                          </span>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b' }}>
                            {ver.lecturer_comment}
                          </p>
                          {ver.reviewed_at && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                              Reviewed on {new Date(ver.reviewed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
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
          <p>Direct student supervision, proposal confirmations, chapter draft reviews, and defense approvals.</p>
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
          <strong style={{ fontSize: '1.6rem', color: '#0284c7', display: 'block' }}>{supervisionRequests.length}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Pending Requests</span>
        </div>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#f59e0b', display: 'block' }}>{pendingReviewCount}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Drafts Pending Review</span>
        </div>
        <div className="v-card" style={{ padding: '16px', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.6rem', color: '#16a34a', display: 'block' }}>{approvedCount}</strong>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Approved for Defense</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setLecturerTab('assigned')}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: lecturerTab === 'assigned' ? '#0284c7' : '#f1f5f9',
            color: lecturerTab === 'assigned' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} /> Active Supervisees ({supervisedList.length})
        </button>

        <button
          type="button"
          onClick={() => setLecturerTab('requests')}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: lecturerTab === 'requests' ? '#0284c7' : '#f1f5f9',
            color: lecturerTab === 'requests' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={16} /> Supervision Requests ({supervisionRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setLecturerTab('profile')}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: lecturerTab === 'profile' ? '#0284c7' : '#f1f5f9',
            color: lecturerTab === 'profile' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Settings size={16} /> Supervision Profile & Capacity
        </button>
      </div>

      {/* TAB 1: ASSIGNED SUPERVISEES */}
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
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Check the "Supervision Requests" tab to view proposals submitted to you by students.'}
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
                            type="button"
                            className="v-btn-mini secondary"
                            onClick={() => handleDownload(latestVer.file_url)}
                            style={{ flex: 1 }}
                          >
                            <Download size={13} /> Download File
                          </button>
                          <button
                            type="button"
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

                    {/* Release Student Action */}
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setReleaseModalItem(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <UserX size={13} /> Release Student
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: SUPERVISION REQUESTS INBOX */}
      {lecturerTab === 'requests' && (
        <div>
          {!supervisionRequests.length ? (
            <div className="v-card v-no-data full-width" style={{ textAlign: 'center', padding: '40px' }}>
              <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
              <h3>No Pending Supervision Requests</h3>
              <p style={{ color: '#64748b' }}>When final-year students in your department select you, their proposals will appear here for your review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {supervisionRequests.map(req => {
                const s = req.students;
                return (
                  <article
                    key={req.id}
                    className="v-card"
                    style={{
                      borderLeft: '4px solid #0284c7',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{s?.full_name || 'Final Year Student'}</strong>
                        <span style={{ fontSize: '12.5px', color: '#64748b', marginLeft: '8px' }}>
                          • ID: {s?.student_id} • {s?.programme || 'Computer Science'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Requested: {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b' }}>
                        Proposed Topic: "{req.title}"
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                        {req.abstract}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="v-btn outline"
                        disabled={actionBusy}
                        onClick={() => {
                          setDeclineModalItem(req);
                          setDeclineReason('');
                        }}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <X size={15} /> Decline Request
                      </button>

                      <button
                        type="button"
                        className="v-btn primary"
                        disabled={actionBusy}
                        onClick={() => handleConfirmRequest(req.id, s?.full_name || 'Student')}
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        <Check size={15} /> Confirm as Supervisee
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUPERVISION PROFILE & CAPACITY */}
      {lecturerTab === 'profile' && (
        <section className="v-card" style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <ShieldCheck size={22} style={{ color: '#0284c7' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Supervision Profile & Availability</h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                Students in your department see these details when browsing faculty supervisors.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Academic Department
              </label>
              <input
                type="text"
                required
                value={profileData.department}
                onChange={e => setProfileData({ ...profileData, department: e.target.value })}
                placeholder="e.g. Department of Computer Science"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Research Areas & Specialties (Comma-separated)
              </label>
              <input
                type="text"
                value={Array.isArray(profileData.research_areas) ? profileData.research_areas.join(', ') : profileData.research_areas}
                onChange={e => setProfileData({ ...profileData, research_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="e.g. Distributed Systems, Mobile Computing, Machine Learning, Cyber Security"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Maximum Student Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  required
                  value={profileData.max_students}
                  onChange={e => setProfileData({ ...profileData, max_students: parseInt(e.target.value, 10) || 5 })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Current active supervisees: {supervisedList.length} / {profileData.max_students}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  Accepting New Supervisees
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={profileData.accepting_students}
                    onChange={e => setProfileData({ ...profileData, accepting_students: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Open for new supervision requests</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Supervisor Bio / Research Focus (Optional)
              </label>
              <textarea
                rows={3}
                value={profileData.bio || ''}
                onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Brief summary of research interests or guidance notes for prospective students..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <button
              type="submit"
              className="v-btn primary"
              disabled={actionBusy}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 700 }}
            >
              {actionBusy ? 'Saving Profile…' : 'Save Supervision Profile & Availability'}
            </button>
          </form>
        </section>
      )}

      {/* DECLINE REQUEST MODAL */}
      {declineModalItem && (
        <div className="v-modal-overlay">
          <div className="v-modal-card" style={{ maxWidth: '480px' }}>
            <div className="v-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Decline Supervision Request</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {declineModalItem.students?.full_name} · "{declineModalItem.title}"
                </span>
              </div>
              <button className="v-close-btn" onClick={() => setDeclineModalItem(null)}>✕</button>
            </div>

            <form onSubmit={handleDeclineRequestSubmit} className="v-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                  Reason for Declining (Sent to Student):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Research topic outside my primary area, or maximum capacity already reached for this term…"
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  The student will be able to select another available supervisor in the department.
                </span>
              </div>

              <div className="v-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="v-btn outline" onClick={() => setDeclineModalItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="v-btn" style={{ background: '#dc2626', color: '#ffffff' }} disabled={actionBusy}>
                  {actionBusy ? 'Declining…' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RELEASE STUDENT MODAL */}
      {releaseModalItem && (
        <div className="v-modal-overlay">
          <div className="v-modal-card" style={{ maxWidth: '480px' }}>
            <div className="v-modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Release Supervisee</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {releaseModalItem.students?.full_name} · "{releaseModalItem.title}"
                </span>
              </div>
              <button className="v-close-btn" onClick={() => setReleaseModalItem(null)}>✕</button>
            </div>

            <form onSubmit={handleReleaseStudentSubmit} className="v-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#92400e' }}>
                Releasing this student frees up 1 supervision slot in your capacity and allows the student to pair with another faculty supervisor. This action is recorded in the audit log.
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                  Release Reason:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scope change requested, or mutual agreement to transfer supervisor"
                  value={releaseReason}
                  onChange={e => setReleaseReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div className="v-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="v-btn outline" onClick={() => setReleaseModalItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="v-btn" style={{ background: '#dc2626', color: '#ffffff' }} disabled={actionBusy}>
                  {actionBusy ? 'Releasing…' : 'Release Student'}
                </button>
              </div>
            </form>
          </div>
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
