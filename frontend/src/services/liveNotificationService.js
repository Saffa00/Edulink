import { supabase } from './supabase.js';
import { apiUrl } from './apiConfig.js';

// ============================================================================
// 1. Web Audio Chime Synthesizer
// Pure browser synthesis - zero external audio files, zero CORS issues
// ============================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playNotificationChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dual-tone harmonic bell chime (880Hz A5 followed by 1318.5Hz E6)
    // Note 1: 880Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Note 2: 1318.5Hz (starts 0.08s later for an authentic modern chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.32, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.75);
  } catch (err) {
    console.warn('Audio chime playback warning:', err);
  }
}

// ============================================================================
// 2. Native OS / Browser Notifications
// ============================================================================
export async function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', or 'default'
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('Notifications are not supported by this browser.');
  }

  // Pre-initialize audio context on user gesture
  getAudioContext();

  const permission = await Notification.requestPermission();
  return permission;
}

export async function showNativeNotification({ title, body, icon = '/edulink-logo.jpg', data = {}, tag = 'edulink-alert' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      // If service worker registration is active, use showNotification
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          return reg.showNotification(title, {
            body,
            icon,
            badge: '/edulink-logo.jpg',
            tag,
            renotify: true,
            vibrate: [100, 50, 100],
            data
          });
        }
      }

      // Fallback to standard window Notification
      const notif = new Notification(title, {
        body,
        icon,
        tag,
        data
      });

      notif.onclick = () => {
        window.focus();
        if (data?.url && window.location) {
          // custom routing
        }
        notif.close();
      };
    } catch (err) {
      console.warn('Native notification display warning:', err);
    }
  }
}

// ============================================================================
// 3. In-App Live Toast Event Bus
// ============================================================================
const toastSubscribers = new Set();

export function subscribeToLiveToasts(callback) {
  toastSubscribers.add(callback);
  return () => toastSubscribers.delete(callback);
}

export function emitLiveToast(notification) {
  toastSubscribers.forEach(cb => {
    try {
      cb(notification);
    } catch (err) {
      console.error('Toast subscriber error:', err);
    }
  });
}

// ============================================================================
// 4. Realtime Supabase Channel Listener
// ============================================================================
let activeChannel = null;

