/**
 * OneSignal Web Push Integration Service for EduLink
 * Supports cross-platform mobile PWA (iOS 16.4+, Android) & Desktop notifications.
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'adf253a3-776e-487c-909f-0229cc10373f';

let isInitialized = false;

/**
 * Initializes OneSignal SDK asynchronously if App ID is configured.
 * Uses a dedicated serviceWorkerParam scope so OneSignalSDKWorker.js at site root
 * does not conflict with or unregister the existing PWA service worker (/sw.js).
 */
export async function initOneSignal() {
  if (typeof window === 'undefined') return;
  if (!ONESIGNAL_APP_ID) return;
  if (isInitialized) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    if (isInitialized) return;
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/onesignal/' },
        notifyButton: {
          enable: false // Friendly post-login prompt used instead of page-load prompt
        }
      });
      isInitialized = true;
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('SDK already initialized')) {
        isInitialized = true;
      } else if (!msg.includes('Can only be used on') && !msg.includes('domain')) {
        console.warn('OneSignal initialization warning:', msg);
      }
    }
  });
}

/**
 * Associates current session with Supabase auth user.id as external_id (`OneSignal.login(user.id)`)
 * and sets role/campus tags for granular targeting.
 */
export async function setOneSignalUser(profile, role, authUserId = null) {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (!isInitialized) {
        await initOneSignal();
      }
      if (!OneSignal) return;

      // Task 4.2: Use Supabase auth user.id as external_id
      const externalId =
        authUserId ||
        profile?.auth_user_id ||
        profile?.user_id ||
        profile?.id ||
        profile?.student_id ||
        profile?.lecturer_id;

      if (externalId && typeof OneSignal.login === 'function') {
        await OneSignal.login(String(externalId));
      }

      const tags = {
        role: role || profile?.role || 'student',
        full_name: profile?.full_name || '',
        campus: profile?.campus_id || profile?.campus || 'goderich'
      };

      if (profile?.student_id) tags.student_id = String(profile.student_id);
      if (profile?.lecturer_id) tags.lecturer_id = String(profile.lecturer_id);
      if (profile?.faculty_id) tags.faculty = String(profile.faculty_id);
      if (profile?.department_id) tags.department = String(profile.department_id);

      if (typeof OneSignal.User?.addTags === 'function') {
        await OneSignal.User.addTags(tags);
      }
    } catch (err) {
      console.warn('OneSignal user login/tagging notice:', err?.message || err);
    }
  });
}

/**
 * Clears OneSignal user session on logout (`OneSignal.logout()`)
 */
export async function clearOneSignalUser() {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (!OneSignal || typeof OneSignal.logout !== 'function') return;
      await OneSignal.logout();
    } catch (err) {
      console.warn('OneSignal logout notice:', err?.message || err);
    }
  });
}

/**
 * Prompts user for push notification permission
 */
export async function promptOneSignalPush() {
  if (typeof window === 'undefined') return { granted: false };

  if (!ONESIGNAL_APP_ID || !isInitialized) {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return { granted: perm === 'granted' };
      } catch {
        return { granted: false };
      }
    }
    return { granted: false, reason: 'unsupported' };
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        if (OneSignal?.Notifications?.requestPermission) {
          const granted = await OneSignal.Notifications.requestPermission();
          return resolve({ granted: Boolean(granted) });
        }
        if (OneSignal?.Slidedown?.promptPush) {
          await OneSignal.Slidedown.promptPush();
          const permission = await OneSignal.Notifications?.permission;
          return resolve({ granted: permission === true || permission === 'granted' });
        }
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          return resolve({ granted: perm === 'granted' });
        }
        resolve({ granted: false, reason: 'unsupported' });
      } catch (err) {
        if ('Notification' in window) {
          try {
            const perm = await Notification.requestPermission();
            return resolve({ granted: perm === 'granted' });
          } catch {
            // ignore
          }
        }
        resolve({ granted: false, error: err?.message || err });
      }
    });
  });
}

/**
 * Checks if browser supports push notifications
 */
export function isOneSignalSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Detects iPhone / iPad users who have not yet installed the PWA to their Home Screen.
 * iOS Web Push requires the web app to be added to the Home Screen first.
 */
export function isIosBrowserNotStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.navigator.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  return isIOS && !isStandalone;
}
