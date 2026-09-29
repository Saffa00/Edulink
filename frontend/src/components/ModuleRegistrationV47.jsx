import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, GraduationCap, Users } from 'lucide-react';
import { getModuleCatalogue } from '../services/academicMasterV41toV55.js';
import { supabase } from '../services/supabase';

export default function ModuleRegistrationV47() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const list = await getModuleCatalogue();
      setModules(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load module curriculum.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Realtime live sync: refresh as soon as a lecturer creates or assigns a module
    const channel = supabase
      .channel('student-module-curriculum-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, () => {
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_modules' }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (loading && !modules.length) {
    return (
      <div className="v-master-wrap">
        <div className="v-card text-center" style={{ padding: '60px 20px' }}>
          <RefreshCw className="v-spin" size={26} style={{ margin: '0 auto 12px auto', color: '#0a2540' }} />
          <p style={{ color: '#556987', fontWeight: 500 }}>Loading your assigned academic curriculum…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v-master-wrap">
      {/* Header */}
      <header className="v-master-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={24} color="#0a2540" /> My Registered Curriculum Modules
          </h1>
          <p>
            Official course modules automatically assigned to your programme and academic level by your department.
          </p>
        </div>
        <button
          type="button"
          className="v-btn secondary small"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'v-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh Modules'}
        </button>
      </header>

      {/* Notifications */}
      {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

      {/* Info Notice Ribbon */}
      <div className="v-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px', marginBottom: '18px' }}>
        <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#166534', fontSize: '13px' }}>Automatic Department Allocation Active</strong>
          <p style={{ margin: '3px 0 0 0', color: '#15803d', fontSize: '12px', lineHeight: 1.5 }}>
            Your curriculum modules are determined and assigned directly by your faculty according to your academic year and programme. Students do not manually add or drop courses.
          </p>
        </div>
      </div>

      {/* Registered Modules Table */}
      <section className="v-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Official Course Schedule ({modules.length})</h3>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Official Roster Verified
          </span>
        </div>

        <div className="v-table-responsive">
          <table className="v-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Module Title</th>
                <th>Academic Level</th>
                <th>Semester</th>
                <th>Assigned Lecturer</th>
                <th style={{ textAlign: 'right' }}>Enrollment Status</th>
              </tr>
            </thead>
            <tbody>
              {!modules.length ? (
                <tr>
                  <td colSpan="6" className="v-no-data" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <BookOpen size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No curriculum modules assigned for your current level yet.</p>
                    <small style={{ color: '#94a3b8' }}>When your lecturer publishes modules for your level, they will appear here automatically.</small>
                  </td>
                </tr>
              ) : (
                modules.map(m => (
                  <tr key={m.id}>
                    <td>
                      <b className="v-id-badge" style={{ fontSize: '12px' }}>{m.code}</b>
                    </td>
                    <td>
                      <strong>{m.title}</strong>
                    </td>
                    <td>Level {m.level || '3'}</td>
                    <td>{m.semester || 'First Semester'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                        <Users size={13} color="#0a2540" />
                        {m.lecturers?.full_name || 'Department Academic Staff'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ecfdf5',
                        color: '#059669',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <CheckCircle2 size={12} /> Auto-Enrolled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
