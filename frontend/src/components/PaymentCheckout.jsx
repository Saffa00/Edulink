import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, ArrowLeft, ArrowRight, Lock, Copy, Check, BookOpen, ExternalLink, PhoneCall, Phone } from 'lucide-react';
import { initiateMobileMoneyPayment, checkMobileMoneyPaymentStatus } from '../services/payment';

export default function PaymentCheckout({ applicant, onPaymentCompleted, onCancel }) {
  const [provider, setProvider] = useState('orange'); // 'orange' | 'afrimoney'
  const [phone, setPhone] = useState(applicant?.phone || '');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'transaction_initiated' | 'success'
  const [error, setError] = useState('');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [confirmedData, setConfirmedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const pollingRef = useRef(null);

  const isDissertation = applicant?.registrationType === 'dissertation';
  const modulesList = Array.isArray(applicant?.modules) ? applicant.modules : [];
  const modulesCount = applicant?.modulesCount || modulesList.length || (isDissertation ? 1 : 3);
  const amount = isDissertation ? 500 : modulesCount * 100;
  const formattedFee = `SLE ${amount}.00`;
  const ussdCode = paymentInfo?.ussdCode || (paymentInfo?.ussdNumericCode ? `*715*${paymentInfo.ussdNumericCode}#` : '*715*6609731529#');

  // Clean up polling interval when unmounting or changing step
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll backend for Monime transaction confirmation while transaction is initiated
  useEffect(() => {
    if ((step !== 'waiting_approval' && step !== 'transaction_initiated') || !paymentInfo?.paymentId) return;

    const paymentId = paymentInfo.paymentId;
    let pollCount = 0;

    pollingRef.current = setInterval(async () => {
      pollCount += 1;
      try {
        const res = await checkMobileMoneyPaymentStatus(paymentId);
        if (res?.paid || res?.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setConfirmedData({
            ...res,
            amount,
            modulesCount,
            studentId: res.studentId || applicant.studentId,
            fullName: res.fullName || applicant.fullName,
            email: res.email || applicant.email
          });
          setStep('success');
        } else if (res?.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(res.error || 'Payment authorization was cancelled or expired on phone.');
        }
      } catch (pollErr) {
        // Polling network warning silently caught to keep retrying
        console.warn('Poll status error:', pollErr.message);
      }

      // Automatically timeout after 4 minutes (96 polls of 2.5s)
      if (pollCount > 96) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setError('Payment approval timed out. Please check your phone connection and try again.');
      }
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, paymentInfo, amount, modulesCount, applicant]);

  // Step 1: Student enters phone and taps "Next"
  // EduLink initiates transaction with Monime and displays Transaction Initiated page with USSD code & Pay Now button
  const handleStartPayment = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Please enter a valid mobile money phone number (e.g. 076 123 456 or 077 123 456).');
      return;
    }

    setBusy(true);
    try {
      const res = await initiateMobileMoneyPayment({
        studentId: applicant.studentId,
        phone: cleanPhone,
        provider,
        modules: modulesList,
        modulesCount,
        registrationType: applicant.registrationType || 'normal'
      });

      setPaymentInfo(res);
      setStep('transaction_initiated');
    } catch (err) {
      console.error('Initiate payment error:', err);
      setError(err.message || 'Could not initiate payment. Please verify your phone number and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(ussdCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Real status check against Monime API
  const handleCheckStatusNow = async () => {
    if (!paymentInfo?.paymentId) return;
    setBusy(true);
    setError('');
    try {
      const res = await checkMobileMoneyPaymentStatus(paymentInfo.paymentId);
      if (res?.paid || res?.status === 'paid') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setConfirmedData({
          ...res,
          amount,
          modulesCount,
          studentId: res.studentId || applicant.studentId,
          fullName: res.fullName || applicant.fullName,
          email: res.email || applicant.email
        });
        setStep('success');
      } else {
        setError('Payment is still awaiting mobile confirmation. Please authorize with your PIN on your phone.');
      }
    } catch (err) {
      console.error('Status check error:', err);
      setError(err.message || 'Could not check payment status.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPassword = () => {
    if (confirmedData?.temporaryPassword) {
      navigator.clipboard?.writeText(confirmedData.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card wide" style={{ maxWidth: '580px', padding: '32px 28px' }}>
        
        {/* Navigation & Header */}
        {step !== 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              type="button"
              className="back-link"
              style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={(step === 'transaction_initiated' || step === 'waiting_approval') ? () => { setStep('select'); setError(''); } : onCancel}
              disabled={busy}
            >
              <ArrowLeft size={16} /> {(step === 'transaction_initiated' || step === 'waiting_approval') ? 'Back to select provider' : 'Back to details'}
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {step === 'select' ? 'Step 1 of 2: Select Provider' : 'Step 2 of 2: Transaction Initiated'}
            </span>
          </div>
        )}

        {/* ========================================================
            STEP 1: SELECT PROVIDER & ENTER PHONE
           ======================================================== */}
        {step === 'select' && (
          <>
            {/* Title & Technical Flow Label */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '4px 10px',
                borderRadius: '99px',
                background: '#e0f2fe',
                color: '#0369a1',
                marginBottom: '8px'
              }}>
                Monime Direct Mobile Money Checkout
              </div>
              <h1 style={{ fontSize: '24px', color: '#061626', margin: '0 0 6px 0', fontWeight: 800 }}>
                Pay with Mobile Money
              </h1>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                Select your provider. Monime Checkout will directly prompt your mobile phone for PIN payment authorization.
              </p>

              {/* Visual Step Breadcrumb */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '12px',
                fontSize: '11px',
                color: '#475569',
                fontWeight: 600,
                flexWrap: 'wrap'
              }}>
                <span>1. Select Modules</span>
                <span>→</span>
                <span>2. Provider & Phone</span>
                <span>→</span>
                <span>📱 3. Monime Phone Prompt</span>
                <span>→</span>
                <span>4. Enter PIN</span>
                <span>→</span>
                <span style={{ color: '#16a34a' }}>✓ Confirmed</span>
              </div>
            </div>

            {/* Confirm Module Payment Table */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '22px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '10px' }}>
                <div>
                  <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Applicant</small>
                  <div style={{ fontWeight: 700, color: '#061626', fontSize: '14px' }}>{applicant?.fullName || 'Student'}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    {applicant?.programme || 'BSc'} • Year {applicant?.level || '1'} • {applicant?.semester || 'First Semester'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Student ID</small>
                  <div style={{ fontWeight: 800, color: '#0a2540', fontSize: '14px' }}>{applicant?.studentId}</div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#0f172a', fontWeight: 800 }}>Confirm Module Payment</h4>

              <div style={{ width: '100%', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px', fontWeight: 700, borderBottom: '1.5px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span>Modules</span>
                  <span>Fee</span>
                </div>
                {((applicant?.modulesData && applicant.modulesData.length > 0)
                  ? applicant.modulesData
                  : isDissertation
                    ? [{ code: 'DISSERTATION', title: 'Honours Research Dissertation & Defense', fee: 500 }]
                    : modulesList.map(code => ({ code, title: '', fee: 100 }))
                ).map((m, idx) => (
                  <div key={m.code || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
                    <div>
                      <strong style={{ color: '#0284c7', marginRight: '6px' }}>{m.code}</strong>
                      <span style={{ color: '#334155' }}>{m.title || ''}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>SLE {m.fee || 100}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '2px solid #0f172a' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>Total</strong>
                  <strong style={{ fontSize: '18px', color: '#0284c7' }}>{formattedFee}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleStartPayment}>
              {/* Payment Method Cards */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                Choose Mobile Money Provider
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                {/* Orange Money Option */}
                <div
                  onClick={() => setProvider('orange')}
                  style={{
                    border: `2px solid ${provider === 'orange' ? '#ff6600' : '#e2e8f0'}`,
                    background: provider === 'orange' ? '#fffaf5' : '#ffffff',
                    borderRadius: '14px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#000000',
                      padding: '4px 10px',
                      borderRadius: '8px'
                    }}>
                      <img
                        src="/orange-money-logo.png"
                        alt="Orange Money"
                        style={{ height: '30px', width: 'auto', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: provider === 'orange' ? '#ff6600' : '#f1f5f9',
                      color: provider === 'orange' ? '#ffffff' : '#64748b'
                    }}>
                      🇸🇱 Orange
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginBottom: '2px' }}>
                    Orange Money
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    07X / 074 / 075 / 076 / 078 / 079
                  </span>
                </div>

                {/* Afrimoney Option */}
                <div
                  onClick={() => setProvider('afrimoney')}
                  style={{
                    border: `2px solid ${provider === 'afrimoney' ? '#7c3aed' : '#e2e8f0'}`,
                    background: provider === 'afrimoney' ? '#fbf8ff' : '#ffffff',
                    borderRadius: '14px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #ede9fe'
                    }}>
                      <img
                        src="/afrimoney-logo.png"
                        alt="Afrimoney"
                        style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: provider === 'afrimoney' ? '#7c3aed' : '#f1f5f9',
                      color: provider === 'afrimoney' ? '#ffffff' : '#64748b'
                    }}>
                      🇸🇱 Africell
                    </span>
                  </div>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginBottom: '2px' }}>
                    Afrimoney
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    077 / 088 / 099 / 030 / 033
                  </span>
                </div>
              </div>

              {/* Mobile Number Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  {provider === 'orange' ? 'Orange Money' : 'Afrimoney'} Approver Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={provider === 'orange' ? 'e.g. 076 123 456' : 'e.g. 077 123 456'}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '13px 14px 13px 40px',
                      borderRadius: '11px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                  <Smartphone size={17} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  This mobile-money number will approve the payment on their handset. You do <strong>not</strong> enter your PIN inside EduLink.
                </small>
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1 Submit: Next Button */}
              <button
                type="submit"
                disabled={busy}
                className="primary-btn full-btn"
                style={{
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: provider === 'orange' ? '#ff6600' : '#7c3aed',
                  borderColor: provider === 'orange' ? '#ff6600' : '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {busy ? <RefreshCw size={17} className="v-spin" /> : null}
                {busy ? 'Initiating Transaction…' : 'Next'} <ArrowRight size={17} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', color: '#64748b', fontSize: '11px' }}>
                <Lock size={12} />
                <span>Secured Backend Gateway • Student Never Enters PIN in EduLink</span>
              </div>
            </form>
          </>
        )}

        {/* ========================================================
            STEP 2: TRANSACTION INITIATED & PHONE USSD PROMPT
           ======================================================== */}
        {(step === 'transaction_initiated' || step === 'waiting_approval') && (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center'
          }}>
            {/* Brand Logo Header */}
            <div style={{
              height: '52px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 18px',
              borderRadius: '12px',
              background: provider === 'orange' ? '#000000' : '#ffffff',
              border: provider === 'orange' ? 'none' : '1.5px solid #ede9fe',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              margin: '0 auto 12px auto'
            }}>
              <img
                src={provider === 'orange' ? '/orange-money-logo.png' : '/afrimoney-logo.png'}
                alt={provider === 'orange' ? 'Orange Money' : 'Afrimoney'}
                style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>

            {/* Status Pill */}
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '99px',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Transaction Initiated • USSD Payment Request Ready
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#061626', margin: '0 0 6px 0' }}>
              Transaction Initiated
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 18px 0' }}>
              Edulink has initiated a USSD payment request on your phone for you to authorize the transaction.
            </p>

            {/* Detailed Breakdown Card of Everything Being Paid For */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 18px',
              marginBottom: '18px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Student Name</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{applicant?.fullName || 'Student Applicant'}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>Student ID</span>
                  <strong style={{ fontSize: '14px', color: '#0369a1' }}>{applicant?.studentId}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '12px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Programme:</span>
                  <strong style={{ color: '#334155' }}>{applicant?.programme || 'BSc'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Level / Year:</span>
                  <strong style={{ color: '#334155' }}>Year {applicant?.level || '1'} • {applicant?.semester || 'First Semester'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Payment Provider:</span>
                  <strong style={{ color: provider === 'orange' ? '#ea580c' : '#7c3aed' }}>
                    {provider === 'orange' ? '🇸🇱 Orange Money' : '🇸🇱 Afrimoney'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Approver Phone:</span>
                  <strong style={{ color: '#0f172a' }}>{paymentInfo?.phone || phone}</strong>
                </div>
              </div>

              {/* Module Breakdown */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  <span>Enrolled Module(s)</span>
                  <span>Fee</span>
                </div>
                {((applicant?.modulesData && applicant.modulesData.length > 0)
                  ? applicant.modulesData
                  : isDissertation
                    ? [{ code: 'DISSERTATION', title: 'Honours Research Dissertation & Defense', fee: 500 }]
                    : modulesList.map(code => ({ code, title: '', fee: 100 }))
                ).map((m, idx) => (
                  <div key={m.code || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '12px' }}>
                    <div>
                      <strong style={{ color: '#0284c7', marginRight: '6px' }}>{m.code}</strong>
                      <span style={{ color: '#475569' }}>{m.title || ''}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>SLE {(m.fee || 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '2px solid #0f172a' }}>
                <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Total Amount:</strong>
                <strong style={{ fontSize: '18px', color: '#0284c7' }}>{formattedFee}</strong>
              </div>

              {paymentInfo?.reference && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                  Ref: <span style={{ fontFamily: 'monospace' }}>{paymentInfo.reference}</span>
                </div>
              )}
            </div>

            {/* Monime USSD Code Card */}
            <div style={{
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '18px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>
                Monime Generated USSD Code:
              </span>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#ffffff',
                border: '1.5px solid #7dd3fc',
                borderRadius: '12px',
                padding: '8px 16px',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: '#0284c7',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
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
                    color: copiedCode ? '#16a34a' : '#0369a1'
                  }}
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '11.5px', color: '#475569', margin: 0 }}>
                Dial this code on your mobile phone to approve the transaction.
              </p>
            </div>

            {/* Pay Now Button */}
            <a
              href={`tel:${encodeURIComponent(ussdCode)}`}
              className="primary-btn full-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#0070f3',
                borderColor: '#0070f3',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 800,
                height: '48px',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)',
                marginBottom: '16px'
              }}
            >
              <PhoneCall size={18} />
              <span>Pay Now ({ussdCode})</span>
            </a>

            {/* Instructions */}
            <div style={{
              textAlign: 'left',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#166534',
              marginBottom: '16px',
              lineHeight: 1.5
            }}>
              <strong style={{ display: 'block', color: '#15803d', marginBottom: '4px' }}>
                📱 Authorize on your phone:
              </strong>
              <div>1. Tap <b>Pay Now</b> to trigger your mobile phone dial prompt.</div>
              <div>2. Confirm university fee of <b>{formattedFee}</b> for {modulesCount} enrolled modules.</div>
              <div>3. Enter your secret <b>Mobile Money PIN</b> on your handset to approve.</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#15803d' }}>
                * EduLink will instantly detect your authorization and activate your student account.
              </div>
            </div>

            {/* Animated Waiting Radar Indicator */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              color: '#0a2540',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              <RefreshCw size={15} className="v-spin" style={{ color: '#0284c7' }} />
              <span>Listening for payment confirmation from your phone…</span>
            </div>

            {paymentInfo?.checkoutUrl && (
              <div style={{ marginBottom: '14px' }}>
                <a
                  href={paymentInfo.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    color: '#64748b',
                    textDecoration: 'none'
                  }}
                >
                  <span>Open Monime Checkout Web Screen</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px', margin: '0 auto' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  padding: '11px 18px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={handleCheckStatusNow}
                disabled={busy}
              >
                {busy ? <RefreshCw size={15} className="v-spin" /> : null}
                {busy ? 'Checking Status…' : 'Check Payment Status'}
              </button>
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: '12px', color: '#64748b' }}
                onClick={() => { setStep('select'); setBusy(false); setError(''); }}
                disabled={busy}
              >
                ← Change phone number or provider
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 6: PAYMENT SUCCEEDS (PAID / ACTIVE)
           ======================================================== */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px auto',
              border: '2px solid #a7f3d0'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h1 style={{ fontSize: '24px', color: '#061626', margin: '0 0 6px 0', fontWeight: 800 }}>
              Payment Successful ✓
            </h1>
            <p style={{ color: '#15803d', fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0' }}>
              {formattedFee} paid • {modulesCount} {modulesCount === 1 ? 'module' : 'modules'} registered
            </p>

            {/* Transaction ID & Status Badge */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'left' }}>
                <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Transaction ID</small>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {confirmedData?.transactionId || confirmedData?.reference || paymentInfo?.reference || 'MOMO-CONFIRMED'}
                </div>
              </div>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '99px',
                textTransform: 'uppercase'
              }}>
                PAID / ACTIVE
              </span>
            </div>

            {/* Student Credential Card */}
            <div style={{
              background: '#061626',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'left',
              boxShadow: '0 10px 30px rgba(6, 22, 38, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '10px' }}>
                <div>
                  <small style={{ color: '#93b3d4', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.6px', fontWeight: 700 }}>Your Student ID</small>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>{confirmedData?.studentId || applicant.studentId}</div>
                </div>
                <span style={{
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '99px'
                }}>
                  Account Active
                </span>
              </div>

              {confirmedData?.temporaryPassword && (
                <div style={{ marginBottom: '12px' }}>
                  <small style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Your Temporary Portal Password:</small>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 14px'
                  }}>
                    <code style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '1px', color: '#38bdf8' }}>
                      {confirmedData.temporaryPassword}
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
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#93b3d4' }}>
                Credentials and official digital receipt dispatched to <strong>{confirmedData?.email || applicant.email}</strong>.
              </div>
            </div>

            {/* Registered Modules Confirmation Banner */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <BookOpen size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#166534', fontSize: '13px' }}>Module Curriculum Activated</strong>
                <p style={{ margin: '3px 0 0 0', color: '#15803d', fontSize: '12px', lineHeight: 1.45 }}>
                  Your {modulesCount} curriculum modules have been switched from PENDING PAYMENT to ACTIVE. You have full clearance to access class timetables, attendance, and coursework.
                </p>
              </div>
            </div>

            {/* View Registered Modules Button */}
            <button
              type="button"
              className="primary-btn full-btn"
              style={{
                height: '48px',
                fontSize: '15px',
                fontWeight: 700,
                background: '#0a2540',
                borderColor: '#0a2540',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={() => onPaymentCompleted?.(confirmedData)}
            >
              View Registered Modules <ArrowRight size={17} />
            </button>
          </div>
        )}

      </section>
    </main>
  );
}
