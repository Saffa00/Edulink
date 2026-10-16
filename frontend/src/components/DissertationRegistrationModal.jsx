import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, X, ShieldCheck, Check, ArrowRight, UserCheck } from 'lucide-react';
import { getAvailableSupervisors, submitDissertationRegistration } from '../services/academicMasterV41toV55.js';
import PaymentCheckout from './PaymentCheckout.jsx';

export default function DissertationRegistrationModal({ student, currentTerm, isOpen, onClose, onRegistered }) {
  const [topic, setTopic] = useState('');
  const [requestedSupervisorId, setRequestedSupervisorId] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [step, setStep] = useState('form'); // 'form' | 'checkout'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      getAvailableSupervisors().then(list => setSupervisors(list || [])).catch(() => {});
      setStep('form');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!topic.trim() || topic.trim().length < 5) {
      return setError('Please enter a descriptive research topic title (at least 5 characters).');
    }
    setError('');
    setStep('checkout');
  };

  const handlePaymentCompleted = async (paymentResult) => {
    try {
      setBusy(true);
      const ref = paymentResult?.reference || paymentResult?.paymentId || paymentResult?.transactionId || `MONIME-DISS-${Date.now()}`;
      await submitDissertationRegistration({
        topic: topic.trim(),
        requestedSupervisorId: requestedSupervisorId || null,
        monimeReference: ref
      });
      onRegistered?.();
    } catch (err) {
      setError(err.message || 'Payment recorded, but registration submission failed. Please refresh your status.');
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
        maxWidth: '560px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
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
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800 }}>
              Register for Final-Year Dissertation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Content */}
        <div style={{ padding: '24px' }}>
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

          {step === 'form' ? (
            <form onSubmit={handleProceedToPayment}>
              {/* Institution Rule Note */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '18px',
                fontSize: '12.5px',
                color: '#0369a1',
                lineHeight: 1.5
              }}>
                <strong>Institutional Rule:</strong> Final Year Semester 2 is dissertation-only. There are no taught modules, timetables, or attendance check-ins. Your registration fee is a flat <strong>SLE 500</strong>.
              </div>

              {/* Research Topic Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Proposed Research Topic / Thesis Title *
                </label>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Design and Implementation of a Mobile-First Telemedicine System for Sierra Leone Healthcare Clinics"
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

              {/* Preferred Supervisor Request */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                  Requested Supervisor (Optional / Recommended)
                </label>
                <select
                  value={requestedSupervisorId}
                  onChange={(e) => setRequestedSupervisorId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="">-- Let Department HOD Assign Supervisor --</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.department || s.teaching_area || 'Academic Faculty'})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  The HOD will review your request and confirm your assigned faculty supervisor.
                </span>
              </div>

              {/* Fee Summary */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Registration Fee</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>Final Year Dissertation</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>SLE 500</span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Flat Institution Fee</span>
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px'
                }}
              >
                Proceed to Monime Mobile Payment (SLE 500) <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div>
              <PaymentCheckout
                applicant={{
                  studentId: student?.student_id || student?.id,
                  fullName: student?.full_name,
                  email: student?.email,
                  phone: student?.phone || '',
                  registrationType: 'dissertation',
                  amount: 500,
                  fee: 500,
                  modulesCount: 1,
                  modules: ['DISSERTATION-RES']
                }}
                onPaymentCompleted={handlePaymentCompleted}
                onCancel={() => setStep('form')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
