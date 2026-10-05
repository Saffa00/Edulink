import React, { useEffect, useState, useCallback } from 'react';
import { Users, Search, ChevronRight, BookOpen, CalendarCheck, ClipboardList, Award, RefreshCw, X } from 'lucide-react';
import { getLecturerStudentRoster, getStudent360Dossier } from '../services/academicMasterV41toV55.js';

export default function StudentManagementV48({ scopedModule = null }) {
  const [roster, setRoster] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRoster = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getLecturerStudentRoster();
      setRoster(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const handleOpenDossier = async (student) => {
    try {
      setSelectedStudent(student);
      setDossierLoading(true);
      const data = await getStudent360Dossier(student.id);
      setDossier(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDossierLoading(false);
    }
  };

  const filtered = roster.filter(item => {
    const s = item.students;
    if (scopedModule) {
      const scopedCode = String(scopedModule.code || '').replace(/\s+/g, '').toUpperCase();
      const itemCode = String(item.modules?.code || '').replace(/\s+/g, '').toUpperCase();
      const match = item.module_id === scopedModule.id || (scopedCode && (itemCode.includes(scopedCode) || scopedCode.includes(itemCode)));
      if (!match) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s?.student_id?.toLowerCase().includes(q) || s?.full_name?.toLowerCase().includes(q) || item.modules?.code?.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="v-master-wrap"><div className="v-card text-center"><RefreshCw className="v-spin" size={24} /><p>Loading student directory…</p></div></div>;
  }

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Enrolled Students</h1>
          <p>Academic profiles and performance tracking for students in your taught modules.</p>
        </div>
      </header>

      {scopedModule && (
        <div style={{ marginBottom: '14px', fontSize: '13px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Users size={16} /> Scoped Class Roster: {scopedModule.code} ({scopedModule.title}) — Year 3. {scopedModule.studentsCount || 45} students registered
        </div>
      )}

      <div className="v-search-box" style={{ maxWidth: '400px' }}>
        <Search size={16} color="#64748b" />
        <input type="text" placeholder="Search student ID, name, or module..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="v-card">
        <div className="v-table-responsive">
          <table className="v-table">
            <thead>
              <tr><th>Student ID</th><th>Full Name</th><th>Enrolled Module</th><th>Programme</th><th>Level</th><th style={{ textAlign: 'right' }}>Profile</th></tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan="6" className="v-no-data" style={{ padding: '30px', textAlign: 'center', color: 'var(--v-text-muted)' }}>No students found matching your query.</td></tr>
              ) : (
                filtered.map((item, idx) => {
                  const s = item.students;
                  return (
                    <tr key={`${s?.id}-${idx}`}>
                      <td><b className="v-id-badge">{s?.student_id}</b></td>
                      <td><strong>{s?.full_name}</strong><small className="v-sub" style={{ display: 'block', fontSize: '0.76rem', color: 'var(--v-text-muted)' }}>{s?.email}</small></td>
                      <td><span className="v-chip">{item.modules?.code}</span></td>
                      <td>{s?.programme || 'Undergraduate'}</td>
                      <td>Level {s?.level || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="v-btn-mini primary" onClick={() => handleOpenDossier(s)}>
                          View Details <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dossier Modal */}
      {selectedStudent && (
        <div className="v-modal-overlay">
          <div className="v-modal-card" style={{ maxWidth: '750px' }}>
            <div className="v-modal-head">
              <div>
                <h3>{selectedStudent.full_name}</h3>
                <span>Student ID: {selectedStudent.student_id} · {selectedStudent.programme} (Level {selectedStudent.level})</span>
              </div>
              <button className="v-close-btn" onClick={() => { setSelectedStudent(null); setDossier(null); }}><X size={20} /></button>
            </div>
            <div className="v-modal-body">
              {dossierLoading ? (
                <div className="text-center" style={{ padding: '30px' }}><RefreshCw className="v-spin" size={24} /></div>
              ) : dossier ? (
                <div className="v-dossier-grid">
                  <div className="v-dossier-card">
                    <h4><CalendarCheck size={16} /> Attendance Records ({dossier.attendance.length})</h4>
                    <p>Present: <b>{dossier.attendance.filter(a => a.status === 'present').length}</b> · Late: <b>{dossier.attendance.filter(a => a.status === 'late').length}</b></p>
                  </div>
                  <div className="v-dossier-card">
                    <h4><ClipboardList size={16} /> Coursework Submissions ({dossier.submissions.length})</h4>
                    <p>Completed: <b>{dossier.submissions.filter(s => s.status === 'graded').length} graded</b></p>
                  </div>
                  <div className="v-dossier-card">
                    <h4><Award size={16} /> Module Grades</h4>
                    {!dossier.grades.length ? <small className="v-sub">No published grades yet.</small> : (
                      dossier.grades.map((g, i) => (
                        <div key={i} className="v-grade-mini-row">
                          <span>{g.modules?.code}:</span> <b>{g.score != null ? `${g.score} (${g.grade})` : 'Pending'}</b>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="v-dossier-card">
                    <h4><BookOpen size={16} /> Dissertation Status</h4>
                    {dossier.dissertation ? (
                      <p><b>{dossier.dissertation.title}</b><br /><small>Stage: Chapter {dossier.dissertation.current_chapter} ({dossier.dissertation.status})</small></p>
                    ) : <small className="v-sub">Not enrolled in dissertation.</small>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
