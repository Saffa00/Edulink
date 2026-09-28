import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';

export async function requestPasswordRecovery(email) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return { sent: true };
}

export async function updateRecoveredPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return { updated: true };
}

export async function requestDeviceRecovery(role) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before requesting device recovery.');

  try {
    const response = await fetch(apiUrl('/api/recovery/device/request'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ role })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not start device recovery.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function verifyDeviceRecovery({ role, token, newDeviceCredential, deviceName }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before verifying device recovery.');

  try {
    const response = await fetch(apiUrl('/api/recovery/device/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ role, token, newDeviceCredential, deviceName })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Device recovery verification failed.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery server unreachable. Please check connection and try again.');
    }
    throw err;
  }
}

export async function requestRecoveryById({ role, id, email }) {
  try {
    const response = await fetch(apiUrl('/api/recovery/device/request-by-id'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, id, email })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'If the account details are valid, recovery instructions will be sent.');
    return body;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message?.includes('Failed to fetch')) {
      throw new Error('Recovery service temporarily unreachable. Please try again in a moment.');
    }
    throw err;
  }
}
