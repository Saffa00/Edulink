import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { enableMessagePushNotifications, disableMessagePushNotifications } from '../services/pushSetup';
import { promptOneSignalPush } from '../services/oneSignalService';

export default function NotificationSubscribeButton({ compact = false, floating = true, position = 'bottom-right' }) {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const pref = localStorage.getItem('edulink_push_subscribed');
    if (pref === 'false') return false;
    return 'Notification' in window && Notification.permission === 'granted';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = Notification.permission;
      setPermission(perm);
      const pref = localStorage.getItem('edulink_push_subscribed');
      if (perm === 'granted' && pref !== 'false') {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    }
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSubscribe = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setBusy(true);
    setStatusMsg('');
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        let perm = Notification.permission;
        if (perm !== 'granted') {
          perm = await Notification.requestPermission();
          setPermission(perm);
        }
        if (perm === 'granted') {
          try {
            await Promise.all([
              enableMessagePushNotifications().catch(err => console.warn('VAPID setup notice:', err.message)),
              promptOneSignalPush().catch(err => console.warn('OneSignal setup notice:', err.message))
            ]);
          } catch (pErr) {
            console.warn('Push registration non-fatal notice:', pErr);
          }
          localStorage.setItem('edulink_push_subscribed', 'true');
          localStorage.setItem('edulink_sound_notifications', 'true');
          setIsSubscribed(true);
          setStatusMsg('Active! Push alerts enabled for grades, attendance & class reminders.');
          setTimeout(() => {
            setStatusMsg('');
            setIsOpen(false);
          }, 3500);
        } else if (perm === 'denied') {
          setStatusMsg('Notifications blocked in browser settings. Please allow notifications for EduLink.');
        }
      } else {
        setStatusMsg('Push notifications are not supported in this browser.');
      }
    } catch (err) {
      console.warn('Subscription error:', err);
      setStatusMsg('Could not subscribe: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setBusy(true);
    setStatusMsg('');
    try {
      await disableMessagePushNotifications().catch(err => console.warn('VAPID disable notice:', err.message));
      try {
        if (window.OneSignal?.User?.PushSubscription) {
          await window.OneSignal.User.PushSubscription.optOut();
        }
      } catch (osErr) {
        console.warn('OneSignal optOut notice:', osErr.message);
      }
      localStorage.setItem('edulink_push_subscribed', 'false');
      setIsSubscribed(false);
      setStatusMsg('Unsubscribed. Push notifications disabled on this device.');
      setTimeout(() => {
        setStatusMsg('');
        setIsOpen(false);
      }, 3500);
    } catch (err) {
      console.warn('Unsubscribe error:', err);
      setStatusMsg('Could not unsubscribe: ' + (err.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  // Compact header button mode (no green dot)
  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="icon-btn"
        title={isSubscribed ? "Push Notifications Active" : "Manage Notifications"}
        style={{
          position: 'relative',
          color: '#64748b',
          background: 'transparent',
          border: 'none'
        }}
      >
        {isSubscribed ? <BellRing size={18} /> : <Bell size={18} />}
      </button>
    );
  }

  // Floating button with "Manage Site Notifications" popup (NO GREEN DOT)
  return (
    <div className={`edulink-notif-floater pos-${position === 'bottom-left' ? 'left' : 'right'}`} ref={popoverRef}>
      {/* 1. Popover Card: "Manage Site Notifications" */}
      {isOpen && (
        <div className="edulink-notif-popover" role="dialog" aria-label="Manage Site Notifications">
          {/* Header */}
          <div className="edulink-notif-popover-head">
            <h3 className="edulink-notif-popover-title">Manage Site Notifications</h3>
            <button
              type="button"
              className="edulink-notif-popover-close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Description / Status Card */}
          {isSubscribed ? (
            <div style={{
              margin: '12px 16px',
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#166534',
              lineHeight: 1.55
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px', color: '#15803d' }}>
                <CheckCircle2 size={15} />
                <span>Subscribed on this Device</span>
              </div>
              <div>
                You will receive alerts for grade updates, new assignments, attendance GPS check-in, and reminders 5 minutes before class starts.
              </div>
            </div>
          ) : (
            <div className="edulink-notif-preview-box">
              <div className="edulink-notif-preview-thumb">
                <Bell size={24} color="#94a3b8" />
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45, flex: 1 }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Stay Notified</strong>
                Subscribe for real-time alerts on grades, marked attendance, assignments & reminders 5 mins before lectures.
              </div>
            </div>
          )}

          {/* Status Message if just subscribed or unsubscribed */}
          {statusMsg && (
            <div style={{
              padding: '0 16px 10px',
              fontSize: '12px',
              color: statusMsg.startsWith('Active') || statusMsg.startsWith('Subscribed') ? '#16a34a' : statusMsg.startsWith('Unsubscribed') ? '#b91c1c' : '#475569',
              fontWeight: 600,
              textAlign: 'center'
            }}>
              {statusMsg}
            </div>
          )}

          {/* Big Action Button: SUBSCRIBE or UNSUBSCRIBE */}
          {isSubscribed ? (
            <button
              type="button"
              className="edulink-notif-unsubscribe-btn"
              onClick={handleUnsubscribe}
              disabled={busy}
            >
              {busy ? 'UPDATING…' : 'UNSUBSCRIBE'}
            </button>
          ) : (
            <button
              type="button"
              className="edulink-notif-subscribe-btn"
              onClick={handleSubscribe}
              disabled={busy}
            >
              {busy ? 'SUBSCRIBING…' : 'SUBSCRIBE'}
            </button>
          )}

          {/* Speech Bubble Arrow pointing to the bell button */}
          <div className="edulink-notif-popover-arrow" />
        </div>
      )}

      {/* 2. Floating Circular Bell Button: Styled in Signature EduLink App Brand Navy (NO GREEN DOT) */}
      <button
        type="button"
        className="edulink-notif-bell-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        aria-label="Manage Site Notifications"
        title="Manage Site Notifications"
      >
        <div className="edulink-notif-bell-ring">
          <Bell className="edulink-notif-bell-svg" size={24} />
        </div>
      </button>
    </div>
  );
}
