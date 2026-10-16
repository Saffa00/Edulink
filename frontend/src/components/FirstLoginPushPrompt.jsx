import React, { useEffect, useState } from 'react';
import { promptOneSignalPush, isIosBrowserNotStandalone } from '../services/oneSignalService';

const FIRST_LOGIN_PROMPT_KEY = 'edulink_push_prompt_dismissed_v1';

/**
 * Task 4.2:
 * Friendly permission prompt shown AFTER first login ("Get alerts for grades, assignments and classes?"),
 * never on unauthenticated page load.
 * Also displays an "Install EduLink to get notifications" hint for iPhone users when not installed to Home Screen.
 */
export default function FirstLoginPushPrompt({ userId }) {
  const [visible, setVisible] = useState(false);
  const [isIosHint, setIsIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    const storageKey = `${FIRST_LOGIN_PROMPT_KEY}_${userId}`;
    const alreadyHandled = localStorage.getItem(storageKey);
    if (alreadyHandled === '1') return;

    if (isIosBrowserNotStandalone()) {
      setIsIosHint(true);
      setVisible(true);
      return;
    }

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setIsIosHint(false);
        setVisible(true);
      } else {
        localStorage.setItem(storageKey, '1');
      }
    }
  }, [userId]);

  if (!visible) return null;

  const dismiss = () => {
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem(`${FIRST_LOGIN_PROMPT_KEY}_${userId}`, '1');
    }
    setVisible(false);
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      await promptOneSignalPush();
    } finally {
      setBusy(false);
      dismiss();
    }
  };

  return (
    <div
      role="region"
      aria-label="Notification permission prompt"
      style={{
        margin: '0 0 14px 0',
        padding: '14px 16px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        color: '#ffffff',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
          {isIosHint
            ? '📲 Install EduLink to get notifications'
            : '🔔 Get alerts for grades, assignments and classes?'}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#dbeafe', lineHeight: 1.4 }}>
          {isIosHint
            ? 'On iPhone, tap the Share button in Safari and select "Add to Home Screen" to receive instant alerts for grades, assignments, and class reminders.'
            : 'Enable instant web push alerts so you never miss a posted grade, new assignment, or 30-minute class reminder.'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {!isIosHint && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            style={{
              background: '#38bdf8',
              color: '#0f172a',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: busy ? 'wait' : 'pointer'
            }}
          >
            {busy ? 'Enabling...' : 'Enable Alerts'}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          style={{
            background: 'rgba(255,255,255,0.14)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.24)',
            borderRadius: '10px',
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {isIosHint ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
