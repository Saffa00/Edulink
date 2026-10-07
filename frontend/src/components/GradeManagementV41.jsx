import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Code2,
  FileText,
  Send,
  Eye,
  Users,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  History,
  Download
} from 'lucide-react';
import { getLecturerModules } from '../services/attendanceV39.js';
import {
  getModuleGradeSheet,
  saveIndividualGrade,
  publishAllModuleGrades,
  getGradeAuditLog
} from '../services/academicMasterV41toV55.js';

// Fallback demo students matching the EduLink grade design mockup
const DEMO_STUDENTS = [
  {
    studentInternalId: 'demo-std-1',
    studentId: '8168',
    fullName: 'Joseph Mahulor Kpaka',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    defaultCa: 30,
    defaultExam: 40
  },
  {
    studentInternalId: 'demo-std-2',
    studentId: '8409',
    fullName: 'Moses Saffa',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    defaultCa: 40,
    defaultExam: 50
  },
  {
    studentInternalId: 'demo-std-3',
    studentId: '8100',
    fullName: 'Moses Saffa',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    defaultCa: 35,
    defaultExam: 20
  },
  {
    studentInternalId: 'demo-std-4',
    studentId: '8234',
    fullName: 'Mary Kamara',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    defaultCa: 38,
    defaultExam: 55
  }
];

