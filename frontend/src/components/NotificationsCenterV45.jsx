import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell, CheckCheck, RefreshCw, Award, ClipboardList,
  CalendarCheck, MessageSquare, DollarSign, BookOpen,
  Volume2, VolumeX, Sparkles, ShieldCheck, ChevronRight,
  Trash2
} from 'lucide-react';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead
} from '../services/academicMasterV41toV55.js';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  triggerTestLiveNotification,
  playNotificationChime,
  subscribeToLiveToasts
} from '../services/liveNotificationService.js';
import { enableMessagePushNotifications } from '../services/pushSetup.js';
import { promptOneSignalPush } from '../services/oneSignalService.js';
import { supabase } from '../services/supabase.js';

export default function NotificationsCenterV45({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('default');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('edulink_sound_notifications') !== 'false';
  });
  const [actionFeedback, setActionFeedback] = useState('');

  // Check initial browser notification permission
  useEffect(() => {
    getBrowserNotificationPermission().then(perm => setPermission(perm));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getNotifications(selectedCategory);
      setNotifications(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to live notifications arriving while on this page
  useEffect(() => {
    const unsubscribe = subscribeToLiveToasts((newNotif) => {
      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    });

    return () => unsubscribe();
  }, []);

  const handleMarkOne = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    setActionFeedback('All notifications marked as read.');
    setTimeout(() => setActionFeedback(''), 3000);
  };

  const handleDeleteOne = async (id, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch { }
  };

  const handleClearAllRead = async () => {
    const readIds = notifications.filter(n => !!n.read_at).map(n => n.id);
    setNotifications(prev => prev.filter(n => !n.read_at));
    if (readIds.length) {
      try {
        await supabase.from('notifications').delete().in('id', readIds);
      } catch { }
    }
    setActionFeedback('Read notifications cleared.');
    setTimeout(() => setActionFeedback(''), 3000);
  };

  const handleEnablePermissions = async () => {
    try {
      const perm = await requestBrowserNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        setActionFeedback('Live device notifications granted successfully! 🔔');
        // Register OneSignal Push & Service Worker Web Push
        try {
          await promptOneSignalPush();
          await enableMessagePushNotifications();
        } catch { }
      } else if (perm === 'denied') {
        setActionFeedback('Notifications are blocked in browser settings. Please allow notifications in your address bar.');
      }
    } catch (err) {
      setActionFeedback(err.message || 'Permission request failed.');
    }
    setTimeout(() => setActionFeedback(''), 5000);
  };

  const handleTestNotification = () => {
    triggerTestLiveNotification({
      title: '🎓 Grade Published: CSOR 224',
      body: 'Dr. John Doe finalized semester marks for Operations Research. Score: 85 (Grade A).',
      category: 'grade',
      targetTab: 'grades'
    });
    setActionFeedback('Real live notification sent with sound chime! 🔔');
    setTimeout(() => setActionFeedback(''), 4000);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('edulink_sound_notifications', next ? 'true' : 'false');
    if (next) {
      playNotificationChime();
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.read_at) {
      handleMarkOne(n.id);
    }
    if (onNavigate) {
      if (n.category === 'message') onNavigate('messages');
      else if (n.category === 'grade') onNavigate('grades');
      else if (n.category === 'assignment') onNavigate('assignments');
      else if (n.category === 'attendance') onNavigate('attendance');
      else if (n.category === 'dissertation') onNavigate('dissertation');
      else if (n.category === 'payment') onNavigate('payments');
    }
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'grade', label: 'Grades' },
    { id: 'assignment', label: 'Assignments' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'message', label: 'Messages' },
    { id: 'payment', label: 'Payments' },
    { id: 'dissertation', label: 'Dissertations' }
  ];

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="v-master-wrap">
      <header className="v-master-header">
        <div>
          <h1>Notifications Center</h1>
          <p>Real-time academic alerts, published grades, attendance tracking, and messages.</p>
        </div>
        <div className="v-header-actions">
          <button className="v-btn secondary" onClick={handleMarkAll} title="Mark all as read">
            <CheckCheck size={16} /> Mark All as Read
          </button>
          {notifications.some(n => !!n.read_at) && (
            <button className="v-btn outline" onClick={handleClearAllRead} title="Clear read notifications">
              <Trash2 size={16} /> Clear Read
            </button>
          )}
        </div>
      </header>

      {/* Real Live Notification Status & Control Bar */}
      <section className="v-live-bar" aria-label="Live notifications controls">
        <div className="v-live-info">
          <div
            className={`v-live-pulse-dot ${
              permission === 'granted' ? '' : (permission === 'denied' ? 'danger' : 'warning')
            }`}
            title={`Status: ${permission}`}
          />
          <div className="v-live-text">
            <strong>
              {permission === 'granted'
                ? 'Real Live Notifications: Active & Sound Enabled'
                : (permission === 'denied'
                    ? 'Browser Notifications Blocked'
                    : 'Real Live Notifications Ready')}
            </strong>
            <span>
              {permission === 'granted'
                ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'} • In-app banner & OS chime enabled`
                : 'Click enable to receive instant live popups and audio chimes on your device.'}
            </span>
          </div>
        </div>

        <div className="v-live-actions">
          {permission !== 'granted' && (
            <button
              type="button"
              className="v-live-btn primary"
              onClick={handleEnablePermissions}
            >
              <ShieldCheck size={15} /> Enable Device Notifications
            </button>
          )}

          <button
            type="button"
            className="v-live-btn secondary"
            onClick={handleTestNotification}
            title="Fire a test live alert with chime"
          >
            <Sparkles size={15} /> Send Test Live Alert
          </button>

          <button
            type="button"
            className="v-live-btn sound"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime On' : 'Muted'}</span>
          </button>
        </div>
      </section>

      {actionFeedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#e0f2fe',
            color: '#0369a1',
            fontSize: '0.85rem',
            fontWeight: 600,
            border: '1px solid #bae6fd'
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Categories Switcher */}
      <div className="v-chip-row">
        {categories.map(c => (
          <button
            key={c.id}
            className={`v-chip ${selectedCategory === c.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="v-notif-list">
        {loading ? (
          <div className="v-card text-center" style={{ padding: '40px' }}>
            <RefreshCw className="v-spin" size={24} style={{ margin: '0 auto' }} />
          </div>
        ) : !notifications.length ? (
          <div className="v-card v-no-data" style={{ padding: '40px' }}>
            <Bell size={32} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
            <p>No notifications in this category.</p>
          </div>
        ) : (
          notifications.map(n => {
            const isRead = !!n.read_at;
            return (
              <article
                key={n.id}
                className={`v-card v-notif-card ${isRead ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(n)}
                style={{ cursor: 'pointer' }}
              >
                <div className="v-notif-icon">
                  {n.category === 'grade' ? <Award size={18} color="#7c3aed" /> :
                   n.category === 'assignment' ? <ClipboardList size={18} color="#d97706" /> :
                   n.category === 'attendance' ? <CalendarCheck size={18} color="#0891b2" /> :
                   n.category === 'message' ? <MessageSquare size={18} color="#2563eb" /> :
                   n.category === 'payment' ? <DollarSign size={18} color="#059669" /> :
                   n.category === 'dissertation' ? <BookOpen size={18} color="#4f46e5" /> :
                   <Bell size={18} color="#0a2540" />}
                </div>
                <div className="v-notif-content">
                  <div className="v-notif-header">
                    <strong>{n.title}</strong>
                    <small>{new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</small>
                  </div>
                  <p>{n.body}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isRead && <span className="v-unread-dot" />}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteOne(n.id, e)}
                    title="Dismiss"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--v-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      opacity: 0.6
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--v-text-muted)'; }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
