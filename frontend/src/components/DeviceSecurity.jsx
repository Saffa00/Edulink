import React, { useEffect, useState } from 'react';
import {
  getStoredDeviceName,
  listMyDevices,
  registerCurrentDevice,
  revokeDevice
} from '../services/device.js';

export default function DeviceSecurity({ role, profileId }) {
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const result = await listMyDevices();
      setDevices(result.devices || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function bindThisDevice() {
    setBusy(true);
    setMessage('');
    try {
      await registerCurrentDevice({ role, profileId, deviceName: getStoredDeviceName() });
      setMessage('This device is now registered.');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id) {
    setBusy(true);
    setMessage('');
    try {
      await revokeDevice(id);
      setMessage('Device revoked. You must complete device recovery before using another device.');
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="security-card">
      <div className="security-card__head">
        <div>
          <h3>Device Security</h3>
          <p>Only your registered device can perform protected account actions.</p>
        </div>
        <button onClick={bindThisDevice} disabled={busy}>Register this device</button>
      </div>

      {message && <div className="security-message">{message}</div>}

      {devices.length === 0 ? (
        <p>No registered device found.</p>
      ) : (
        <div className="security-devices">
          {devices.map(device => (
            <div key={device.id} className="security-device">
              <div>
                <strong>{device.device_label}</strong>
                <small>Last seen: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : '—'}</small>
              </div>
              {!device.revoked_at && (
                <button onClick={() => revoke(device.id)} disabled={busy}>Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
