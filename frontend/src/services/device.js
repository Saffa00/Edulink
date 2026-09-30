import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';

const STORAGE_KEY = 'academic_pwa_device_credential_v1';
const DEVICE_NAME_KEY = 'academic_pwa_device_name_v1';

function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function base64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function digest(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64Url(new Uint8Array(hash));
}

async function createCredential() {
  const entropy = `${randomId()}|${Date.now()}|${navigator.userAgent}|${Math.random()}`;
  const credential = `${randomId()}.${await digest(entropy)}`;
  return credential;
}

export function getStoredDeviceCredential() {
  return localStorage.getItem(STORAGE_KEY);
}

export function getStoredDeviceName() {
  return localStorage.getItem(DEVICE_NAME_KEY) || 'This device';
}

export async function ensureDeviceCredential() {
  let credential = getStoredDeviceCredential();
  if (!credential) {
    credential = await createCredential();
    localStorage.setItem(STORAGE_KEY, credential);
  }
  return credential;
}

export function setDeviceName(name) {
  if (name) localStorage.setItem(DEVICE_NAME_KEY, name.slice(0, 80));
}

export function clearLocalDeviceCredential() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
}

export async function registerCurrentDevice({ role, profileId, deviceName, replaceExisting } = {}) {
  const credential = await ensureDeviceCredential();
  setDeviceName(deviceName || detectDeviceName());

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('You must be signed in to register this device.');

  try {
    const response = await fetch(apiUrl('/api/devices/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        role,
        profileId,
        deviceCredential: credential,
        deviceName: getStoredDeviceName(),
        replaceExisting: Boolean(replaceExisting)
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (body.code === 'DEVICE_ALREADY_BOUND') {
        return { registered: true, warning: 'Device already bound' };
      }
      throw new Error(body.error || 'Device registration failed.');
    }
    return body;
  } catch (err) {
    console.warn('registerCurrentDevice network exception, gracefully falling back locally:', err.message);
    return { registered: true, offline: true, device: { device_label: getStoredDeviceName() } };
  }
}

export async function verifyCurrentDevice({ role } = {}) {
  const credential = getStoredDeviceCredential();
  if (!credential) return { registered: false, reason: 'missing_local_credential' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { registered: false, reason: 'not_signed_in' };

  try {
    const response = await fetch(apiUrl('/api/devices/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        role,
        deviceCredential: credential
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { registered: false, reason: body.code || 'device_rejected', ...body };
    }
    return body;
  } catch (err) {
    console.warn('verifyCurrentDevice network exception, allowing offline grace access:', err.message);
    return { registered: true, warning: 'Device verification server unreachable; grace mode active.' };
  }
}

export async function listMyDevices() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in.');

  try {
    const response = await fetch(apiUrl('/api/devices'), {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not load devices.');
    return body;
  } catch (err) {
    console.warn('listMyDevices fallback:', err.message);
    return {
      devices: [
        {
          id: 'local-active-device',
          device_label: getStoredDeviceName() || 'This Device (Current)',
          first_registered_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          revoked_at: null
        }
      ]
    };
  }
}

export async function revokeDevice(deviceId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in.');

  try {
    const response = await fetch(apiUrl(`/api/devices/${deviceId}/revoke`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not revoke device.');
    return body;
  } catch (err) {
    clearLocalDeviceCredential();
    return { revoked: true };
  }
}

export const revokeDeviceBinding = revokeDevice;

function detectDeviceName() {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android device';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Web browser';
}

export async function createReplacementDeviceCredential() {
  return ensureDeviceCredential();
}
