import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function SetPermanentPasswordModal({ profile, onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: password,
        data: {
          requires_password_change: false,
          temporary_password: false
        }
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        onComplete?.(data?.user);
      }, 1200);
    } catch (err) {
      console.error('Failed to update permanent password:', err);
      setError(err.message || 'Unable to update password. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(6, 22, 38, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '460px',
        width: '100%',
        padding: '36px 30px',
        boxShadow: '0 20px 50px rgba(6, 22, 38, 0.35)',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#eaf1f8',
            color: '#0a2540',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px auto'
          }}>
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#061626', margin: '0 0 8px 0' }}>
            Set Your Permanent Password
          </h2>
          <p style={{ color: '#52657c', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
            Welcome, <strong>{profile?.full_name || 'Student'}</strong>! You are logging in with a temporary password. Please choose a strong personal password to secure your account.
          </p>
        </div>

        {success ? (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
            color: '#065f46'
          }}>
            <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px auto' }} />
            <strong style={{ display: 'block', fontSize: '15px' }}>Password Successfully Updated!</strong>
            <span style={{ fontSize: '12px', color: '#047857' }}>Launching your student portal…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px 12px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px 12px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <ShieldCheck size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="primary-btn full-btn"
              style={{
                height: '46px',
                fontSize: '14px',
                fontWeight: 700,
                marginTop: '6px',
                background: '#0a2540',
                borderColor: '#0a2540'
              }}
            >
              {busy ? 'Securing Account…' : 'Save Permanent Password & Enter'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
