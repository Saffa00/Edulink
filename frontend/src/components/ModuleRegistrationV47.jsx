import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, GraduationCap, Users, Clock, Plus, X, ArrowRight, Check } from 'lucide-react';
import { getModuleCatalogue, addModuleRegistration, getStudentProfile } from '../services/academicMasterV41toV55.js';
import { supabase } from '../services/supabase';
import PaymentCheckout from './PaymentCheckout.jsx';

export default function ModuleRegistrationV47() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // + Add Module Workflow States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQuota, setAddQuota] = useState(1);
  const [selectedAddCodes, setSelectedAddCodes] = useState([]);
  const [addBusy, setAddBusy] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [checkoutApplicant, setCheckoutApplicant] = useState(null);

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [list, profile] = await Promise.all([
        getModuleCatalogue(),
        getStudentProfile().catch(() => null)
      ]);
      setModules(list || []);
      if (profile) setCurrentStudent(profile);
    } catch (err) {
      setError(err.message || 'Failed to load module curriculum.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenAddModal = () => {
    setAddQuota(1);
    setSelectedAddCodes([]);
    setShowAddModal(true);
  };

  const handleToggleAddModule = (code) => {
    if (selectedAddCodes.includes(code)) {
      setSelectedAddCodes(selectedAddCodes.filter(c => c !== code));
    } else {
      if (selectedAddCodes.length < addQuota) {
        setSelectedAddCodes([...selectedAddCodes, code]);
      } else if (addQuota === 1) {
        setSelectedAddCodes([code]);
      } else {
        setError(`You selected a quota of ${addQuota} modules. Uncheck one module or choose a higher module count in Step 1.`);
      }
    }
  };

  const handleConfirmAddPayment = async () => {
    if (selectedAddCodes.length !== addQuota) {
      setError(`Please select ${addQuota - selectedAddCodes.length} more module(s) to match your chosen quota.`);
      return;
    }

    setAddBusy(true);
    setError('');
    try {
      let student = currentStudent;
      if (!student) {
        student = await getStudentProfile().catch(() => null);
        if (student) setCurrentStudent(student);
      }

      const chosenModsData = modules
        .filter(m => selectedAddCodes.includes(m.code))
        .map(m => ({
          code: m.code,
          title: m.title,
          fee: 1.00
        }));

      setCheckoutApplicant({
        studentId: student?.student_id || student?.id || 'STUDENT',
        fullName: student?.full_name || 'Enrolled Student',
        email: student?.email || '',
        phone: student?.phone || '',
        programme: student?.programme || 'Undergraduate',
        level: student?.level || '1',
        semester: student?.semester || 'First Semester',
        registrationType: 'normal',
        modules: selectedAddCodes,
        modulesCount: selectedAddCodes.length,
        modulesData: chosenModsData,
        amount: Number((selectedAddCodes.length * 1.00).toFixed(2))
      });
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'Could not initiate checkout. Please try again.');
    } finally {
      setAddBusy(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime live sync: refresh as soon as a lecturer creates or assigns a module
    const channel = supabase
      .channel('student-module-curriculum-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modules' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_modules' }, () => {
        loadData();
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
          onClick={handleOpenAddModal}
          className="primary-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '10px'
          }}
        >
          <Plus size={16} /> Add Module
        </button>
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
              SLE 1.00 / Module • Total: SLE {(modules.length * 1.00).toFixed(2)}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '12px', lineHeight: 1.5 }}>
            Your curriculum modules are determined by your faculty, department, and academic progression. For students with Level 2 academic standing, Level 3 curriculum modules are assigned with their respective course lecturers. Tuition is assessed at SLE 1.00 per registered module paid through mobile money.
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
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: m.isPaid ? '#ecfdf5' : '#fff7ed',
                          color: m.isPaid ? '#059669' : '#c2410c',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {m.isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {m.isPaid ? 'PAID / ACTIVE' : 'PENDING PAYMENT'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          SLE 1.00
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
      {/* Add Module Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '12px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 'clamp(16px, 4vw, 24px) clamp(14px, 4vw, 26px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 800, overflowWrap: 'anywhere' }}>
                  Add & Register Modules
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b', overflowWrap: 'anywhere' }}>
                  Select the number of modules and pick which courses to register & activate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', flexShrink: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Quota Selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                <span style={{ background: '#0284c7', color: '#fff', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', flexShrink: 0 }}>Step 1</span>
                <strong style={{ fontSize: '13.5px', color: '#0f172a', minWidth: 0, overflowWrap: 'anywhere' }}>How many modules do you want to pay for?</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '8px' }}>
                {[1, 2, 3, 4].map(num => (
                  <label
                    key={num}
                    onClick={() => {
                      setAddQuota(num);
                      if (selectedAddCodes.length > num) {
                        setSelectedAddCodes(selectedAddCodes.slice(0, num));
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: addQuota === num ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: addQuota === num ? '#f0f9ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <input
                        type="radio"
                        checked={addQuota === num}
                        onChange={() => setAddQuota(num)}
                        style={{ accentColor: '#0284c7', margin: 0, flexShrink: 0 }}
                      />
                      <strong style={{ fontSize: '12.5px', color: addQuota === num ? '#0284c7' : '#1e293b' }}>
                        {num} {num === 1 ? 'Module' : 'Modules'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      SLE {(num * 1.00).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Select Modules */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: '#0284c7', color: '#fff', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', flexShrink: 0 }}>Step 2</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Select {addQuota} {addQuota === 1 ? 'Module' : 'Modules'}</strong>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: selectedAddCodes.length === addQuota ? '#15803d' : '#b45309',
                  background: selectedAddCodes.length === addQuota ? '#dcfce7' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  flexShrink: 0
                }}>
                  {selectedAddCodes.length} of {addQuota} selected
                </span>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {modules.map(m => {
                  const isChecked = selectedAddCodes.includes(m.code);
                  return (
                    <div
                      key={m.id || m.code}
                      onClick={() => handleToggleAddModule(m.code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isChecked ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: isChecked ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: '#0284c7', width: '16px', height: '16px', margin: 0, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <strong style={{ color: '#0284c7', fontSize: '12.5px' }}>{m.code}</strong>
                            <span style={{ color: '#0f172a', fontSize: '12.5px', fontWeight: 600, overflowWrap: 'anywhere' }}>{m.title}</span>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', overflowWrap: 'anywhere' }}>
                            Lecturer: {m.lecturers?.full_name || 'Department Lecturer'}
                          </small>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '11.5px', color: '#0284c7', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        SLE 1.00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Summary & Pay */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '18px',
              boxSizing: 'border-box',
              maxWidth: '100%'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {selectedAddCodes.length} {selectedAddCodes.length === 1 ? 'Module' : 'Modules'} Selected
                </strong>
                <span style={{ fontSize: '11px', fontWeight: 700, color: selectedAddCodes.length === addQuota ? '#15803d' : '#b45309' }}>
                  {selectedAddCodes.length === addQuota ? 'Ready to Activate ✓' : `Select ${addQuota - selectedAddCodes.length} more`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Total Due:</span>
                <span style={{ fontWeight: 900, fontSize: '16px', color: '#0284c7' }}>
                  SLE {(selectedAddCodes.length * 1.00).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="outline-btn"
                style={{ flex: '1 1 100px', justifyContent: 'center', minHeight: '44px' }}
                onClick={() => setShowAddModal(false)}
                disabled={addBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ flex: '2 1 180px', minHeight: '44px', height: 'auto', whiteSpace: 'normal' }}
                disabled={addBusy || selectedAddCodes.length !== addQuota}
                onClick={handleConfirmAddPayment}
              >
                {addBusy ? 'Processing…' : `Pay SLE ${(addQuota * 1.00).toFixed(2)} & Activate`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Mobile Money Payment Checkout for Added Modules */}
      {checkoutApplicant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 37, 64, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '620px', width: '100%', minWidth: 0, position: 'relative' }}>
            <PaymentCheckout
              applicant={checkoutApplicant}
              onPaymentCompleted={async (confirmed) => {
                try {
                  for (const code of checkoutApplicant.modules) {
                    const modObj = modules.find(m => m.code === code);
                    if (modObj?.id) {
                      await addModuleRegistration(modObj.id);
                    }
                  }
                  setMessage(`🎉 Payment of SLE ${checkoutApplicant.amount} confirmed via Monime! ${checkoutApplicant.modulesCount} module(s) successfully registered & activated.`);
                  await loadData();
                } catch (actErr) {
                  console.warn('Module activation notice:', actErr);
                }
                setCheckoutApplicant(null);
              }}
              onCancel={() => {
                setCheckoutApplicant(null);
                setShowAddModal(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
