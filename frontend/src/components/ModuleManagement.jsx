import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Users, Plus, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, X, Eye, ShieldCheck, GraduationCap,
  Sparkles, Check, ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import {
  getMyModules, createModule, deleteModule, getModuleStudents
} from '../services/modules';
import {
  CAMPUSES_DATA, ALL_FACULTIES,
  getFacultiesByCampusId, getDepartmentsByCampusAndFaculty,
  getAvailableModulesForLecturer
} from '../data/academicCatalogue';
import { supabase } from '../services/supabase';

export default function ModuleManagement({ setPage, scopedModule, onSelectScopedModule }) {
  const [modules, setModules] = useState([]);
  const [activeScoped, setActiveScoped] = useState(scopedModule || null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Curriculum Filter Selection for Lecturer Module Assignment
  const [campus, setCampus] = useState(CAMPUSES_DATA[0]?.id || 'goderich');
  const [facultyId, setFacultyId] = useState('faculty-sciences');
  const [departmentId, setDepartmentId] = useState('dept-computer-science');
  const [level, setLevel] = useState('3');
  const [semester, setSemester] = useState('First Semester');
  const [selectedCatalogueModule, setSelectedCatalogueModule] = useState(null);

  useEffect(() => {
    if (scopedModule) {
      setActiveScoped(scopedModule);
    }
  }, [scopedModule]);

  const showNotification = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 5000);
  };

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMyModules();
      const list = res.modules || [];
      setModules(list);

      // Auto-set scoped module if none selected yet
      if (list.length > 0 && !activeScoped) {
        const first = list[0];
        setActiveScoped(first);
        onSelectScopedModule?.(first);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to load teaching modules.', true);
    } finally {
      setLoading(false);
    }
  }, [activeScoped, onSelectScopedModule]);

  useEffect(() => {
    loadModules();

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

  const handleSelectModuleToScope = (mod) => {
    setActiveScoped(mod);
    onSelectScopedModule?.(mod);
    showNotification(`Active workspace scoped to ${mod.code} (${mod.title}). All portal features now reflect this module.`);
  };

  const handleAssignModule = async (e) => {
    e.preventDefault();
    if (!selectedCatalogueModule) {
      showNotification('Please select an official module from the curriculum catalogue.', true);
      return;
    }

    try {
      setSaving(true);
      await createModule({
        code: selectedCatalogueModule.code,
        title: selectedCatalogueModule.title,
        level: selectedCatalogueModule.level || level,
        semester: selectedCatalogueModule.semester || semester,
        department_id: departmentId,
        faculty_id: facultyId
      });

      showNotification(`Teaching assignment for ${selectedCatalogueModule.code} (${selectedCatalogueModule.title}) added successfully!`);
      setShowAddModal(false);
      setSelectedCatalogueModule(null);
      await loadModules();
    } catch (err) {
      showNotification(err.message || 'Error assigning module.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mod) => {
    if (!window.confirm(`Are you sure you want to remove teaching assignment for ${mod.code} — ${mod.title}?`)) {
      return;
    }

    try {
      await deleteModule(mod.id);
      showNotification(`Module ${mod.code} removed from your teaching assignments.`);
      if (selectedModule?.id === mod.id) setSelectedModule(null);
      if (activeScoped?.id === mod.id) {
        setActiveScoped(null);
        onSelectScopedModule?.(null);
      }
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

  // Official Catalogue Modules based on Faculty + Department + Level + Semester
  const availableCatalogueModules = getAvailableModulesForLecturer({
    campusId: campus,
    facultyId,
    departmentId,
    level,
    semester
  });

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
            <BookOpen size={24} color="#0a2540" /> My Teaching Modules
          </h1>
          <p>
            Lecturers teaching multiple modules can switch between separate teaching assignments. Tapping a module scopes all app features (Attendance, Timetable, Assignments, Grades, and Class Roster) directly to that module.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="v-btn primary small"
            onClick={() => {
              setSelectedCatalogueModule(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={15} /> Select Module to Teach
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

      {/* Active Scoped Module Ribbon */}
      {activeScoped && (
        <div style={{
          background: 'linear-gradient(135deg, #0a2540, #133a63)',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(10, 37, 64, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '14px',
              color: '#38bdf8',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {activeScoped.code?.replace(/[^A-Za-z0-9]/g, '').slice(0, 4) || 'MOD'}
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#93c5fd', fontWeight: 700 }}>
                Currently Scoped Module Assignment
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {activeScoped.code} — {activeScoped.title}
              </div>
              <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '2px' }}>
                Year {activeScoped.level || '3'} • {activeScoped.studentsCount || 45} students registered • {activeScoped.semester || 'First Semester'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPage?.('attendance')}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Take Attendance
            </button>
            <button
              type="button"
              onClick={() => setPage?.('assignments')}
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Assignments
            </button>
            <button
              type="button"
              onClick={() => setPage?.('grades')}
              style={{
                background: '#38bdf8',
                color: '#0a2540',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Grade Sheet
            </button>
          </div>
        </div>
      )}

      {/* Teaching Modules Cards (The Core Grid) */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0a2540', margin: 0 }}>
              My Teaching Modules ({modules.length})
            </h2>
            <small style={{ color: '#64748b' }}>
              Tap any module card to instantly scope the application to that specific course.
            </small>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '99px' }}>
            {totalStudents} Enrolled Students
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {modules.map(mod => {
            const isScoped = activeScoped?.id === mod.id || (activeScoped?.code && activeScoped.code.toLowerCase() === mod.code?.toLowerCase());
            return (
              <div
                key={mod.id || mod.code}
                onClick={() => handleSelectModuleToScope(mod)}
                style={{
                  background: isScoped ? '#f0f9ff' : '#ffffff',
                  border: isScoped ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  boxShadow: isScoped ? '0 8px 24px rgba(2, 132, 199, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                {/* Active Indicator Badge */}
                {isScoped && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '99px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Check size={12} strokeWidth={3} /> Active Scoped Module
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Module Logo / Badge */}
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: isScoped ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #0a2540, #1e3a5f)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
                  }}>
                    <BookOpen size={24} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isScoped ? '#0284c7' : '#0a2540',
                      background: isScoped ? '#e0f2fe' : '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      marginBottom: '4px'
                    }}>
                      {mod.code}
                    </div>

                    <h3 style={{ margin: '2px 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {mod.title}
                    </h3>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      Year {mod.level || '3'}. {mod.studentsCount || 45} student base on module registered
                    </div>

                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {mod.semester || 'First Semester'} • Department of Computer Science
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #edf2f7'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="v-btn-mini secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewStudents(mod);
                      }}
                      title="View registered student roster"
                    >
                      <Users size={13} /> {mod.studentsCount || 45} Students
                    </button>
                    <button
                      type="button"
                      className="v-btn-mini secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectModuleToScope(mod);
                        setPage?.('attendance');
                      }}
                    >
                      Attendance
                    </button>
                  </div>

                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isScoped ? '#0284c7' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isScoped ? 'Features Scoped' : 'Tap to Scope'} <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Select Module to Teach Modal (Catalogue Based — No freeform inputs) */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 37, 64, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0a2540', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={22} color="#0a2540" /> Select Official Curriculum Module to Teach
                </h3>
                <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Modules are governed by department curriculum. Select your faculty, department, level, and semester to view available modules.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#64748b', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Department & Level Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Campus
                </label>
                <select
                  value={campus}
                  onChange={e => setCampus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  {CAMPUSES_DATA.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Faculty
                </label>
                <select
                  value={facultyId}
                  onChange={e => {
                    setFacultyId(e.target.value);
                    const depts = getDepartmentsByCampusAndFaculty(campus, e.target.value);
                    if (depts.length) setDepartmentId(depts[0].id);
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  {getFacultiesByCampusId(campus).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  {getDepartmentsByCampusAndFaculty(campus, facultyId).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Academic Level / Year
                </label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  <option value="1">Level 1 (Year 1)</option>
                  <option value="2">Level 2 (Year 2)</option>
                  <option value="3">Level 3 (Year 3)</option>
                  <option value="4">Level 4 (Year 4)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                >
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>
            </div>

            {/* Available Official Modules Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Available Official Curriculum Modules ({availableCatalogueModules.length})
              </label>

              {!availableCatalogueModules.length ? (
                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                  No curriculum modules found for this department, level, and semester.
                </div>
              ) : (
                <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                  {availableCatalogueModules.map(catMod => {
                    const isSelected = selectedCatalogueModule?.code === catMod.code;
                    const alreadyTeaching = modules.some(m => m.code?.toLowerCase() === catMod.code?.toLowerCase());
                    return (
                      <div
                        key={catMod.code}
                        onClick={() => !alreadyTeaching && setSelectedCatalogueModule(catMod)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          background: isSelected ? '#f0f9ff' : (alreadyTeaching ? '#f8fafc' : '#ffffff'),
                          cursor: alreadyTeaching ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: alreadyTeaching ? 0.6 : 1
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#0a2540', fontSize: '13px' }}>{catMod.code}</strong>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{catMod.title}</span>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px' }}>
                            Year {catMod.level || level} • {catMod.semester || semester}
                          </small>
                        </div>
                        <div>
                          {alreadyTeaching ? (
                            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} /> Currently Assigned
                            </span>
                          ) : isSelected ? (
                            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Selected
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="v-btn-mini secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCatalogueModule(catMod);
                              }}
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="v-btn secondary small"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v-btn primary small"
                onClick={handleAssignModule}
                disabled={saving || !selectedCatalogueModule}
              >
                {saving ? 'Assigning…' : 'Add to My Teaching Modules'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                Year {selectedModule.level || '3'} • {students.length || selectedModule.studentsCount || 45} student base on module registered
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
                Students automatically allocated ({selectedModule.studentsCount || 45} registered for Year {selectedModule.level || '3'}).
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Students enrolled in Department of Computer Science Year {selectedModule.level || '3'} are linked.
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
                        <td>{st.programme || 'B.Sc. Computer Science'}</td>
                        <td>Level {st.level || selectedModule.level || '3'}</td>
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
