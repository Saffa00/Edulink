import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, GraduationCap, Users } from 'lucide-react';
import { getModuleCatalogue } from '../services/academicMasterV41toV55.js';
import { supabase } from '../services/supabase';

export default function ModuleRegistrationV47() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getModuleCatalogue();
      setModules(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load module curriculum.');
    } finally {
      setLoading(false);
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
      </header>

      {/* Notifications */}
      {message && <div className="v-banner success"><CheckCircle2 size={18} /> {message}</div>}
      {error && <div className="v-banner error"><AlertCircle size={18} /> {error}</div>}

      {/* Info Notice Ribbon */}
      {/* Info Notice Ribbon with SLE 100 Fee Assessment */}
      <div className="v-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px', marginBottom: '18px' }}>
        <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ color: '#166534', fontSize: '13px' }}>Automatic Department Allocation Active — {modules.length} Modules Assigned</strong>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: '99px' }}>
              SLE 100.00 / Module • Total: SLE {(modules.length * 100).toFixed(2)}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '12px', lineHeight: 1.5 }}>
            Your curriculum modules are determined by your faculty, department, and academic progression. For students with Level 2 academic standing, Level 3 curriculum modules are assigned with their respective course lecturers. Tuition is assessed at SLE 100 per registered module paid through mobile money.
          </p>
        </div>
      </div>

      {/* Registered Modules Table */}
      <section className="v-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Official Course Schedule ({modules.length} Modules)</h3>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Official Department Roster Verified
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
                <th style={{ textAlign: 'right' }}>Fee / Enrollment Status</th>
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
                    <td>
                      <span>Level {m.level || '3'}</span>
                      {String(m.originalLevel) === '2' && (
                        <small style={{ display: 'block', color: '#0369a1', fontSize: '10px', fontWeight: 700 }}>
                          (Level 2 Progression)
                        </small>
                      )}
                    </td>
                    <td>{m.semester || 'First Semester'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}>
                        <Users size={13} color="#0a2540" />
                        {m.lecturers?.full_name || 'Peter Saffa'}
                      </span>
                      {m.lecturers?.lecturer_id && (
                        <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>
                          ID: {m.lecturers.lecturer_id}
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          <CheckCircle2 size={12} /> Auto-Enrolled
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          SLE 100.00
                        </span>
                      </div>
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
