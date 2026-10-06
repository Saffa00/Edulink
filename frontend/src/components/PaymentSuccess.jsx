import React, { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Check, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, KeyRound, Mail } from 'lucide-react';
import { verifyPaymentAndProvision } from '../services/payment';

export default function PaymentSuccess({ onProceedToLogin, data: propData }) {
  const [loading, setLoading] = useState(!propData);
  const [data, setData] = useState(propData || null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id') || params.get('sessionId');
    const studentId = params.get('student_id') || params.get('studentId');

    async function confirm() {
      try {
        setLoading(true);
        const res = await verifyPaymentAndProvision({ sessionId, studentId });
        setData(res);

        // Automatically bind this device upon account creation & payment completion (One Device Per Account)
        try {
          const { ensureDeviceCredential, setDeviceName } = await import('../services/device');
          await ensureDeviceCredential();
          const ua = navigator.userAgent || '';
          const detected = /iPhone/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android Device' : /iPad/i.test(ua) ? 'iPad' : /Macintosh/i.test(ua) ? 'Mac' : 'Windows PC';
          setDeviceName(detected);
        } catch (devErr) {
          console.warn('Device binding notice:', devErr);
        }
      } catch (err) {
        console.error('Payment confirmation error:', err);
        setError(err.message || 'Unable to confirm payment session.');
      } finally {
        setLoading(false);
      }
    }

    confirm();
  }, []);

  const handleCopyPassword = () => {
    if (data?.temporaryPassword) {
      navigator.clipboard.writeText(data.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <main className="auth-screen">
        <section className="auth-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
          <RefreshCw className="v-spin" size={36} style={{ margin: '0 auto 16px auto', color: '#0a2540' }} />
          <h2 style={{ fontSize: '19px', color: '#061626', margin: '0 0 8px 0' }}>Verifying Registration Payment</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Confirming your Monime transaction and provisioning your student account…
          </p>
        </section>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="auth-screen">
        <section className="auth-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 14px auto' }} />
          <h2 style={{ fontSize: '19px', color: '#061626', margin: '0 0 8px 0' }}>Payment Confirmation Pending</h2>
          <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '20px' }}>{error}</p>
          <button
            type="button"
            className="primary-btn full-btn"
            onClick={() => window.location.reload()}
          >
            Check Again
          </button>
          <button
            type="button"
            className="text-btn"
            style={{ marginTop: '14px' }}
            onClick={() => onProceedToLogin?.()}
          >
            Go to Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-card wide" style={{ maxWidth: '560px', padding: '32px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#059669',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 12px auto'
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h1 style={{ fontSize: '22px', color: '#061626', margin: '0 0 6px 0', fontWeight: 800 }}>Payment Confirmed & Account Activated!</h1>
          <p style={{ color: '#15803d', fontSize: '14px', fontWeight: 700, margin: '0 0 14px 0' }}>
            Payment Successful ✓ SLE {data?.amount || 100}.00 paid • {data?.modulesCount || 1} {data?.modulesCount === 1 ? 'module' : 'modules'} registered
          </p>

          {Array.isArray(data?.modules) && data.modules.length > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginTop: '10px',
              marginBottom: '14px',
              textAlign: 'left'
            }}>
              <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                {data.modules.length} {data.modules.length === 1 ? 'Module' : 'Modules'} Activated
              </small>
              {data.modules.map((m, idx) => {
                const code = typeof m === 'string' ? m : (m.code || `Module ${idx + 1}`);
                const title = typeof m === 'object' && m.title ? m.title : '';
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: idx < data.modules.length - 1 ? '1px solid #edf2f7' : 'none', fontSize: '12.5px' }}>
                    <span>
                      <strong style={{ color: '#0284c7', marginRight: '6px' }}>{code}</strong>
                      <span style={{ color: '#475569' }}>{title}</span>
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '99px' }}>
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f1f5f9',
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#475569',
            fontFamily: 'monospace'
          }}>
            <span>Transaction ID:</span>
            <strong>{data?.transactionId || data?.reference || 'REG-CONFIRMED'}</strong>
          </div>
        </div>

        {/* Student Credential Card */}
        <div style={{
          background: '#061626',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(6, 22, 38, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '10px' }}>
            <div>
              <small style={{ color: '#93b3d4', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.6px', fontWeight: 700 }}>Your Student ID</small>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>{data?.studentId}</div>
            </div>
            <span style={{
              background: '#059669',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '99px'
            }}>
              Paid & Active
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <KeyRound size={15} color="#38bdf8" />
              <small style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 600 }}>Your Temporary Password:</small>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}>
              <code style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px', color: '#ffffff' }}>
                {data?.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={handleCopyPassword}
                style={{
                  border: 0,
                  background: copied ? '#059669' : '#0a2540',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#93b3d4' }}>
            <Mail size={13} color="#93b3d4" style={{ flexShrink: 0 }} />
            <span>Credentials have also been dispatched to <strong>{data?.email}</strong></span>
          </div>
        </div>

        {/* Security & First Login Note */}
        <div className="security-note" style={{ marginBottom: '14px', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
          <ShieldCheck size={18} color="#16a34a" />
          <div>
            <strong style={{ color: '#14532d' }}>Device Registered (One Device Per Account)</strong>
            <span style={{ color: '#15803d' }}>This device has been automatically bound to your account. You will not need to type in your device name when logging in.</span>
          </div>
        </div>

        <div className="security-note" style={{ marginBottom: '20px', background: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' }}>
          <ShieldCheck size={18} color="#0a2540" />
          <div>
            <strong style={{ color: '#061626' }}>Mandatory Password Update</strong>
            <span>Upon logging in with your temporary password, you will be prompted to set your personal permanent password to secure your account.</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="primary-btn full-btn"
          style={{ height: '48px', fontSize: '15px' }}
          onClick={() => onProceedToLogin?.({ studentId: data?.studentId })}
        >
          Go to My Modules <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
}
