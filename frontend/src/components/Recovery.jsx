import React, { useState } from 'react';
import { requestPasswordRecovery, updateRecoveredPassword, requestDeviceRecovery } from '../services/recovery.js';
import { Eye, EyeOff } from 'lucide-react';

export function ForgotPassword({ initialEmail = '', role = 'student' }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid registered email address.');
      }
      const res = await requestPasswordRecovery(cleanEmail, role);
      setSent(true);
      setMessage(`Recovery instructions have been sent to your registered email (${res.maskedEmail || cleanEmail}).`);
    } catch (err) {
      setMessage(err.message || 'If an account uses that email, recovery instructions have been sent.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="security-card">
      <h2>Forgot Password</h2>
      <p>Enter your registered email address to receive password reset instructions.</p>
      <form onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Enter registered email address (e.g. you@example.com)"
        />
        <button disabled={busy}>{busy ? 'Sending…' : 'Send recovery email'}</button>
      </form>
      {message && <div className="security-message">{message}</div>}
    </section>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setMessage('Passwords do not match.');
    try {
      await updateRecoveredPassword(password);
      setDone(true);
      setMessage('Password changed successfully. Your existing registered device remains bound.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="security-card">
      <h2>Set New Password</h2>
      <p>Password reset changes the password; it does not automatically remove device binding.</p>
      <form onSubmit={submit}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="New password"
            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div style={{ position: 'relative', width: '100%', marginTop: '8px' }}>
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={8}
            placeholder="Confirm password"
            style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(p => !p)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button disabled={done} style={{ marginTop: '12px' }}>{done ? 'Password changed' : 'Change password'}</button>
      </form>
      {message && <div className="security-message">{message}</div>}
    </section>
  );
}

export function DeviceRecovery({ role }) {
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setMessage('');
    try {
      const result = await requestDeviceRecovery(role);
      setRequested(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="security-card">
      <h2>Lost or Replaced Device</h2>
      <p>Device recovery requires a verified recovery channel. Password reset alone does not replace the registered device.</p>
      <button onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start device recovery'}</button>
      {requested && <div className="security-message">{message}</div>}
    </section>
  );
}
