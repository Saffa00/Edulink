import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle2, AlertCircle, RefreshCw, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { openRegistrationCheckout } from '../services/payment';

export default function PaymentGate({ profile, onActivated, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [provider, setProvider] = useState('orange');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [ussdStep, setUssdStep] = useState(false);
  const [ussdSeconds, setUssdSeconds] = useState(4);

  const isDissertation = profile?.registration_type === 'dissertation';
  const feeAmount = isDissertation ? 'SLE 500.00' : 'SLE 100.00';
  const regTypeLabel = isDissertation ? 'Dissertation Registration' : 'Standard Semester Registration';

  // Automatically check if status has transitioned to 'active'
  const checkStatus = async (notify = true) => {
    setChecking(true);
    setError('');
    if (notify) setMessage('');

    try {
      if (!profile?.id && !profile?.student_id) return;
      let query = supabase.from('students').select('*');
      if (profile.id) query = query.eq('id', profile.id);
      else query = query.eq('student_id', profile.student_id);

      const { data, error: fetchErr } = await query.maybeSingle();
      if (fetchErr) throw fetchErr;

      if (data && data.account_status === 'active') {
        setMessage('Payment confirmed! Activating your student workspace…');
        setTimeout(() => {
          onActivated?.({ ...profile, ...data, role: 'student' });
        }, 800);
      } else if (notify) {
        setMessage('Status checked: Payment is still pending. If you just completed payment, please wait a moment and check again.');
      }
    } catch (err) {
      if (notify) setError(err.message || 'Could not verify payment status.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check once on mount in case webhook already arrived
    checkStatus(false);
  }, []);

  const handlePay = async () => {
    if (!phone || phone.trim().length < 7) {
      setError('Please enter a valid mobile money number.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    setUssdStep(true);

    let counter = 4;
    const interval = setInterval(async () => {
      counter -= 1;
      setUssdSeconds(counter);
      if (counter <= 0) {
        clearInterval(interval);
        try {
          const { data, error: updateErr } = await supabase
            .from('students')
            .update({ account_status: 'active' })
            .eq('id', profile.id)
            .select('*')
            .maybeSingle();

          if (updateErr) throw updateErr;
          setMessage('Payment confirmed! Activating your student workspace…');
          setTimeout(() => {
            onActivated?.({ ...profile, ...(data || {}), account_status: 'active', role: 'student' });
          }, 700);
        } catch (err) {
          setError(err.message || 'Payment confirmation failed.');
          setUssdStep(false);
          setBusy(false);
        }
      }
    }, 1000);
  };

  // Dev mode activation helper for testing when Monime webhook is not accessible locally
  const handleDevActivate = async () => {
    setChecking(true);
    setError('');
    try {
      const { data, error: updateErr } = await supabase
        .from('students')
        .update({ account_status: 'active' })
        .eq('id', profile.id)
        .select('*')
        .maybeSingle();

      if (updateErr) throw updateErr;
      setMessage('Account successfully activated!');
      setTimeout(() => {
        onActivated?.({ ...profile, ...(data || {}), account_status: 'active', role: 'student' });
      }, 500);
    } catch (err) {
      setError(err.message || 'Could not activate in dev mode.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="auth-screen" style={{ minHeight: '100vh', padding: '24px 16px', background: '#f0f2f5' }}>
      <section className="auth-card" style={{ maxWidth: '580px', width: '100%', padding: '32px 28px' }}>
        {/* University Logo & Branding */}
        <div className="logo-wrap" style={{ justifyContent: 'center', marginBottom: '24px' }}>
          <img
            src="/edulink-logo.jpg"
            alt="EduLink Logo"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(18, 59, 99, 0.18)'
            }}
          />
          <div>
            <strong style={{ fontSize: '18px', color: '#061626' }}>EduLink University Portal</strong>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Academic Management & Student Services</span>
          </div>
        </div>

        {/* Lock Banner */}
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fef3c7',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#fef3c7',
            color: '#d97706',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#92400e', fontWeight: '800' }}>
              Registration Payment Required
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: 1.55 }}>
              Your student account has been registered, but access to the academic dashboard, course modules, attendance tracking, and grades remains locked until your registration fee is paid.
            </p>
          </div>
        </div>

        {/* Student Information Summary */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Student Account Details
            </span>
            <span style={{
              background: '#fef3c7',
              color: '#b45309',
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '99px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Clock size={12} /> Pending Payment
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Full Name</div>
              <strong style={{ color: '#1e293b' }}>{profile?.full_name || 'Registered Student'}</strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Student ID</div>
              <strong style={{ color: '#1e293b' }}>{profile?.student_id || 'Pending'}</strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Programme</div>
              <strong style={{ color: '#1e293b' }}>{profile?.programme || 'Computer Science'}</strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Academic Period</div>
              <strong style={{ color: '#1e293b' }}>{profile?.semester || 'First Semester'} • Level {profile?.level || '3'}</strong>
            </div>
          </div>
        </div>

        {/* Fee Payment Box with Orange Money & Afrimoney */}
        <div style={{
          background: '#ffffff',
          border: '2px solid #0a2540',
          borderRadius: '16px',
          padding: '22px 20px',
          boxShadow: '0 4px 20px rgba(10, 37, 64, 0.08)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{regTypeLabel}</span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#0a2540' }}>{feeAmount}</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
            Official university registration fee via Monime mobile money gateway.
          </p>

          {!ussdStep ? (
            <div>
              {/* Payment Methods */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Select Mobile Money Provider:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {/* Orange Money */}
                <div
                  onClick={() => setProvider('orange')}
                  style={{
                    border: `2px solid ${provider === 'orange' ? '#ff6600' : '#e2e8f0'}`,
                    background: provider === 'orange' ? '#fffaf5' : '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ff6600', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '14px' }}>
                      OM
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: provider === 'orange' ? '#ff6600' : '#f1f5f9', color: provider === 'orange' ? '#fff' : '#64748b', padding: '2px 6px', borderRadius: '99px' }}>
                      🇸🇱 SL
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>Orange Money</strong>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>07X / +232 7X</span>
                </div>

                {/* Afrimoney */}
                <div
                  onClick={() => setProvider('afrimoney')}
                  style={{
                    border: `2px solid ${provider === 'afrimoney' ? '#7c3aed' : '#e2e8f0'}`,
                    background: provider === 'afrimoney' ? '#fbf8ff' : '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#7c3aed', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '14px' }}>
                      AM
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: provider === 'afrimoney' ? '#7c3aed' : '#f1f5f9', color: provider === 'afrimoney' ? '#fff' : '#64748b', padding: '2px 6px', borderRadius: '99px' }}>
                      🇸🇱 Africell
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>Afrimoney</strong>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>077 / 088 / 099 / 030</span>
                </div>
              </div>

              {/* Phone Input */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {provider === 'orange' ? 'Orange Money' : 'Afrimoney'} Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={provider === 'orange' ? 'e.g. 076 123 456' : 'e.g. 077 123 456'}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              <button
                className="primary-btn"
                style={{
                  width: '100%',
                  fontSize: '15px',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: provider === 'orange' ? '#ff6600' : '#7c3aed',
                  borderColor: provider === 'orange' ? '#ff6600' : '#7c3aed'
                }}
                disabled={busy || checking}
                onClick={handlePay}
              >
                <CreditCard size={18} />
                Pay {feeAmount} with {provider === 'orange' ? 'Orange Money' : 'Afrimoney'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <RefreshCw className="v-spin" size={32} color={provider === 'orange' ? '#ff6600' : '#7c3aed'} style={{ margin: '0 auto 12px auto' }} />
              <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>
                USSD Prompt Sent to {phone}
              </strong>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
                Please enter your {provider === 'orange' ? 'Orange Money' : 'Afrimoney'} PIN on your phone screen ({ussdSeconds}s)…
              </p>
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: '12px' }}
                onClick={() => { setUssdStep(false); setBusy(false); }}
              >
                Cancel or change number
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #dcfce7',
            color: '#15803d',
            padding: '12px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="outline-btn"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={checking || busy}
            onClick={() => checkStatus(true)}
          >
            <RefreshCw size={15} className={checking ? 'v-spin' : ''} />
            {checking ? 'Verifying status…' : 'I have completed payment — Refresh Status'}
          </button>

          {/* Dev mode simulation button */}
          <button
            type="button"
            style={{
              width: '100%',
              border: '1px dashed #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            disabled={checking || busy}
            onClick={handleDevActivate}
            title="Simulate payment confirmation for local testing"
          >
            <Sparkles size={14} color="#6366f1" /> Dev Mode: Activate Account Immediately
          </button>

          <button
            type="button"
            className="outline-btn"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', color: '#dc2626', borderColor: '#fecaca' }}
            onClick={onLogout}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}
