import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, FileText, CheckCircle2, AlertCircle, Upload, Download, Clock, ChevronRight, MessageSquare, Award, RefreshCw } from 'lucide-react';
import { getStudentDissertation, registerDissertationTopic, submitDissertationChapterFile, getSupervisedDissertations, reviewDissertationVersion } from '../services/academicMasterV41toV55.js';
import { getSignedFileUrl } from '../services/assignmentsV40.js';

export default function DissertationManagementV42({ role = 'student' }) {
  const [studentData, setStudentData] = useState(null);
  const [supervisedList, setSupervisedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Topic registration state
  const [topicInput, setTopicInput] = useState('');
  // Student Chapter upload state
  const [selectedChapter, setSelectedChapter] = useState('Chapter 1');
  const [uploadDoc, setUploadDoc] = useState(null);

  // Supervisor Review State
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewVerdict, setReviewVerdict] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (role === 'student') {
        const data = await getStudentDissertation();
        setStudentData(data);
      } else {
        const list = await getSupervisedDissertations();
        setSupervisedList(list);
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
    try {
      setActionBusy(true);
      await registerDissertationTopic(topicInput);
      setMessage('Dissertation topic proposed successfully.');
      setTopicInput('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to register topic.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    if (!uploadDoc) return setError('Please choose a file to submit.');
    try {
      setActionBusy(true);
      await submitDissertationChapterFile({
        dissertationId: studentData.dissertation.id,
        chapterName: selectedChapter,
        file: uploadDoc
      });
      setMessage(`${selectedChapter} submitted for supervisor review.`);
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
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
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
        status: reviewVerdict,
        comments: reviewNotes
      });
      setMessage('Verdict and supervisor feedback recorded.');
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
    return <div className="v-master-wrap"><div className="v-card text-center"><RefreshCw className="v-spin" size={24} /><p>Loading dissertation workspace…</p></div></div>;
  }

  // ==========================================
  // STUDENT VIEW
  // ==========================================
  if (role === 'student') {
    const diss = studentData?.dissertation;
    const chapters = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

    return (
      <div className="v-master-wrap">
        <header className="v-master-header">
          <div>
            <h1>Dissertation & Thesis Management</h1>
            <p>Track proposal, chapters 1 to 5 progression, supervisor feedback, and corrections.</p>
          </div>
        </header>

        {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
        {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

        {!diss ? (
          <section className="v-card v-create-box">
            <h2>Register Dissertation Topic</h2>
            <p>Propose your research topic to begin chapter submissions and supervisor matching.</p>
            <form onSubmit={handleRegisterTopic}>
              <label>Proposed Dissertation / Research Title:</label>
              <input required type="text" placeholder="e.g. Design and Implementation of a Secure Campus PWA" value={topicInput} onChange={e => setTopicInput(e.target.value)} />
              <button type="submit" className="v-btn primary" disabled={actionBusy}>{actionBusy ? 'Registering…' : 'Submit Dissertation Proposal'}</button>
            </form>
          </section>
        ) : (
          <>
            <section className="v-card v-diss-hero">
              <div className="v-diss-top">
                <div>
                  <span className="v-status-pill blue">STATUS: {diss.status.toUpperCase()}</span>
                  <h2>{diss.title}</h2>
                  <span className="v-sub">Supervisor: <b>{diss.lecturers?.full_name || 'Assigned by Department'}</b></span>
                </div>
                <div className="v-progress-radial">
                  <strong>{diss.progress_percentage || 20}%</strong>
                  <span>Progress</span>
                </div>
              </div>

              {/* 5-Chapter Stepper */}
              <div className="v-stepper">
                {chapters.map((ch, idx) => {
                  const chNum = idx + 1;
                  const isDone = (diss.current_chapter || 1) > chNum;
                  const isCurrent = (diss.current_chapter || 1) === chNum;
                  return (
                    <div key={ch} className={`v-step-node ${isDone ? 'done' : isCurrent ? 'active' : ''}`}>
                      <span className="v-step-circle">{isDone ? '✓' : chNum}</span>
                      <small>{ch}</small>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Chapter Upload Section */}
            <section className="v-card">
              <h3>Submit Chapter Document</h3>
              <form onSubmit={handleChapterSubmit} className="v-form-grid">
                <div className="v-form-group">
                  <label>Chapter:</label>
                  <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
                    {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="v-form-group">
                  <label>Document (PDF, DOCX, ZIP):</label>
                  <input required type="file" accept=".pdf,.doc,.docx,.zip" onChange={e => setUploadDoc(e.target.files?.[0] || null)} />
                </div>
                <div className="v-form-group full-width">
                  <button type="submit" className="v-btn primary" disabled={actionBusy}>{actionBusy ? 'Uploading…' : 'Upload Chapter Draft'}</button>
                </div>
              </form>
            </section>

            {/* Version History */}
            <section className="v-card">
              <h3>Version History & Feedback</h3>
              <div className="v-table-responsive">
                <table className="v-table">
                  <thead>
                    <tr><th>Chapter</th><th>Version</th><th>Submitted</th><th>Status</th><th>Supervisor Comments</th><th>File</th></tr>
                  </thead>
                  <tbody>
                    {!studentData.versions.length ? (
                      <tr><td colSpan="6" className="v-no-data">No document drafts submitted yet.</td></tr>
                    ) : (
                      studentData.versions.map(v => (
                        <tr key={v.id}>
                          <td><b>{v.chapter}</b></td>
                          <td>v{v.version_number}</td>
                          <td>{new Date(v.submitted_at).toLocaleDateString()}</td>
                          <td><span className={`v-status-pill ${v.status}`}>{v.status.toUpperCase()}</span></td>
                          <td>{v.lecturer_comment || <span className="v-sub">Awaiting feedback</span>}</td>
                          <td><button className="v-btn-mini secondary" onClick={() => handleDownload(v.file_url)}><Download size={13} /> Download</button></td>
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

  // ==========================================
  // LECTURER VIEW
  // ==========================================
  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Dissertation Supervision</h1>
          <p>Supervise assigned undergraduate research students, review chapters, and approve final submissions.</p>
        </div>
      </header>

      {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

      <div className="v-cards-grid">
        {!supervisedList.length ? (
          <div className="v-card v-no-data full-width">No dissertation supervisees assigned yet.</div>
        ) : (
          supervisedList.map(item => {
            const student = item.students;
            const latestVer = item.dissertation_versions?.[0];
            return (
              <article key={item.id} className="v-card v-supervisee-card">
                <div className="v-card-top">
                  <span className="v-id-badge">{student?.student_id}</span>
                  <span className={`v-status-pill ${item.status}`}>{item.status.toUpperCase()}</span>
                </div>
                <h3>{item.title}</h3>
                <p><b>{student?.full_name}</b> · {student?.programme}</p>
                <div className="v-meta-line">
                  <span>Current Stage: <b>Chapter {item.current_chapter || 1}</b></span>
                  <span>Progress: <b>{item.progress_percentage || 20}%</b></span>
                </div>

                {latestVer && (
                  <div className="v-latest-draft-box">
                    <span>Latest: <b>{latestVer.chapter} (v{latestVer.version_number})</b></span>
                    <div className="v-action-row">
                      <button className="v-btn-mini secondary" onClick={() => handleDownload(latestVer.file_url)}><Download size={13} /> File</button>
                      <button className="v-btn-mini primary" onClick={() => setReviewModalItem({ dissertationId: item.id, versionId: latestVer.id, title: item.title, studentName: student?.full_name, chapter: latestVer.chapter })}>Review Draft</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {reviewModalItem && (
        <div className="v-modal-overlay">
          <div className="v-modal-card">
            <div className="v-modal-head">
              <h3>Review {reviewModalItem.chapter}: {reviewModalItem.studentName}</h3>
              <button className="v-close-btn" onClick={() => setReviewModalItem(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveReview} className="v-modal-body">
              <label>Review Verdict:</label>
              <select value={reviewVerdict} onChange={e => setReviewVerdict(e.target.value)}>
                <option value="approved">Approved (Advance to next chapter)</option>
                <option value="corrections_needed">Corrections Required</option>
                <option value="rejected">Rejected (Resubmit chapter)</option>
              </select>

              <label>Detailed Supervisor Feedback & Corrections:</label>
              <textarea rows={4} required placeholder="Specify feedback or required corrections..." value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />

              <div className="v-modal-actions">
                <button type="button" className="v-btn outline" onClick={() => setReviewModalItem(null)}>Cancel</button>
                <button type="submit" className="v-btn primary" disabled={actionBusy}>{actionBusy ? 'Saving…' : 'Record Review'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
