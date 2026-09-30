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
  if (!ONESIGNAL_APP_ID) {
    // Graceful fallback for local development or prior to setting up OneSignal
    return;
  }
  if (isInitialized) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
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
      console.warn('OneSignal initialization warning:', err.message);
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
      const externalId = profile?.student_id || profile?.lecturer_id || profile?.auth_user_id || profile?.id;
      if (externalId) {
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

      await OneSignal.User.addTags(tags);
    } catch (err) {
      console.warn('OneSignal user tagging notice:', err.message);
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
      await OneSignal.logout();
    } catch (err) {
      console.warn('OneSignal logout notice:', err.message);
    }
  });
}

/**
 * Prompts user for push notification permission
 */
export async function promptOneSignalPush() {
  if (typeof window === 'undefined') return { granted: false };

  // Fallback to native browser permission if OneSignal App ID is not yet provided
  if (!ONESIGNAL_APP_ID) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return { granted: perm === 'granted' };
    }
    return { granted: false, reason: 'unsupported' };
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.Slidedown.promptPush();
        const permission = await OneSignal.Notifications.permission;
        resolve({ granted: permission === true || permission === 'granted' });
      } catch (err) {
        resolve({ granted: false, error: err.message });
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
