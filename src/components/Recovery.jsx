import React, { useState } from 'react';
import { requestPasswordRecovery, updateRecoveredPassword, requestDeviceRecovery } from '../services/recovery.js';

export function ForgotPassword({ initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await requestPasswordRecovery(email.trim());
      setSent(true);
      setMessage('If an account uses that email address, recovery instructions have been sent.');
    } catch {
      // Keep the same outward response style to reduce account enumeration.
      setSent(true);
      setMessage('If an account uses that email address, recovery instructions have been sent.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="security-card">
      <h2>Forgot Password</h2>
      <p>Enter your registered email address.</p>
      <form onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <button disabled={busy}>{busy ? 'Sending…' : 'Send recovery email'}</button>
      </form>
      {sent && <div className="security-message">{message}</div>}
    </section>
  );
}

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="New password" />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} placeholder="Confirm password" />
        <button disabled={done}>{done ? 'Password changed' : 'Change password'}</button>
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
