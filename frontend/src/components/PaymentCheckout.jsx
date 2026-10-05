import React, { useState } from 'react';
import { Smartphone, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, ArrowLeft, ArrowRight, Lock, PhoneCall } from 'lucide-react';
import { verifyPaymentAndProvision } from '../services/payment';

export default function PaymentCheckout({ applicant, onPaymentCompleted, onCancel }) {
  const [provider, setProvider] = useState('orange'); // 'orange' | 'afrimoney'
  const [phone, setPhone] = useState(applicant?.phone || '');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('select'); // 'select' | 'prompt_sent' | 'verifying'
  const [error, setError] = useState('');
  const [ussdSeconds, setUssdSeconds] = useState(4);

  const isDissertation = applicant?.registrationType === 'dissertation';
  const modulesCount = applicant?.modulesCount || (Array.isArray(applicant?.modules) && applicant.modules.length) || (isDissertation ? 5 : 8);
  const amount = isDissertation ? 500 : modulesCount * 100;
  const formattedFee = `SLE ${amount}.00`;

  const handleStartPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.trim().length < 7) {
      setError('Please enter a valid mobile money phone number.');
      return;
    }

    setBusy(true);
    setStep('prompt_sent');

    // Simulate USSD countdown prompt for mobile money authorization
    let counter = 4;
    const interval = setInterval(() => {
      counter -= 1;
      setUssdSeconds(counter);
      if (counter <= 0) {
        clearInterval(interval);
        confirmTransaction();
      }
    }, 1000);
  };

  const confirmTransaction = async () => {
    setStep('verifying');
    try {
      const simSessionId = `chk_momo_${Date.now()}`;
      const res = await verifyPaymentAndProvision({
        sessionId: simSessionId,
        studentId: applicant.studentId
      });

      onPaymentCompleted?.(res);
    } catch (err) {
      console.error('Payment confirmation error:', err);
      setError(err.message || 'Payment confirmation failed. Please try again.');
      setStep('select');
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card wide" style={{ maxWidth: '580px', padding: '32px 28px' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            className="back-link"
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onCancel}
            disabled={busy}
          >
            <ArrowLeft size={16} /> Back to details
          </button>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Step 2 of 2: Registration Payment</span>
        </div>

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
            Mobile Money USSD Payment Authorization Flow
          </div>
          <h1 style={{ fontSize: '24px', color: '#061626', margin: '0 0 6px 0', fontWeight: 800 }}>
            Pay with Mobile Money
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Select your mobile wallet provider to receive an instant USSD authorization prompt on your phone.
          </p>

          {/* Visual USSD Step Flow */}
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
            <span>1. Select Provider</span>
            <span>→</span>
            <span>2. Enter Phone</span>
            <span>→</span>
            <span>📱 3. USSD Prompt</span>
            <span>→</span>
            <span>4. Enter PIN</span>
            <span>→</span>
            <span style={{ color: '#16a34a' }}>✓ Confirmed</span>
          </div>
        </div>

        {/* Student Fee Summary Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '22px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #edf2f7', paddingBottom: '10px' }}>
            <div>
              <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Applicant</small>
              <div style={{ fontWeight: 700, color: '#061626', fontSize: '14px' }}>{applicant?.fullName || 'Student'}</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                {applicant?.programme || 'BSc'} • Year {applicant?.level || '1'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Student ID</small>
              <div style={{ fontWeight: 800, color: '#0a2540', fontSize: '14px' }}>{applicant?.studentId}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                {modulesCount} Registered Curriculum Modules
              </span>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Assessed at SLE 100.00 per module • Student Phone Payment</div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0a2540' }}>
              {formattedFee}
            </div>
          </div>
        </div>

        {step === 'select' && (
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#ff6600',
                    color: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: '18px'
                  }}>
                    OM
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: provider === 'orange' ? '#ff6600' : '#f1f5f9',
                    color: provider === 'orange' ? '#ffffff' : '#64748b'
                  }}>
                    🇸🇱 Sierra Leone
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#7c3aed',
                    color: '#ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    fontSize: '18px'
                  }}>
                    AM
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
                {provider === 'orange' ? 'Orange Money' : 'Afrimoney'} Phone Number
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
                A secure USSD payment approval notification will be sent to this number.
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

            {/* Pay Button */}
            <button
              type="submit"
              disabled={busy}
              className="primary-btn full-btn"
              style={{
                height: '48px',
                fontSize: '15px',
                background: provider === 'orange' ? '#ff6600' : '#7c3aed',
                borderColor: provider === 'orange' ? '#ff6600' : '#7c3aed'
              }}
            >
              Pay {formattedFee} with {provider === 'orange' ? 'Orange Money' : 'Afrimoney'} <ArrowRight size={17} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', color: '#64748b', fontSize: '11px' }}>
              <Lock size={12} />
              <span>Secured by Monime Mobile Payments Gateway • SSL Encrypted</span>
            </div>
          </form>
        )}

        {/* Step: Prompt Sent & Awaiting PIN */}
        {(step === 'prompt_sent' || step === 'verifying') && (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '30px 20px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: provider === 'orange' ? '#fff4eb' : '#f5f0ff',
              color: provider === 'orange' ? '#ff6600' : '#7c3aed',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px auto'
            }}>
              <PhoneCall size={30} className="v-spin" />
            </div>

            <h3 style={{ fontSize: '19px', color: '#061626', margin: '0 0 8px 0', fontWeight: 800 }}>
              {step === 'verifying' ? 'Verifying Payment…' : `USSD Prompt Sent to ${phone}`}
            </h3>

            <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 20px auto' }}>
              Please check your phone screen right now and enter your <strong>{provider === 'orange' ? 'Orange Money' : 'Afrimoney'} PIN</strong> to authorize <strong>{formattedFee}</strong>.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              color: '#0a2540',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '20px'
            }}>
              <RefreshCw size={16} className="v-spin" />
              <span>
                {step === 'verifying' ? 'Provisioning account credentials…' : `Awaiting mobile approval (${ussdSeconds}s)…`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px', margin: '0 auto' }}>
              <button
                type="button"
                className="primary-btn"
                style={{
                  background: '#0a2540',
                  fontSize: '13px',
                  padding: '10px 16px'
                }}
                onClick={confirmTransaction}
                disabled={step === 'verifying'}
              >
                I have entered my PIN
              </button>
              <button
                type="button"
                className="text-btn"
                style={{ fontSize: '12px', color: '#64748b' }}
                onClick={() => { setStep('select'); setBusy(false); }}
                disabled={step === 'verifying'}
              >
                Change phone number or method
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
