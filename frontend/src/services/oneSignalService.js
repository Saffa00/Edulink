/**
 * OneSignal Web Push Integration Service for EduLink
 * Supports cross-platform mobile PWA (iOS 16.4+, Android) & Desktop notifications.
 */

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'adf253a3-776e-487c-909f-0229cc10373f';

let isInitialized = false;

/**
 * Initializes OneSignal SDK asynchronously if App ID is configured
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
        notifyButton: {
          enable: false // In-app custom UI triggers used instead of floating button
        }
      });
      isInitialized = true;
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('Can only be used on') || msg.includes('domain')) {
        console.info('[OneSignal] Push notifications active on configured domain (https://edulink-gilt-gamma.vercel.app). Local/dev environment gracefully bypassed.');
      } else if (msg.includes('SDK already initialized')) {
        isInitialized = true;
      } else {
        console.warn('OneSignal initialization warning:', msg);
      }
    }
  });
}

/**
 * Associates current session with user ID and tags for granular targeting
 * (e.g. role, campus, department, student_id, lecturer_id)
 */
export async function setOneSignalUser(profile, role) {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (!isInitialized || !OneSignal?.User) return;

      const externalId = profile?.student_id || profile?.lecturer_id || profile?.auth_user_id || profile?.id;
      if (externalId && typeof OneSignal.login === 'function') {
        await OneSignal.login(String(externalId));
      }

      const tags = {
        role: role || profile?.role || 'student',
        full_name: profile?.full_name || '',
        campus: profile?.campus || 'goderich'
      };

      if (profile?.student_id) tags.student_id = String(profile.student_id);
      if (profile?.lecturer_id) tags.lecturer_id = String(profile.lecturer_id);
      if (profile?.faculty_id) tags.faculty = String(profile.faculty_id);
      if (profile?.department_id) tags.department = String(profile.department_id);

      if (typeof OneSignal.User?.addTags === 'function') {
        await OneSignal.User.addTags(tags);
      }
    } catch (err) {
      console.warn('OneSignal user tagging notice:', err?.message || err);
    }
  });
}

/**
 * Clears user session on logout
 */
export async function clearOneSignalUser() {
  if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (!isInitialized || !OneSignal?.User || typeof OneSignal.logout !== 'function') return;
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

  // Fallback to native browser permission if OneSignal App ID is not provided or not initialized
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
        if (!isInitialized || !OneSignal?.Slidedown) {
          if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            return resolve({ granted: perm === 'granted' });
          }
          return resolve({ granted: false, reason: 'unsupported' });
        }
        await OneSignal.Slidedown.promptPush();
        const permission = await OneSignal.Notifications?.permission;
        resolve({ granted: permission === true || permission === 'granted' });
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
