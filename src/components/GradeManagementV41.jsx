import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X, Search, History } from 'lucide-react';
import { getLecturerModules } from '../services/attendanceV39.js';
import { getModuleGradeSheet, saveIndividualGrade, publishAllModuleGrades, getGradeAuditLog } from '../services/academicMasterV41toV55.js';
import { supabase } from '../services/supabase.js';

export default function GradeManagementV41({ initialModuleId = null }) {
  const [modules, setModules] = useState([]);
  const [selectedModuleCode, setSelectedModuleCode] = useState('');
  const [students, setStudents] = useState([]);
  const [caScores, setCaScores] = useState({});
  const [examScores, setExamScores] = useState({});
  const [isPublished, setIsPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Auto clear message/error banner after 5s
  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  // Load modules registered to the lecturer only
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const list = await getLecturerModules();
        if (mounted) {
          const validList = list || [];
          setModules(validList);
          if (validList.length > 0) {
            const initialMatch = initialModuleId
              ? validList.find(m => m.id === initialModuleId || m.code?.toUpperCase() === String(initialModuleId).toUpperCase())
              : null;
            setSelectedModuleCode(initialMatch ? initialMatch.code : validList[0].code);
          } else {
            setSelectedModuleCode('');
          }
        }
      } catch (err) {
        console.warn('Module loading note:', err);
        if (mounted) setModules([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [initialModuleId]);

  // Active module object
  const currentModule = useMemo(() => {
    if (!modules || modules.length === 0) return null;
    const found = modules.find(m => m.code === selectedModuleCode);
    return found || modules[0] || null;
  }, [modules, selectedModuleCode]);

  // Load roster and scores strictly for the selected registered module
  const loadRosterForModule = useCallback(async (moduleObj) => {
    if (!moduleObj || !moduleObj.id) {
      setStudents([]);
      setCaScores({});
      setExamScores({});
      return;
    }
    try {
      // Check localStorage draft first
      const draftKey = `edulink_grades_draft_${moduleObj.code}`;
      const savedDraft = localStorage.getItem(draftKey);
      let draftData = null;
      if (savedDraft) {
        try { draftData = JSON.parse(savedDraft); } catch { }
      }

      // Strictly query students registered in student_modules for this module
      const sheet = await getModuleGradeSheet(moduleObj.id);
      const dbRows = sheet?.rows || [];

      const enrolledStudents = dbRows.map(r => ({
        studentInternalId: r.studentInternalId,
        studentId: r.studentId,
        fullName: r.fullName,
        score: r.score,
        remarks: r.remarks,
        published: r.published
      }));

      // Build score maps strictly for enrolled students
      const caMap = {};
      const examMap = {};
      let isPub = draftData?.published || false;

      enrolledStudents.forEach(s => {
        const id = s.studentInternalId;
        // Priority: draft -> db remarks
        if (draftData?.ca && draftData.ca[id] !== undefined) {
          caMap[id] = draftData.ca[id];
        } else if (s.remarks) {
          try {
            const parsed = JSON.parse(s.remarks);
            if (parsed.ca !== undefined) caMap[id] = parsed.ca;
          } catch { }
        } else {
          caMap[id] = '';
        }

        if (draftData?.exam && draftData.exam[id] !== undefined) {
          examMap[id] = draftData.exam[id];
        } else if (s.remarks) {
          try {
            const parsed = JSON.parse(s.remarks);
            if (parsed.exam !== undefined) examMap[id] = parsed.exam;
          } catch { }
        } else {
          examMap[id] = '';
        }

        if (s.published) isPub = true;
      });

      setStudents(enrolledStudents);
      setCaScores(caMap);
      setExamScores(examMap);
      setIsPublished(isPub);
    } catch (err) {
      console.warn('Error loading module roster:', err);
    }
  }, []);

  useEffect(() => {
    if (currentModule) {
      loadRosterForModule(currentModule);
    } else {
      setStudents([]);
    }
  }, [currentModule, loadRosterForModule]);

  // Sort students alphabetically by student name (A to Z) as requested
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '')
    );
  }, [students]);

  // Calculation function
  // Total = CA(40) + Exam(60)
  // Grade: >= 75 is A, 65 to 74 is B (e.g. 30 + 40 = 70 is B), 50 to 64 is C, 40 to 49 is D, below 40 is F
  const computeStudentGrade = useCallback((ca, exam) => {
    const hasCa = ca !== '' && ca !== null && ca !== undefined && !isNaN(ca);
    const hasExam = exam !== '' && exam !== null && exam !== undefined && !isNaN(exam);

    if (!hasCa || !hasExam) {
      return { total: null, grade: '—', isComplete: false };
    }

    const caNum = Number(ca);
    const examNum = Number(exam);
    const total = caNum + examNum;

    let grade = 'F';
    if (total >= 75) grade = 'A';
    else if (total >= 65) grade = 'B';
    else if (total >= 50) grade = 'C';
    else if (total >= 40) grade = 'D';
    else grade = 'F';

    return { total, grade, isComplete: true };
  }, []);

  // Compute live statistics for the 3 stat cards
  const stats = useMemo(() => {
    let totalScoreSum = 0;
    let completeCount = 0;
    let atRiskCount = 0;

    sortedStudents.forEach(s => {
      const ca = caScores[s.studentInternalId];
      const exam = examScores[s.studentInternalId];
      const { total, isComplete } = computeStudentGrade(ca, exam);

      if (isComplete) {
        completeCount += 1;
        totalScoreSum += total;
        if (total < 40) {
          atRiskCount += 1;
        }
      }
    });

    const classAverage = completeCount > 0 ? (totalScoreSum / completeCount).toFixed(1) : '—';
    const totalStudents = sortedStudents.length;

    return {
      classAverage,
      gradesEntered: `${completeCount} / ${totalStudents}`,
      completeCount,
      totalStudents,
      atRiskCount
    };
  }, [sortedStudents, caScores, examScores, computeStudentGrade]);

  // Handle CA score input (0 to 40 max)
  const handleCaChange = (id, val) => {
    if (val === '') {
      setCaScores(prev => ({ ...prev, [id]: '' }));
      return;
    }
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num > 40) num = 40;
    if (num < 0) num = 0;
    setCaScores(prev => ({ ...prev, [id]: num }));
  };

  // Handle Exam score input (0 to 60 max)
  const handleExamChange = (id, val) => {
    if (val === '') {
      setExamScores(prev => ({ ...prev, [id]: '' }));
      return;
    }
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num > 60) num = 60;
    if (num < 0) num = 0;
    setExamScores(prev => ({ ...prev, [id]: num }));
  };

  // Save draft action
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const draftPayload = {
        ca: caScores,
        exam: examScores,
        published: isPublished,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`edulink_grades_draft_${currentModule?.code || selectedModuleCode}`, JSON.stringify(draftPayload));

      // Attempt to save to Supabase
      if (currentModule?.id && currentModule.id.length > 20) {
        for (const s of sortedStudents) {
          const ca = caScores[s.studentInternalId];
          const exam = examScores[s.studentInternalId];
          const { total } = computeStudentGrade(ca, exam);
          if (total !== null || ca !== '' || exam !== '') {
            await saveIndividualGrade({
              moduleId: currentModule.id,
              studentInternalId: s.studentInternalId,
              score: total !== null ? total : (ca !== '' ? Number(ca) : 0),
              remarks: JSON.stringify({ ca: ca ?? '', exam: exam ?? '' })
            }).catch(console.warn);
          }
        }
      }

      setMessage('Draft grades successfully saved.');
    } catch {
      setError('Could not save draft grades.');
    } finally {
      setSaving(false);
    }
  };

  // Publish grades action
  const handlePublishGrades = async () => {
    const missingCount = sortedStudents.length - stats.completeCount;
    if (missingCount > 0) {
      const confirmProceed = window.confirm(
        `${missingCount} student${missingCount > 1 ? 's are' : ' is'} missing an exam or CA score. Would you like to publish grades for completed students?`
      );
      if (!confirmProceed) return;
    } else {
      const confirmProceed = window.confirm(
        'Are you sure you want to publish these grades? All graded students will be able to see their results immediately.'
      );
      if (!confirmProceed) return;
    }

    try {
      setSaving(true);
      setIsPublished(true);
      const draftPayload = {
        ca: caScores,
        exam: examScores,
        published: true,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`edulink_grades_draft_${currentModule?.code || selectedModuleCode}`, JSON.stringify(draftPayload));

      if (currentModule?.id && currentModule.id.length > 20) {
        await publishAllModuleGrades(currentModule.id).catch(console.warn);
      }

      setMessage('Grades published successfully. Students can now view their semester results.');
    } catch {
      setError('Failed to publish grades.');
    } finally {
      setSaving(false);
    }
  };

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return sortedStudents;
    const q = searchQuery.toLowerCase().trim();
    return sortedStudents.filter(s =>
      s.studentId?.toLowerCase().includes(q) || s.fullName?.toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  const missingCount = sortedStudents.length - stats.completeCount;

  if (loading) {
    return (
      <div className="grade-sheet-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <RefreshCw className="v-spin" size={24} style={{ margin: '0 auto 12px auto', color: '#1e3a5f' }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading grade sheet…</p>
        </div>
      </div>
    );
  }

  if (!loading && (!modules || modules.length === 0 || !currentModule)) {
    return (
      <div className="grade-sheet-container" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px 24px', maxWidth: '560px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <AlertCircle size={48} style={{ color: '#0a2540', margin: '0 auto 16px auto', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a2540', marginBottom: '8px' }}>No Registered Modules</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            You are currently not registered for any teaching modules. Please register your modules in the Modules tab or contact administration.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="grade-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grade-sheet-container">
      {/* Top Breadcrumb & Module Switcher */}
      <div className="grade-sheet-breadcrumb">
        <span>Grades</span>
        <span>/</span>
        <select
          value={selectedModuleCode}
          onChange={e => setSelectedModuleCode(e.target.value)}
          aria-label="Select Module"
        >
          {modules.map(m => (
            <option key={m.code} value={m.code}>
              {m.code} — {m.title}
            </option>
          ))}
        </select>
      </div>

      {/* Header with Title and Actions */}
      <div className="grade-sheet-header">
        <div className="grade-sheet-title-group">
          <h1>{currentModule.code} — {currentModule.title}</h1>
          <p>{currentModule.semester || 'Second Semester 2026'} • Section A • {sortedStudents.length} students</p>
        </div>

        <div className="grade-sheet-actions">
          <span className={`grade-status-badge ${isPublished ? 'published' : 'draft'}`}>
            {isPublished ? 'Published — visible to students' : 'Draft — not visible to students'}
          </span>
          <button
            type="button"
            className="grade-btn-draft"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            className="grade-btn-publish"
            onClick={handlePublishGrades}
            disabled={saving}
          >
            Publish grades
          </button>
        </div>
      </div>

      {/* Banners */}
      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} color="#10b981" /> {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="#ef4444" /> {error}
        </div>
      )}

      {/* 3 Stat Cards Row */}
      <div className="grade-stats-row">
        <div className="grade-stat-card">
          <div className="grade-stat-label">CLASS AVERAGE</div>
          <div className="grade-stat-value">{stats.classAverage}</div>
        </div>

        <div className="grade-stat-card">
          <div className="grade-stat-label">GRADES ENTERED</div>
          <div className="grade-stat-value">{stats.gradesEntered}</div>
        </div>

        <div className="grade-stat-card">
          <div className="grade-stat-label">AT RISK (BELOW 40)</div>
          <div className="grade-stat-value at-risk">{stats.atRiskCount} students</div>
        </div>
      </div>

      {/* Grade Table Card */}
      <div className="grade-table-card">
        {/* Search & Filter Header */}
        <div className="grade-table-search-bar">
          <div className="grade-table-search-input">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Student ID or Name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="grade-table-wrap">
          <table className="grade-table">
            <thead>
              <tr>
                <th>STUDENT ID</th>
                <th>STUDENT NAME</th>
                <th>MODULE CODE</th>
                <th>MODULE NAME</th>
                <th>CA (40)</th>
                <th>EXAM (60)</th>
                <th>TOTAL</th>
                <th>GRADE</th>
              </tr>
            </thead>
            <tbody>
              {!filteredStudents.length ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '42px 20px', color: '#64748b' }}>
                    {searchQuery
                      ? `No students matching "${searchQuery}" in ${currentModule.code}.`
                      : `No students have registered for ${currentModule.code} (${currentModule.title}) yet.`}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => {
                  const ca = caScores[s.studentInternalId];
                  const exam = examScores[s.studentInternalId];
                  const { total, grade } = computeStudentGrade(ca, exam);

                  return (
                    <tr key={s.studentInternalId}>
                      <td className="grade-student-id">{s.studentId}</td>
                      <td className="grade-student-name">{s.fullName}</td>
                      <td>{currentModule.code}</td>
                      <td>{currentModule.title}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="40"
                          className="grade-input-box"
                          value={ca ?? ''}
                          onChange={e => handleCaChange(s.studentInternalId, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          className="grade-input-box"
                          value={exam ?? ''}
                          onChange={e => handleExamChange(s.studentInternalId, e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <span className="grade-total-val">
                          {total !== null ? total : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`grade-letter-val ${grade !== '—' ? grade : ''}`}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notice */}
        <div className="grade-table-footer">
          <span>
            Showing {filteredStudents.length} of {sortedStudents.length} students
            {missingCount > 0
              ? ` • ${missingCount} student${missingCount > 1 ? 's' : ''} missing an exam score must be resolved before publishing.`
              : ' • All student scores verified.'}
          </span>
          {auditLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1e3a5f',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <History size={14} /> View Audit History
            </button>
          )}
        </div>
      </div>

      {/* Audit History Modal */}
      {showAuditModal && (
        <div className="v-modal-overlay">
          <div className="v-modal-card">
            <div className="v-modal-head">
              <h3>Grade Audit History ({currentModule.code})</h3>
              <button className="v-close-btn" onClick={() => setShowAuditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="v-modal-body">
              {!auditLogs.length ? (
                <p>No audit changes recorded yet.</p>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #edf2f7' }}>
                    <small style={{ color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString()}</small>
                    <p style={{ margin: '4px 0 0' }}>Action: {log.action} • Reason: {log.reason || 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
