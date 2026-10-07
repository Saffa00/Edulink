import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, X, ShieldCheck } from 'lucide-react';
import { enableMessagePushNotifications } from '../services/pushSetup';
import { promptOneSignalPush } from '../services/oneSignalService';

export default function NotificationSubscribeButton({ compact = false, floating = true, position = 'bottom-right' }) {
  const [permission, setPermission] = useState('default');
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
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
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm === 'granted') {
          try {
            await Promise.all([
              enableMessagePushNotifications().catch(err => console.warn('VAPID setup notice:', err.message)),
              promptOneSignalPush().catch(err => console.warn('OneSignal setup notice:', err.message))
            ]);
          } catch (pErr) {
            console.warn('Push registration non-fatal notice:', pErr);
          }
          setStatusMsg('Active! Push alerts enabled for grades, attendance & timetable.');
          setTimeout(() => {
            setStatusMsg('');
            setIsOpen(false);
          }, 3500);
        } else if (perm === 'denied') {
          alert('Notifications were blocked in your browser settings. Please allow notifications for EduLink.');
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

  // Compact header button mode
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="icon-btn"
        title={isSubscribed ? "Push Notifications Active" : "Manage Notifications"}
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

  // Floating button with "Manage Site Notifications" popup
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

          {/* Sample Notification Preview Box */}
          <div className="edulink-notif-preview-box">
            <div className="edulink-notif-preview-thumb">
              <Bell size={24} color="#94a3b8" />
            </div>
            <div className="edulink-notif-preview-lines">
              <div className="edulink-notif-preview-line l1" />
              <div className="edulink-notif-preview-line l2" />
              <div className="edulink-notif-preview-line l3" />
              <div className="edulink-notif-preview-line l4" />
            </div>
          </div>

          {/* Status Message if just subscribed */}
          {statusMsg && (
            <div style={{ padding: '0 16px 10px', fontSize: '12px', color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>
              ✓ {statusMsg}
            </div>
          )}

          {/* Big Action Button (Brand Navy SUBSCRIBE / Green ACTIVE) */}
          <button
            type="button"
            className={`edulink-notif-subscribe-btn ${isSubscribed ? 'active' : ''}`}
            onClick={handleSubscribe}
            disabled={busy}
          >
            {busy
              ? 'CONFIGURING…'
              : isSubscribed
              ? 'SUBSCRIBED ✓'
              : 'SUBSCRIBE'}
          </button>

          {/* Speech Bubble Arrow pointing to the bell button */}
          <div className="edulink-notif-popover-arrow" />
        </div>
      )}

      {/* 2. Floating Circular Bell Button */}
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
        {isSubscribed && (
          <span className="edulink-notif-subscribed-dot" title="Active" />
        )}
      </button>
    </div>
  );
}
