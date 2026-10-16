import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Clock, CheckCircle2, AlertCircle, RefreshCw, LogOut, ShieldAlert, Sparkles, ExternalLink, ArrowRight, ArrowLeft, PhoneCall, Copy, Check, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabase';
import { initiateMobileMoneyPayment, checkMobileMoneyPaymentStatus } from '../services/payment';

export default function PaymentGate({ profile, onActivated, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [provider, setProvider] = useState('orange');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [ussdStep, setUssdStep] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const pollingRef = useRef(null);

  const isDissertation = profile?.registration_type === 'dissertation';
  const modulesCount = profile?.modulesCount || (Array.isArray(profile?.modules) && profile.modules.length) || (isDissertation ? 1 : 3);
  const totalAmount = isDissertation ? 500 : Number((modulesCount * 0.40).toFixed(2));
  const feeAmount = `SLE ${totalAmount.toFixed(2)}`;
  const regTypeLabel = isDissertation
    ? 'Final Year Dissertation Registration'
    : `Semester Module Registration (${modulesCount} ${modulesCount === 1 ? 'Module' : 'Modules'})`;
  const ussdCode = paymentInfo?.ussdCode || (paymentInfo?.ussdNumericCode ? `*715*${paymentInfo.ussdNumericCode}#` : null);

  const confirmUssdPayment = () => {
    setMessage('Payment confirmed! Activating your student workspace…');
    setTimeout(() => {
      onActivated?.({ ...profile, account_status: 'active', role: 'student' });
    }, 600);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(ussdCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handlePayNow = () => {
    if (!ussdCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ussdCode);
      }
    } catch {}
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3500);
    window.location.href = `tel:${encodeURIComponent(ussdCode)}`;
  };

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
        setMessage('Status checked: Payment is still pending. Please authorize the prompt on your mobile phone.');
      }
    } catch (err) {
      if (notify) setError(err.message || 'Could not verify payment status.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Polling backend while Monime checkout session is active
  useEffect(() => {
    if (!ussdStep || !paymentId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await checkMobileMoneyPaymentStatus(paymentId);
        if (res?.paid || res?.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setMessage('Payment confirmed by mobile carrier! Activating student portal…');
          setTimeout(() => {
            onActivated?.({ ...profile, account_status: 'active', role: 'student' });
          }, 800);
        }
      } catch (e) {
        // Polling retry
      }
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [ussdStep, paymentId, profile, onActivated]);

  const handlePay = async () => {
    if (!phone || phone.trim().length < 7) {
      setError('Please enter a valid mobile money number.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await initiateMobileMoneyPayment({
        studentId: profile.student_id || profile.id,
        phone: phone.trim(),
        provider,
        modulesCount,
        registrationType: profile.registration_type || 'normal'
      });
      setPaymentId(res.paymentId);
      setPaymentInfo(res);
      setCheckoutUrl(res.checkoutUrl);
      setUssdStep(true);
    } catch (err) {
      setError(err.message || 'Could not send payment authorization request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen" style={{ minHeight: '100vh', padding: 'clamp(12px, 4vw, 24px) clamp(10px, 3.5vw, 16px)', background: '#f0f2f5', boxSizing: 'border-box', maxWidth: '100%' }}>
      <section className="auth-card" style={{ maxWidth: '580px', width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 'clamp(16px, 4.5vw, 32px) clamp(14px, 4vw, 28px)' }}>
        {/* University Logo & Branding */}
        <div className="logo-wrap" style={{ justifyContent: 'center', marginBottom: '24px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', maxWidth: '100%' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(18, 59, 99, 0.18)',
              flexShrink: 0
            }}
          >
            <CreditCard size={26} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: '18px', color: '#061626', overflowWrap: 'anywhere' }}>EduLink University Portal</strong>
            <span style={{ fontSize: '12px', color: '#64748b', overflowWrap: 'anywhere' }}>Academic Management & Student Services</span>
          </div>
        </div>

        {/* Lock Banner */}
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fef3c7',
          borderRadius: '16px',
          padding: 'clamp(14px, 4vw, 20px)',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
          marginBottom: '24px',
          boxSizing: 'border-box',
          maxWidth: '100%'
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 'clamp(16px, 4.5vw, 18px)', color: '#92400e', fontWeight: '800', overflowWrap: 'anywhere' }}>
              Registration Payment Required
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
              Your student account has been registered, but access to the academic dashboard, course modules, attendance tracking, and grades remains locked until your registration fee is paid.
            </p>
          </div>
        </div>

        {/* Student Information Summary */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: 'clamp(12px, 3.5vw, 16px) clamp(12px, 4vw, 18px)',
          marginBottom: '20px',
          boxSizing: 'border-box',
          maxWidth: '100%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
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
              gap: '4px',
              flexShrink: 0
            }}>
              <Clock size={12} /> Pending Payment
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Full Name</div>
              <strong style={{ color: '#1e293b' }}>{profile?.full_name || 'Registered Student'}</strong>
            </div>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Student ID</div>
              <strong style={{ color: '#1e293b' }}>{profile?.student_id || 'Pending'}</strong>
            </div>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Programme</div>
              <strong style={{ color: '#1e293b' }}>{profile?.programme || 'Computer Science'}</strong>
            </div>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
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
          padding: 'clamp(16px, 4vw, 22px) clamp(14px, 3.8vw, 20px)',
          boxShadow: '0 4px 20px rgba(10, 37, 64, 0.08)',
          marginBottom: '24px',
          boxSizing: 'border-box',
          maxWidth: '100%',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', minWidth: 0, overflowWrap: 'anywhere' }}>{regTypeLabel}</span>
            <span style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: '900', color: '#0a2540', flexShrink: 0, whiteSpace: 'nowrap' }}>{feeAmount}</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', overflowWrap: 'anywhere' }}>
            Official university curriculum assessment: SLE 0.40 per module paid securely through student mobile phone.
          </p>

          {!ussdStep ? (
            <div style={{ width: '100%', minWidth: 0 }}>
              {/* Payment Methods */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Select Mobile Money Provider:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {/* Orange Money */}
                <div
                  onClick={() => setProvider('orange')}
                  style={{
                    minWidth: 0,
                    boxSizing: 'border-box',
                    border: `2px solid ${provider === 'orange' ? '#ff6600' : '#e2e8f0'}`,
                    background: provider === 'orange' ? '#fffaf5' : '#ffffff',
                    borderRadius: '12px',
                    padding: 'clamp(10px, 3vw, 14px)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ height: '32px', display: 'flex', alignItems: 'center', background: '#000000', padding: '3px 7px', borderRadius: '6px', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <img src="/orange-money-logo.png" alt="Orange Money" style={{ height: '22px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: provider === 'orange' ? '#ff6600' : '#f1f5f9', color: provider === 'orange' ? '#fff' : '#64748b', padding: '2px 6px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                      🇸🇱 SL
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: 'clamp(13px, 3.6vw, 14px)', color: '#0f172a', overflowWrap: 'anywhere' }}>Orange Money</strong>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', overflowWrap: 'anywhere' }}>07X / +232 7X</span>
                </div>

                {/* Afrimoney */}
                <div
                  onClick={() => setProvider('afrimoney')}
                  style={{
                    minWidth: 0,
                    boxSizing: 'border-box',
                    border: `2px solid ${provider === 'afrimoney' ? '#7c3aed' : '#e2e8f0'}`,
                    background: provider === 'afrimoney' ? '#fbf8ff' : '#ffffff',
                    borderRadius: '12px',
                    padding: 'clamp(10px, 3vw, 14px)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ height: '32px', display: 'flex', alignItems: 'center', background: '#ffffff', padding: '3px 7px', borderRadius: '6px', border: '1px solid #ede9fe', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <img src="/afrimoney-logo.png" alt="Afrimoney" style={{ height: '18px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, background: provider === 'afrimoney' ? '#7c3aed' : '#f1f5f9', color: provider === 'afrimoney' ? '#fff' : '#64748b', padding: '2px 6px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                      🇸🇱 Africell
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: 'clamp(13px, 3.6vw, 14px)', color: '#0f172a', overflowWrap: 'anywhere' }}>Afrimoney</strong>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', overflowWrap: 'anywhere' }}>077 / 088 / 099 / 030</span>
                </div>
              </div>

              {/* Phone Input */}
              <div style={{ marginBottom: '16px', width: '100%', minWidth: 0 }}>
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
                    maxWidth: '100%',
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
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  fontSize: '15px',
                  fontWeight: 700,
                  padding: '13px 20px',
                  borderRadius: '12px',
                  background: provider === 'orange' ? '#ff6600' : '#7c3aed',
                  borderColor: provider === 'orange' ? '#ff6600' : '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
                disabled={busy || checking}
                onClick={handlePay}
              >
                {busy ? <RefreshCw size={17} className="v-spin" /> : null}
                {busy ? 'Initiating Transaction…' : 'Next'} <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', maxWidth: '100%', minWidth: 0 }}>
              {/* Brand Logo Header */}
              <div style={{
                height: '52px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 16px',
                borderRadius: '12px',
                background: provider === 'orange' ? '#000000' : '#ffffff',
                border: provider === 'orange' ? 'none' : '1.5px solid #ede9fe',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                margin: '0 auto 10px auto',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                <img
                  src={provider === 'orange' ? '/orange-money-logo.png' : '/afrimoney-logo.png'}
                  alt={provider === 'orange' ? 'Orange Money' : 'Afrimoney'}
                  style={{ height: '32px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>

              {/* Status Pill */}
              <div style={{ maxWidth: '100%' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: '99px',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.35
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                  <span>Transaction Initiated • USSD Payment Request Ready</span>
                </span>
              </div>

              <h2 style={{ fontSize: 'clamp(18px, 5vw, 20px)', fontWeight: 800, color: '#061626', margin: '0 0 16px 0', overflowWrap: 'anywhere' }}>
                Transaction Initiated
              </h2>

              {/* Detailed Breakdown Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: 'clamp(12px, 3.5vw, 16px) clamp(12px, 4vw, 18px)',
                marginBottom: '18px',
                textAlign: 'left',
                boxSizing: 'border-box',
                maxWidth: '100%',
                minWidth: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ minWidth: 0, flex: '1 1 130px' }}>
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Student Name</span>
                    <strong style={{ fontSize: '14px', color: '#0f172a', overflowWrap: 'anywhere' }}>{profile?.full_name || 'Enrolled Student'}</strong>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 0, flexShrink: 0 }}>
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Student ID</span>
                    <strong style={{ fontSize: '14px', color: '#0369a1', overflowWrap: 'anywhere' }}>{profile?.student_id || profile?.id}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px 12px', fontSize: '12px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>Programme:</span>
                    <strong style={{ color: '#334155' }}>{profile?.programme || 'Degree Programme'}</strong>
                  </div>
                  <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>Registration:</span>
                    <strong style={{ color: '#334155' }}>{regTypeLabel}</strong>
                  </div>
                  <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>Payment Provider:</span>
                    <strong style={{ color: provider === 'orange' ? '#ea580c' : '#7c3aed' }}>
                      {provider === 'orange' ? '🇸🇱 Orange Money' : '🇸🇱 Afrimoney'}
                    </strong>
                  </div>
                  <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <span style={{ color: '#64748b', display: 'block' }}>Approver Phone:</span>
                    <strong style={{ color: '#0f172a' }}>{paymentInfo?.phone || phone}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '2px solid #0f172a' }}>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Total Amount to Pay:</strong>
                  <strong style={{ fontSize: '18px', color: '#0284c7', overflowWrap: 'anywhere' }}>{feeAmount}</strong>
                </div>

                {paymentInfo?.reference && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', textAlign: 'right', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    Ref: <span style={{ fontFamily: 'monospace' }}>{paymentInfo.reference}</span>
                  </div>
                )}
              </div>

              {/* Monime Generated USSD Code Card (only if real Monime payment code returned) */}
              {ussdCode ? (
                <div style={{
                  background: '#f0f9ff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '14px',
                  padding: 'clamp(12px, 3.5vw, 16px)',
                  marginBottom: '18px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  maxWidth: '100%'
                }}>
                  <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
                    Monime Generated USSD Code:
                  </span>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: '#ffffff',
                    border: '1.5px solid #7dd3fc',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    marginBottom: '8px',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{
                      fontSize: 'clamp(17px, 5vw, 24px)',
                      fontWeight: 900,
                      color: '#0284c7',
                      fontFamily: 'monospace',
                      letterSpacing: '1px',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-all'
                    }}>
                      {ussdCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: copiedCode ? '#16a34a' : '#0369a1',
                        flexShrink: 0
                      }}
                    >
                      {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Primary Action Button: Pay Now sends USSD request directly to student's phone */}
              {ussdCode ? (
                <button
                  type="button"
                  onClick={handlePayNow}
                  className="primary-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: provider === 'orange' ? '#ff6600' : '#7c3aed',
                    borderColor: provider === 'orange' ? '#ff6600' : '#7c3aed',
                    color: '#ffffff',
                    fontSize: 'clamp(14px, 4vw, 15.5px)',
                    fontWeight: 800,
                    minHeight: '50px',
                    height: 'auto',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(0, 112, 243, 0.25)',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflowWrap: 'anywhere'
                  }}
                >
                  <PhoneCall size={20} style={{ flexShrink: 0 }} />
                  <span style={{ overflowWrap: 'anywhere' }}>Pay Now ({ussdCode})</span>
                </button>
              ) : null}

              {copiedCode && (
                <div style={{
                  color: '#059669',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  overflowWrap: 'anywhere'
                }}>
                  ✓ USSD request opened on phone! Enter your secret Mobile Money PIN on your handset to approve.
                </div>
              )}

              {/* Waiting Indicator */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#0a2540',
                fontSize: '12.5px',
                fontWeight: 700,
                marginBottom: '16px',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflowWrap: 'anywhere'
              }}>
                <RefreshCw size={15} className="v-spin" style={{ color: '#0284c7', flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>Listening for payment confirmation from your phone…</span>
              </div>


              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', width: '100%', margin: '0 auto' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onClick={() => checkStatus(true)}
                  disabled={checking}
                >
                  {checking ? <RefreshCw size={14} className="v-spin" /> : null}
                  {checking ? 'Checking Status…' : 'Check Payment Status'}
                </button>
                <button
                  type="button"
                  className="text-btn"
                  style={{ fontSize: '12px', color: '#64748b', overflowWrap: 'anywhere' }}
                  onClick={() => { setUssdStep(false); setBusy(false); }}
                  disabled={checking}
                >
                  ← Change phone number or provider
                </button>
              </div>
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
            alignItems: 'flex-start',
            gap: '8px',
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ minWidth: 0 }}>{error}</span>
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
            alignItems: 'flex-start',
            gap: '8px',
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ minWidth: 0 }}>{message}</span>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            type="button"
            className="outline-btn"
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', justifyContent: 'center', flexWrap: 'wrap', padding: '12px' }}
            disabled={checking || busy}
            onClick={() => checkStatus(true)}
          >
            <RefreshCw size={15} className={checking ? 'v-spin' : ''} style={{ flexShrink: 0 }} />
            <span>{checking ? 'Verifying status…' : 'I have completed payment — Refresh Status'}</span>
          </button>

          {/* Dev mode simulation button */}
          <button
            type="button"
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
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
              flexWrap: 'wrap',
              gap: '6px',
              cursor: 'pointer'
            }}
            disabled={checking || busy}
            onClick={confirmUssdPayment}
            title="Simulate payment confirmation for local testing"
          >
            <Sparkles size={14} color="#6366f1" style={{ flexShrink: 0 }} />
            <span>Dev Mode: Activate Account Immediately</span>
          </button>

          <button
            type="button"
            className="outline-btn"
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', justifyContent: 'center', padding: '12px', color: '#dc2626', borderColor: '#fecaca' }}
            onClick={onLogout}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}
