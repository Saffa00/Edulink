import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { updateRecoveredPassword } from '../services/recovery.js';

export default function ResetPasswordScreen({ onComplete, onCancel }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isMinLength = password.length >= 8;
  const isMatching = password && confirmPassword && password === confirmPassword;
  const canSubmit = isMinLength && isMatching && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    setBusy(true);
    try {
      await updateRecoveredPassword(password);
      setSuccess(true);
      setTimeout(() => {
        onComplete?.();
      }, 1600);
    } catch (err) {
      console.error('Password reset error:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired')) {
        setError('Your password reset link is invalid or has expired. Please request a new link from the login page.');
      } else {
        setError(msg || 'Unable to update password. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <button
          type="button"
          className="back-link"
          onClick={onCancel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#52657c',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to login</span>
        </button>

        <div className="auth-heading" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#eaf1f8',
              color: '#0a2540',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 14px'
            }}
          >
            <KeyRound size={26} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#061626', margin: '0 0 6px 0' }}>
            Set New Password
          </h1>
          <p style={{ color: '#52657c', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
            Create a secure new password for your Edulink account.
          </p>
        </div>

        {success ? (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '14px',
              padding: '24px 20px',
              textAlign: 'center',
              color: '#065f46',
              animation: 'fadeIn 0.3s ease-in'
            }}
          >
            <CheckCircle2 size={42} color="#059669" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px', color: '#065f46' }}>
              Password Reset Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: '#047857', margin: 0 }}>
              Your new password is now active. Redirecting you to login…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d7e1ec',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8b9bb4',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d7e1ec',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8b9bb4',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMinLength ? '#16a34a' : '#64748b' }}>
                <CheckCircle2 size={14} color={isMinLength ? '#16a34a' : '#94a3b8'} />
                <span>At least 8 characters long</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMatching ? '#16a34a' : '#64748b' }}>
                <CheckCircle2 size={14} color={isMatching ? '#16a34a' : '#94a3b8'} />
                <span>Passwords match</span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  lineHeight: 1.4
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-btn full-btn"
              disabled={!canSubmit}
              style={{
                marginTop: '4px',
                opacity: canSubmit ? 1 : 0.6,
                cursor: canSubmit ? 'pointer' : 'not-allowed'
              }}
            >
              {busy ? 'Saving New Password…' : 'Save New Password & Continue'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
