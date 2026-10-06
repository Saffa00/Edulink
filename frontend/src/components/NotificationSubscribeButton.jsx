import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, ShieldAlert } from 'lucide-react';
import { enableMessagePushNotifications } from '../services/pushSetup';
import { promptOneSignalPush } from '../services/oneSignalService';

export default function NotificationSubscribeButton({ compact = false }) {
  const [permission, setPermission] = useState('default');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    setSuccessMsg('');
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm === 'granted') {
          await Promise.all([
            enableMessagePushNotifications().catch(e => console.warn('VAPID setup notice:', e.message)),
            promptOneSignalPush().catch(e => console.warn('OneSignal setup notice:', e.message))
          ]);
          setSuccessMsg('Active! You will receive push notifications for grades, assignments, attendance & 5-min class reminders.');
          setTimeout(() => setSuccessMsg(''), 6000);
        } else if (perm === 'denied') {
          alert('Notification permission was blocked in browser settings. Please allow notifications for EduLink in your browser settings.');
        }
      } else {
        alert('Push notifications are not supported in this browser.');
      }
    } catch (err) {
      console.warn('Subscription error:', err);
    } finally {
      setBusy(false);
    }
  };

  const isSubscribed = permission === 'granted';

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy}
        className="icon-btn"
        title={isSubscribed ? "Push Notifications Active (Click to re-verify)" : "Subscribe to Live Academic Alerts"}
        style={{
          position: 'relative',
          color: isSubscribed ? '#16a34a' : '#64748b',
          background: isSubscribed ? '#f0fdf4' : 'transparent',
          border: isSubscribed ? '1px solid #bbf7d0' : 'none'
        }}
      >
        {isSubscribed ? <BellRing size={18} /> : <Bell size={18} />}
        {isSubscribed && (
          <span 
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#22c55e'
            }} 
          />
        )}
      </button>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '12.5px',
          fontWeight: '700',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          background: isSubscribed ? '#f0fdf4' : '#eff6ff',
          color: isSubscribed ? '#15803d' : '#1d4ed8',
          border: isSubscribed ? '1.5px solid #86efac' : '1.5px solid #bfdbfe',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {isSubscribed ? <Check size={14} strokeWidth={2.5} /> : <BellRing size={14} />}
        <span>{isSubscribed ? 'Notifications Active' : 'Subscribe to Alerts'}</span>
      </button>

      {successMsg && (
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
          {successMsg}
        </span>
      )}
    </div>
  );
}
