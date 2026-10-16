import React, { useState } from 'react';
import { Clock, ShieldCheck, RefreshCw, LogOut, FileText, CheckCircle2 } from 'lucide-react';

export default function DissertationWaitingApprovalScreen({ student, termRegistration, dissertation, onRefresh, onLogout }) {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    try {
      setChecking(true);
      await onRefresh?.();
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" style={{ maxWidth: '520px', textAlign: 'center', padding: '36px 28px' }}>
        {/* Pulsing Status Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.2)'
        }}>
          <Clock size={38} color="#0284c7" />
        </div>

        <span style={{
          display: 'inline-block',
          background: '#fef3c7',
          color: '#b45309',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 800,
          marginBottom: '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          Registration Status: Awaiting Approval
        </span>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
          Registration Submitted & Paid
        </h1>

        <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          Your Year 4 Semester 2 dissertation proposal has been received and your <strong>SLE 500</strong> registration fee is confirmed. The Head of Department (HOD) and Academic Administration are currently reviewing your proposal and assigning your faculty supervisor.
        </p>

        {/* Details Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '18px',
          textAlign: 'left',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>Candidate:</span>
            <strong style={{ color: '#0f172a' }}>{student?.full_name || 'Final Year Student'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>Academic Term:</span>
            <strong style={{ color: '#0f172a' }}>2026/2027 • Semester 2</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>Fee Payment:</span>
            <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> SLE 500 Confirmed (Monime)
            </span>
          </div>
          {dissertation?.title && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Proposed Research Topic:
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
                "{dissertation.title}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={handleRefresh}
            disabled={checking}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px', fontWeight: 700 }}
          >
            <RefreshCw size={16} className={checking ? 'v-spin' : ''} /> {checking ? 'Checking Status…' : 'Check Approval Status'}
          </button>

          <button
            type="button"
            className="outline-btn"
            onClick={onLogout}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}
