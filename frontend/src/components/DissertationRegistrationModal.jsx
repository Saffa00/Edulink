import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, X, ShieldCheck, Check, ArrowRight, UserCheck, Users, Info } from 'lucide-react';
import { getDepartmentSupervisors, submitDissertationSupervisorRequest } from '../services/academicMasterV41toV55.js';

export default function DissertationRegistrationModal({ student, currentTerm, isOpen, onClose, onRegistered, initialTopic = '', initialAbstract = '' }) {
  const [topic, setTopic] = useState(initialTopic || '');
  const [abstract, setAbstract] = useState(initialAbstract || '');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingSupervisors(true);
      setError('');
      setSubmittedSuccess(false);
      if (initialTopic) setTopic(initialTopic);
      if (initialAbstract) setAbstract(initialAbstract);

      getDepartmentSupervisors()
        .then(list => {
          setSupervisors(list || []);
          // Pre-select first available supervisor if none selected
          const firstAvail = (list || []).find(s => !s.is_full && (s.remaining_slots == null || s.remaining_slots > 0));
          if (firstAvail && !selectedSupervisorId) {
            setSelectedSupervisorId(firstAvail.supervisor_id);
          }
        })
        .catch(err => {
          console.warn('Supervisors load notice:', err.message);
          setError('Could not load supervisor list. Please try again.');
        })
        .finally(() => {
          setLoadingSupervisors(false);
        });
    }
  }, [isOpen, initialTopic, initialAbstract]);

  if (!isOpen) return null;

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!topic.trim() || topic.trim().length < 5) {
      return setError('Please enter a descriptive research topic title (at least 5 characters).');
    }
    if (!abstract.trim() || abstract.trim().length < 20) {
      return setError('Please provide a research summary/abstract (at least 20 characters) explaining your proposed work.');
    }
    if (!selectedSupervisorId) {
      return setError('Please select a faculty supervisor from your department.');
    }

    const chosen = supervisors.find(s => s.supervisor_id === selectedSupervisorId);
    if (chosen && chosen.is_full) {
      return setError(`${chosen.full_name} has reached maximum student capacity. Please choose another available supervisor.`);
    }

    try {
      setBusy(true);
      setError('');
      await submitDissertationSupervisorRequest({
        supervisorId: selectedSupervisorId,
        title: topic.trim(),
        abstract: abstract.trim()
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        onRegistered?.();
        onClose?.();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to submit supervisor request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              background: 'rgba(255, 255, 255, 0.2)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              marginBottom: '6px',
              textTransform: 'uppercase'
            }}>
              Year 4 • Semester 2
            </span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              Select Dissertation Supervisor & Proposal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 0,
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {submittedSuccess ? (
            <div style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px'
              }}>
                <Check size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Supervision Request Submitted!
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px', lineHeight: 1.5 }}>
                Your research proposal and request have been sent directly to your chosen supervisor. You will be notified as soon as they confirm.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest}>
              {/* Institution Rule Note */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '18px',
                fontSize: '12.5px',
                color: '#0369a1',
                lineHeight: 1.5,
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <Info size={18} flexShrink={0} style={{ marginTop: '2px' }} />
                <div>
                  <strong>Direct Peer Selection:</strong> Choose a faculty supervisor you know in your department. Submit your title and abstract. No fee is required now—the flat <strong>SLE 500</strong> registration fee is paid only after your supervisor confirms your request.
                </div>
              </div>

              {/* Research Topic Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Proposed Research Topic / Thesis Title *
                </label>
                <textarea
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Design and Implementation of an Offline-First Health Records System for Rural Sierra Leone"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Research Abstract Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Research Abstract / Problem Statement *
                </label>
                <textarea
                  rows={3}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Briefly describe the research problem, methodology, and expected contribution..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Department Supervisor Picker */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  Choose Your Department Supervisor *
                </label>

                {loadingSupervisors ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
                    Loading department supervisors…
                  </div>
                ) : supervisors.length === 0 ? (
                  <div style={{
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px'
                  }}>
                    No faculty supervisors currently available in your department. Please check back shortly.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {supervisors.map(sup => {
                      const isSelected = selectedSupervisorId === sup.supervisor_id;
                      const isFull = sup.is_full || (sup.remaining_slots != null && sup.remaining_slots <= 0);

                      return (
                        <div
                          key={sup.supervisor_id}
                          onClick={() => {
                            if (!isFull) setSelectedSupervisorId(sup.supervisor_id);
                          }}
                          style={{
                            border: `2px solid ${isSelected ? '#0284c7' : isFull ? '#f1f5f9' : '#e2e8f0'}`,
                            background: isSelected ? '#f0f9ff' : isFull ? '#f8fafc' : '#ffffff',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            opacity: isFull ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {/* Avatar or Initials */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: isSelected ? '#0284c7' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#334155',
                              fontWeight: 800,
                              fontSize: '14px',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0
                            }}>
                              {(sup.full_name || 'FL').split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '13.5px', color: isFull ? '#64748b' : '#0f172a' }}>
                                  {sup.full_name}
                                </strong>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  • {sup.department || 'Faculty'}
                                </span>
                              </div>

                              {/* Research Area Tags */}
                              {sup.research_areas && sup.research_areas.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {sup.research_areas.slice(0, 3).map((area, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        background: isSelected ? '#e0f2fe' : '#f1f5f9',
                                        color: isSelected ? '#0369a1' : '#475569',
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      {area}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Capacity Badge */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {isFull ? (
                              <span style={{
                                display: 'inline-block',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                Capacity Full
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                background: isSelected ? '#dcfce7' : '#f1f5f9',
                                color: isSelected ? '#15803d' : '#64748b',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                {sup.remaining_slots != null ? `${sup.remaining_slots} slots left` : 'Available'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fee Information Note */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Fee Policy</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Flat SLE 500 (Payable After Confirmation)</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7' }}>SLE 0.00</span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Due Now</span>
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={busy || loadingSupervisors || supervisors.length === 0}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px'
                }}
              >
                {busy ? 'Submitting Request…' : 'Submit Supervision Request'} <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