function getAvatarInitials(name) {
  if (!name || typeof name !== 'string') return 'ED';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  const colors = ['#0284c7', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#d97706'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Triggers a download of a formatted Tabular CSV file.
 * Compatible with PC and mobile browsers (Chrome, Safari, Edge, etc.)
 */
function downloadTabularGradesCSV(moduleInfo, studentList, caScores, examScores, isPublished) {
  const headers = [
    '#',
    'STUDENT ID',
    'STUDENT NAME',
    'MODULE CODE',
    'MODULE NAME',
    'CA (40%)',
    'EXAM (60%)',
    'TOTAL',
    'GRADE',
    'STATUS',
    'SAVED AT'
  ];

  const timestamp = new Date().toLocaleString();
  const rows = studentList.map((s, idx) => {
    const ca = caScores[s.studentInternalId];
    const exam = examScores[s.studentInternalId];
    const hasCa = ca !== '' && ca !== null && ca !== undefined && !isNaN(ca);
    const hasExam = exam !== '' && exam !== null && exam !== undefined && !isNaN(exam);
    const total = (hasCa && hasExam) ? (Number(ca) + Number(exam)) : '';

    let grade = '—';
    if (total !== '') {
      if (total >= 75) grade = 'A';
      else if (total >= 65) grade = 'B';
      else if (total >= 50) grade = 'C';
      else if (total >= 40) grade = 'D';
      else grade = 'F';
    }

    const status = isPublished ? 'Published' : 'Not Published';

    return [
      idx + 1,
      `"${s.studentId || ''}"`,
      `"${(s.fullName || '').replace(/"/g, '""')}"`,
      `"${moduleInfo.code || ''}"`,
      `"${(moduleInfo.title || '').replace(/"/g, '""')}"`,
      hasCa ? ca : '',
      hasExam ? exam : '',
      total !== '' ? total : '',
      `"${grade}"`,
      `"${status}"`,
      `"${timestamp}"`
    ].join(',');
  });

  // \uFEFF Byte Order Mark ensures Excel / Mobile Sheets display UTF-8 without corruption
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const cleanCode = (moduleInfo.code || 'Module').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Grade_Draft_${cleanCode}_${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function GradeManagementV41({ initialModuleId = null, scopedModule = null }) {
  const [modules, setModules] = useState([]);
  const [selectedModuleCode, setSelectedModuleCode] = useState(scopedModule?.code || '');

  useEffect(() => {
    if (scopedModule?.code) {
      setSelectedModuleCode(scopedModule.code);
    }
  }, [scopedModule]);

  const [students, setStudents] = useState([]);
  const [caScores, setCaScores] = useState({});
  const [examScores, setExamScores] = useState({});
  const [isPublished, setIsPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeRowMenuId, setActiveRowMenuId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Auto clear message/error banner after 5s
  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  // Close row menu on click outside
  useEffect(() => {
    const handleDocumentClick = () => setActiveRowMenuId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Load modules registered to the lecturer
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const list = await getLecturerModules();
        if (mounted) {
          const validList = list && list.length > 0 ? list : [
            {
              id: 'mod-bscs-411',
              code: 'BSCS411',
              title: 'Oracle',
              level: 4,
              semester: 'First Semester'
            },
            {
              id: 'mod-bscs-412',
              code: 'BSCS412',
              title: 'C++',
              level: 4,
              semester: 'First Semester'
            }
          ];
          setModules(validList);
          if (validList.length > 0) {
            const initialMatch = initialModuleId
              ? validList.find(m => m.id === initialModuleId || m.code?.toUpperCase() === String(initialModuleId).toUpperCase())
              : null;
            setSelectedModuleCode(initialMatch ? initialMatch.code : validList[0].code);
          } else {
            setSelectedModuleCode('BSCS411');
          }
        }
      } catch (err) {
        console.warn('Module loading note:', err);
        if (mounted) {
          setModules([
            {
              id: 'mod-bscs-411',
              code: 'BSCS411',
              title: 'Oracle',
              level: 4,
              semester: 'First Semester'
            }
          ]);
          setSelectedModuleCode('BSCS411');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [initialModuleId]);

  // Current active module
  const currentModule = useMemo(() => {
    if (!modules || modules.length === 0) {
      return { id: 'mod-bscs-411', code: 'BSCS411', title: 'Oracle', semester: 'First Semester' };
    }
    const found = modules.find(m => m.code === selectedModuleCode);
    return found || modules[0];
  }, [modules, selectedModuleCode]);

  // Load roster and scores
  const loadRosterForModule = useCallback(async (moduleObj) => {
    if (!moduleObj) return;

    try {
      const draftKey = `edulink_grades_draft_${moduleObj.code || moduleObj.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      let draftData = null;
      if (savedDraft) {
        try { draftData = JSON.parse(savedDraft); } catch { }
      }

      // Query database grade sheet
      let dbRows = [];
      if (moduleObj.id && moduleObj.id.length > 20) {
        const sheet = await getModuleGradeSheet(moduleObj.id).catch(() => null);
        dbRows = sheet?.rows || [];
      }

      let enrolledStudents = [];
      if (dbRows.length > 0) {
        enrolledStudents = dbRows.map(r => ({
          studentInternalId: r.studentInternalId,
          studentId: r.studentId,
          fullName: r.fullName,
          photoUrl: r.photoUrl || null,
          score: r.score,
          remarks: r.remarks,
          published: r.published
        }));
      } else {
        // Use realistic demo roster matching the user's mockup
        enrolledStudents = DEMO_STUDENTS.map(d => ({
          studentInternalId: d.studentInternalId,
          studentId: d.studentId,
          fullName: d.fullName,
          photoUrl: d.photoUrl,
          defaultCa: d.defaultCa,
          defaultExam: d.defaultExam,
          published: false
        }));
      }

      const caMap = {};
      const examMap = {};
      let isPub = draftData?.published || false;

      enrolledStudents.forEach(s => {
        const id = s.studentInternalId;

        // CA score priority: draft -> remarks -> default demo -> empty
        if (draftData?.ca && draftData.ca[id] !== undefined) {
          caMap[id] = draftData.ca[id];
        } else if (s.remarks) {
          try {
            const parsed = JSON.parse(s.remarks);
            if (parsed.ca !== undefined) caMap[id] = parsed.ca;
          } catch { }
        } else if (s.defaultCa !== undefined) {
          caMap[id] = s.defaultCa;
        } else {
          caMap[id] = '';
        }

        // Exam score priority: draft -> remarks -> default demo -> empty
        if (draftData?.exam && draftData.exam[id] !== undefined) {
          examMap[id] = draftData.exam[id];
        } else if (s.remarks) {
          try {
            const parsed = JSON.parse(s.remarks);
            if (parsed.exam !== undefined) examMap[id] = parsed.exam;
          } catch { }
        } else if (s.defaultExam !== undefined) {
          examMap[id] = s.defaultExam;
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
    }
  }, [currentModule, loadRosterForModule]);

  // Compute Grade (CA 40% + Exam 60%)
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

  // Compute Summary Statistics
  const stats = useMemo(() => {
    let totalScoreSum = 0;
    let completeCount = 0;
    let atRiskCount = 0;

    students.forEach(s => {
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
    const totalStudents = students.length;

    return {
      classAverage,
      gradesEntered: `${completeCount} / ${totalStudents}`,
      completeCount,
      totalStudents,
      atRiskCount
    };
  }, [students, caScores, examScores, computeStudentGrade]);

  // Score Handlers
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

  // Save Draft (saves to local storage, exports CSV file, and syncs DB)
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const draftPayload = {
        ca: caScores,
        exam: examScores,
        published: isPublished,
        savedAt: new Date().toISOString()
      };

      // 1. Save to Local Storage on PC/Mobile Browser
      const storageKey = `edulink_grades_draft_${currentModule?.code || selectedModuleCode}`;
      localStorage.setItem(storageKey, JSON.stringify(draftPayload));

      // 2. Export Tabular CSV file directly to mobile phone / PC device filesystem
      downloadTabularGradesCSV(currentModule, students, caScores, examScores, isPublished);

      // 3. Sync to Supabase if database records exist
      if (currentModule?.id && currentModule.id.length > 20) {
        for (const s of students) {
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

      setMessage('Draft saved to local storage & tabular file exported to your device.');
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Could not save draft grades.');
    } finally {
      setSaving(false);
    }
  };

  // Publish Grades
  const handlePublishGrades = async () => {
    const missingCount = students.length - stats.completeCount;
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

  // Filter students based on search input and status dropdown
  const filteredStudents = useMemo(() => {
    let list = [...students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.studentId?.toLowerCase().includes(q) || s.fullName?.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'published') {
      list = list.filter(() => isPublished);
    } else if (statusFilter === 'not_published') {
      list = list.filter(() => !isPublished);
    }

    return list;
  }, [students, searchQuery, statusFilter, isPublished]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleToggleRowMenu = (studentId, e) => {
    e.stopPropagation();
    setActiveRowMenuId(prev => (prev === studentId ? null : studentId));
  };

  const handleClearScores = (studentId) => {
    setCaScores(prev => ({ ...prev, [studentId]: '' }));
    setExamScores(prev => ({ ...prev, [studentId]: '' }));
    setActiveRowMenuId(null);
  };

  if (loading) {
    return (
      <div className="grade-sheet-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <RefreshCw className="v-spin" size={24} style={{ margin: '0 auto 12px auto', color: '#0284c7' }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading grade sheet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grade-sheet-container">
      {/* 1. Top Breadcrumb & Module Switcher */}
      <div className="grade-sheet-breadcrumb">
        <button
          type="button"
          className="grade-breadcrumb-btn"
          onClick={() => {}}
        >
          ← Grades
        </button>
        <span className="grade-breadcrumb-sep">/</span>
        {modules.length > 1 ? (
          <select
            value={selectedModuleCode}
            onChange={e => { setSelectedModuleCode(e.target.value); setCurrentPage(1); }}
            aria-label="Select Module"
          >
            {modules.map(m => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.title}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {currentModule.code} — {currentModule.title}
          </span>
        )}
      </div>

      {/* 2. Header with Code Icon, Title, and Actions */}
      <div className="grade-sheet-header">
        <div className="grade-header-left">
          <div className="grade-code-badge">
            <Code2 size={24} strokeWidth={2.5} />
          </div>
          <div className="grade-sheet-title-group">
            <h1>{currentModule.code} — {currentModule.title}</h1>
            <p>{currentModule.semester || 'First Semester'} • Section A • {students.length} students</p>
          </div>
        </div>

        <div className="grade-sheet-actions">
          <span className={`grade-status-badge ${isPublished ? 'published' : 'draft'}`}>
            <Eye size={15} />
            <span>{isPublished ? 'Published — visible to students' : 'Draft — not visible to students'}</span>
          </span>

          <button
            type="button"
            className="grade-btn-draft"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            <FileText size={15} />
            <span>{saving ? 'Saving…' : 'Save draft'}</span>
          </button>

          <button
            type="button"
            className="grade-btn-publish"
            onClick={handlePublishGrades}
            disabled={saving}
          >
            <Send size={15} />
            <span>Publish grades</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} color="#10b981" /> {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="#ef4444" /> {error}
        </div>
      )}

      {/* 3. Three Summary Stat Cards */}
      <div className="grade-stats-row">
        <div className="grade-stat-card">
          <div className="grade-stat-icon-circle blue">
            <Users size={22} />
          </div>
          <div className="grade-stat-content">
            <span className="grade-stat-label blue">CLASS AVERAGE</span>
            <span className="grade-stat-value">{stats.classAverage}</span>
          </div>
        </div>

        <div className="grade-stat-card">
          <div className="grade-stat-icon-circle green">
            <FileText size={22} />
          </div>
          <div className="grade-stat-content">
            <span className="grade-stat-label green">GRADES ENTERED</span>
            <span className="grade-stat-value">{stats.gradesEntered}</span>
          </div>
        </div>

        <div className="grade-stat-card">
          <div className="grade-stat-icon-circle red">
            <AlertTriangle size={22} />
          </div>
          <div className="grade-stat-content">
            <span className="grade-stat-label red">AT RISK (BELOW 40)</span>
            <span className="grade-stat-value at-risk">{stats.atRiskCount} students</span>
          </div>
        </div>
      </div>

      {/* 4. Table Container Card */}
      <div className="grade-table-card">
        {/* Search & Status Filter Bar */}
        <div className="grade-table-search-bar">
          <div className="grade-table-search-input">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by Student ID or Name..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="grade-status-filter-select"
            aria-label="Filter status"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="not_published">Not Published</option>
          </select>
        </div>

        {/* 11-Column Table */}
        <div className="grade-table-wrap">
          <table className="grade-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>STUDENT ID</th>
                <th>STUDENT NAME</th>
                <th>MODULE CODE</th>
                <th>MODULE NAME</th>
                <th style={{ textAlign: 'center' }}>CA (40%)</th>
                <th style={{ textAlign: 'center' }}>EXAM (60%)</th>
                <th style={{ textAlign: 'center' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>GRADE</th>
                <th>STATUS</th>
                <th style={{ width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {!paginatedStudents.length ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '42px 20px', color: '#64748b' }}>
                    {searchQuery
                      ? `No students matching "${searchQuery}" in ${currentModule.code}.`
                      : `No students enrolled for ${currentModule.code} yet.`}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                  const ca = caScores[s.studentInternalId];
                  const exam = examScores[s.studentInternalId];
                  const { total, grade } = computeStudentGrade(ca, exam);

                  return (
                    <tr key={s.studentInternalId}>
                      <td className="grade-row-index">{rowIndex}</td>
                      <td className="grade-student-id">{s.studentId}</td>
                      <td>
                        <div className="grade-student-cell">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt="" className="grade-student-avatar-img" />
                          ) : (
                            <div
                              className="grade-student-avatar-circle"
                              style={{ backgroundColor: getAvatarColor(s.fullName) }}
                            >
                              {getAvatarInitials(s.fullName)}
                            </div>
                          )}
                          <span className="grade-student-name">{s.fullName}</span>
                        </div>
                      </td>
                      <td>{currentModule.code}</td>
                      <td>{currentModule.title}</td>
                      <td style={{ textAlign: 'center' }}>
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
                      <td style={{ textAlign: 'center' }}>
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
                      <td style={{ textAlign: 'center' }}>
                        <span className="grade-total-val">
                          {total !== null ? total : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`grade-pill-letter ${grade !== '—' ? grade : 'empty'}`}>
                          {grade}
                        </span>
                      </td>
                      <td>
                        <span className={`grade-pill-status ${isPublished ? 'published' : 'not-published'}`}>
                          {isPublished ? 'Published' : 'Not Published'}
                        </span>
                      </td>
                      <td style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="grade-menu-btn"
                          onClick={(e) => handleToggleRowMenu(s.studentInternalId, e)}
                          title="Options"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeRowMenuId === s.studentInternalId && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '36px',
                              background: '#ffffff',
                              borderRadius: '10px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              border: '1px solid #e2e8f0',
                              padding: '6px',
                              zIndex: 50,
                              minWidth: '150px'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleClearScores(s.studentInternalId)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '12.5px',
                                color: '#ef4444',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              Clear Scores
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                downloadTabularGradesCSV(currentModule, [s], caScores, examScores, isPublished);
                                setActiveRowMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '12.5px',
                                color: '#334155',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Download size={13} /> Export Row
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Footer with Student Count & Pagination */}
        <div className="grade-table-footer">
          <div className="grade-footer-students-count">
            <Users size={16} />
            <span>{filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}</span>
          </div>

          <div className="grade-pagination-wrap">
            <button
              type="button"
              className="grade-page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
              <button
                key={pageNumber}
                type="button"
                className={`grade-page-num-btn ${currentPage === pageNumber ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              className="grade-page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