export function initLiveNotificationListener(userId, onNotificationReceived, onCountsChanged) {
  if (!userId) return () => {};

  // Clean up existing channel if any
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch { }
  }

  const channelName = `live-notifications-${userId}-${Date.now()}`;
  activeChannel = supabase.channel(channelName);

  // 1. Listen for new rows in `notifications` table for this user
  activeChannel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_user_id=eq.${userId}`
    },
    (payload) => {
      const newNotif = payload.new;
      handleIncomingLiveAlert({
        id: newNotif.id || `notif-${Date.now()}`,
        title: newNotif.title || 'Academic Notification',
        body: newNotif.body || 'You have a new academic update.',
        category: newNotif.category || 'academic',
        link_url: newNotif.link_url || '/notifications',
        created_at: newNotif.created_at || new Date().toISOString()
      }, onNotificationReceived, onCountsChanged);
    }
  );

  // 2. Broadcast signaling for instantaneous in-app delivery
  activeChannel.on(
    'broadcast',
    { event: 'academic-notification' },
    ({ payload }) => {
      if (payload && (!payload.targetUserId || payload.targetUserId === userId)) {
        handleIncomingLiveAlert(payload, onNotificationReceived, onCountsChanged);
      }
    }
  );

  activeChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('⚡ Connected to EduLink Realtime Live Notifications channel');
    }
  });

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}

function handleIncomingLiveAlert(item, onNotificationReceived, onCountsChanged) {
  // Play sound chime
  const soundEnabled = localStorage.getItem('edulink_sound_notifications') !== 'false';
  if (soundEnabled) {
    playNotificationChime();
  }

  // Show Native OS notification if granted
  showNativeNotification({
    title: item.title,
    body: item.body,
    icon: '/edulink-logo.jpg',
    data: { url: item.link_url || '/notifications', category: item.category }
  });

  // Emit In-App Toast
  emitLiveToast(item);

  // Fire callback for parent components (e.g. Notifications Center list)
  if (onNotificationReceived) {
    onNotificationReceived(item);
  }

  // Notify counts changed
  if (onCountsChanged) {
    onCountsChanged();
  }
}

// ============================================================================
// 5. Test Live Notification Helper
// ============================================================================
export function triggerTestLiveNotification({
  title = '🎓 Grade Published: CSOR 224',
  body = 'Dr. John Doe has finalized and published Operations Research semester results. Score: 85 (Grade A).',
  category = 'grade',
  targetTab = 'grades'
} = {}) {
  const testItem = {
    id: `test-${Date.now()}`,
    title,
    body,
    category,
    link_url: targetTab,
    created_at: new Date().toISOString(),
    isTest: true
  };

  // Play synthesized chime
  playNotificationChime();

  // Show native OS notification
  showNativeNotification({
    title: testItem.title,
    body: testItem.body,
    icon: '/edulink-logo.jpg',
    data: { url: testItem.link_url, category: testItem.category }
  });

  // Emit in-app banner toast
  emitLiveToast(testItem);

  return testItem;
}

// ============================================================================
// 6. Real Unread Counts Queries
// ============================================================================
export async function fetchLiveUnreadCounts(userId) {
  if (!userId) return { notifications: 0, messages: 0 };

  try {
    // 1. Unread notifications
    const { count: notifCount, error: notifErr } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .is('read_at', null);

    // 2. Unread messages
    const { count: msgCount, error: msgErr } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_user_id', userId)
      .is('read_at', null);

    return {
      notifications: notifErr ? 0 : (notifCount || 0),
      messages: msgErr ? 0 : (msgCount || 0)
    };
  } catch (err) {
    console.warn('Failed to fetch unread counts:', err);
    return { notifications: 0, messages: 0 };
  }
}

// ============================================================================
// 7. Authoritative Academic Notification Dispatcher
// Triggers live notifications for assignment creation, submissions, grading, and attendance
// ============================================================================
export async function sendAcademicNotification({
  recipientUserId,
  title,
  body,
  category = 'general',
  linkUrl = 'notifications'
} = {}) {
  const item = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipient_user_id: recipientUserId,
    title,
    body,
    category,
    notification_type: category,
    link_url: linkUrl,
    created_at: new Date().toISOString()
  };

  // 1. Insert into Supabase notifications table
  try {
    if (recipientUserId) {
      await supabase.from('notifications').insert({
        recipient_user_id: recipientUserId,
        title,
        body,
        category,
        notification_type: category,
        link_url: linkUrl
      });
    }
  } catch (err) {
    console.warn('DB notification insert notice:', err?.message);
  }

  // 2. Broadcast via Supabase Realtime Channel
  try {
    const channel = activeChannel || supabase.channel('academic-live-notifications-global');
    channel.send({
      type: 'broadcast',
      event: 'academic-notification',
      payload: { ...item, targetUserId: recipientUserId }
    });
  } catch (bcErr) {
    console.warn('Broadcast notification notice:', bcErr?.message);
  }

  // 3. Dispatch real Web Push / Mobile Push notification to user's device
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (recipientUserId && token) {
      fetch(apiUrl('/api/push/send-user'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: recipientUserId,
          payload: {
            title,
            body,
            icon: '/edulink-logo.jpg',
            data: { url: linkUrl || '/notifications', category }
          }
        })
      }).catch(() => {});
    }
  } catch (pushErr) {}

  // 4. Play chime & show in-app live toast
  try {
    playNotificationChime();
    emitLiveToast(item);
  } catch (toastErr) {}

  return item;
}

