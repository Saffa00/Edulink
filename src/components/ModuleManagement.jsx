import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Users, Plus, Edit2, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, X, Eye, ShieldCheck, GraduationCap
} from 'lucide-react';
import {
  getMyModules, createModule, updateModule, deleteModule, getModuleStudents
} from '../services/modules';
import { supabase } from '../services/supabase';

export default function ModuleManagement({ setPage }) {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    code: '',
    title: '',
    level: '3',
    semester: 'First Semester'
  });

  const showNotification = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 5000);
  };

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMyModules();
      setModules(res.modules || []);
    } catch (err) {
      showNotification(err.message || 'Failed to load modules.', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();

    // Real-time synchronization: update when students register or drop
    const channel = supabase
      .channel('lecturer-modules-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_modules' },
        () => {
          loadModules();
          if (selectedModule) {
            viewStudents(selectedModule, false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadModules, selectedModule]);

  const resetForm = () => {
    setForm({ code: '', title: '', level: '3', semester: 'First Semester' });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleStartEdit = (mod) => {
    setForm({
      code: mod.code,
      title: mod.title,
      level: mod.level || '3',
      semester: mod.semester || 'First Semester'
    });
    setEditingId(mod.id);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      showNotification('Module code and title are required.', true);
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateModule(editingId, form);
        showNotification(`Module ${form.code} updated successfully.`);
      } else {
        await createModule(form);
        showNotification(`Module ${form.code} created! Students can now see and register for it in their course catalogue.`);
      }
      resetForm();
      await loadModules();
    } catch (err) {
      showNotification(err.message || 'Error saving module.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mod) => {
    if (!window.confirm(`Are you sure you want to remove ${mod.code} — ${mod.title}? Registered students will be unlinked.`)) {
      return;
    }

    try {
      await deleteModule(mod.id);
      showNotification(`Module ${mod.code} removed.`);
      if (selectedModule?.id === mod.id) setSelectedModule(null);
      await loadModules();
    } catch (err) {
      showNotification(err.message || 'Could not delete module.', true);
    }
  };

  const viewStudents = async (mod, showLoader = true) => {
    setSelectedModule(mod);
    if (showLoader) setLoadingStudents(true);
    try {
      const list = await getModuleStudents(mod.id);
      setStudents(list);
    } catch (err) {
      showNotification(err.message || 'Could not fetch enrolled students.', true);
    } finally {
      if (showLoader) setLoadingStudents(false);
    }
  };

  const totalStudents = modules.reduce((acc, m) => acc + (m.studentsCount || 0), 0);

  if (loading && !modules.length) {
    return (
      <div className="v-master-wrap">
        <div className="v-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <RefreshCw className="v-spin" size={28} style={{ margin: '0 auto 12px auto', color: '#0a2540' }} />
          <p style={{ color: '#556987', fontWeight: 500 }}>Loading your teaching modules…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v-master-wrap">
      {/* Top Header */}
      <header className="v-master-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={24} color="#0a2540" /> Lecturer Modules Management
          </h1>
          <p>
            Create course modules for your faculty. As soon as you create a module, students can view and register for it in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="v-btn secondary small"
            onClick={loadModules}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'v-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="v-btn primary small"
            onClick={() => {
              if (showCreateForm && !editingId) setShowCreateForm(false);
              else { resetForm(); setShowCreateForm(true); }
            }}
          >
            <Plus size={15} /> {showCreateForm && !editingId ? 'Close Form' : 'Create Module'}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {message && (
        <div className="v-banner success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="v-banner error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
          <div style={{ background: '#eaf1f8', color: '#0a2540', borderRadius: '12px', padding: '12px', display: 'flex' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Modules Teaching</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{modules.length}</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
          <div style={{ background: '#ecfdf5', color: '#059669', borderRadius: '12px', padding: '12px', display: 'flex' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Enrolled Students</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{totalStudents}</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', borderRadius: '12px', padding: '12px', display: 'flex' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Student Sync Status</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>● Live Student Sync Active</div>
          </div>
        </div>
      </div>

      {/* Module Creation / Edit Form Card */}
      {showCreateForm && (
        <section className="v-card" style={{ marginBottom: '22px', border: '2px solid #0a2540' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#0a2540" /> {editingId ? `Edit Module (${form.code})` : 'Create New Module'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: '#556987', marginTop: 0, marginBottom: '16px' }}>
            Once created, this module is instantly published to the Student Registration Catalogue so students in this department/year can register.
          </p>

          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Module Code *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. CSOR 224 or CS 401"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Module Title *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Operations Research"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Level / Academic Year
              </label>
              <select
                value={form.level}
                onChange={e => setForm({ ...form, level: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
              >
                <option value="1">Level 1 (Year 1)</option>
                <option value="2">Level 2 (Year 2)</option>
                <option value="3">Level 3 (Year 3)</option>
                <option value="4">Level 4 (Year 4)</option>
                <option value="5">Postgraduate (Masters / PhD)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Semester
              </label>
              <select
                value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
              >
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="v-btn secondary small"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="v-btn primary small"
                disabled={saving}
              >
                {saving ? 'Publishing…' : (editingId ? 'Update Module' : 'Publish Module to Students')}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Modules Table List */}
      <section className="v-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>My Active Modules ({modules.length})</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Click "Students" to view class roster
          </span>
        </div>

        {!modules.length ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '12px' }}>
            <BookOpen size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>No Modules Assigned Yet</h4>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
              Create your first module above. Students will immediately be able to find and register for it.
            </p>
            <button
              type="button"
              className="v-btn primary small"
              onClick={() => { resetForm(); setShowCreateForm(true); }}
            >
              <Plus size={14} /> Create Your First Module
            </button>
          </div>
        ) : (
          <div className="v-table-responsive">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Module Title</th>
                  <th>Level</th>
                  <th>Semester</th>
                  <th>Enrolled Students</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => {
                  const isSelected = selectedModule?.id === mod.id;
                  return (
                    <tr key={mod.id} style={{ background: isSelected ? '#f0f7ff' : undefined }}>
                      <td>
                        <b className="v-id-badge" style={{ fontSize: '12px' }}>{mod.code}</b>
                      </td>
                      <td>
                        <strong>{mod.title}</strong>
                      </td>
                      <td>Level {mod.level || '—'}</td>
                      <td>{mod.semester || '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: mod.studentsCount > 0 ? '#ecfdf5' : '#f1f5f9',
                          color: mod.studentsCount > 0 ? '#059669' : '#64748b',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          <Users size={12} /> {mod.studentsCount} {mod.studentsCount === 1 ? 'student' : 'students'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className={`v-btn-mini ${isSelected ? 'primary' : 'secondary'}`}
                            onClick={() => viewStudents(mod)}
                            title="View registered students"
                          >
                            <Eye size={13} /> Students ({mod.studentsCount})
                          </button>
                          <button
                            type="button"
                            className="v-btn-mini secondary"
                            onClick={() => handleStartEdit(mod)}
                            title="Edit module"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="v-btn-mini danger"
                            onClick={() => handleDelete(mod)}
                            title="Delete module"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Selected Module Registered Students Roster */}
      {selectedModule && (
        <section className="v-card" style={{ marginTop: '20px', borderLeft: '4px solid #0a2540' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={20} color="#0a2540" />
                Registered Students — <span style={{ color: '#0a2540' }}>{selectedModule.code}: {selectedModule.title}</span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Students who registered for this module via their student portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedModule(null)}
              style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#64748b' }}
              title="Close roster"
            >
              <X size={18} />
            </button>
          </div>

          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <RefreshCw className="v-spin" size={20} style={{ margin: '0 auto 8px auto', color: '#0a2540' }} />
              <p style={{ fontSize: '13px', color: '#64748b' }}>Loading registered students…</p>
            </div>
          ) : !students.length ? (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '10px' }}>
              <Users size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#475569', fontSize: '14px' }}>
                No students enrolled in {selectedModule.code} yet.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                When students select and add this module in their "Module Registration" tab, they will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="v-table-responsive">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Programme</th>
                    <th>Level</th>
                    <th>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(record => {
                    const st = record.students || {};
                    const regDate = record.registered_at
                      ? new Date(record.registered_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—';
                    return (
                      <tr key={record.id}>
                        <td>
                          <b className="v-id-badge">{st.student_id || '—'}</b>
                        </td>
                        <td>
                          <strong>{st.full_name || 'Student'}</strong>
                        </td>
                        <td style={{ color: '#475569', fontSize: '13px' }}>{st.email || '—'}</td>
                        <td>{st.programme || 'Department of Computer Science'}</td>
                        <td>Level {st.level || '—'}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{regDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
