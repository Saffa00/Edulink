/**
 * OneSignal Push Notification Service for EduLink Backend
 * Dispatches targeted push notifications to mobile PWA and desktop browsers
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

/**
 * Base method to dispatch a notification via OneSignal REST API v1
 */
export async function sendOneSignalNotification(payload) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.info(`[OneSignal Mock Push] Would dispatch: "${payload.headings?.en || 'Notice'}" - "${payload.contents?.en || ''}"`);
    return { id: `mock-push-${Date.now()}`, mock: true, recipients: 1 };
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        ...payload
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[OneSignal Error Response]:', data);
      throw new Error(data.errors?.[0] || 'Failed to dispatch OneSignal push notification.');
    }

    return data;
  } catch (error) {
    console.error('[OneSignal Push Error]:', error.message);
    throw error;
  }
}

/**
 * Sends a push notification to an individual user by their ID (Student ID, Lecturer ID, or Auth User ID)
 */
export async function sendPushToUser({ userId, title, message, url, data }) {
  if (!userId) throw new Error('Target userId is required.');

  return sendOneSignalNotification({
    include_aliases: {
      external_id: [String(userId)]
    },
    target_channel: 'push',
    headings: { en: title || 'EduLink Alert' },
    contents: { en: message },
    url: url || undefined,
    data: data || {}
  });
}

/**
 * Sends a push notification to all users matching a role ('student' or 'lecturer')
 */
export async function sendPushToRole({ role, title, message, url, data }) {
  return sendOneSignalNotification({
    filters: [
      { field: 'tag', key: 'role', relation: '=', value: role }
    ],
    headings: { en: title || 'Academic Notice' },
    contents: { en: message },
    url: url || undefined,
    data: data || {}
  });
}

/**
 * Sends a push notification to all users belonging to a specific campus
 * ('goderich', 'congo_cross', 'brookfields')
 */
export async function sendPushToCampus({ campus, title, message, url, data }) {
  return sendOneSignalNotification({
    filters: [
      { field: 'tag', key: 'campus', relation: '=', value: campus }
    ],
    headings: { en: title || `${campus.toUpperCase()} Campus Update` },
    contents: { en: message },
    url: url || undefined,
    data: data || {}
  });
}

/**
 * Broadcasts a push notification to all registered app users
 */
export async function sendPushToAll({ title, message, url, data }) {
  return sendOneSignalNotification({
    included_segments: ['Total Subscriptions'],
    headings: { en: title || 'EduLink Campus Broadcast' },
    contents: { en: message },
    url: url || undefined,
    data: data || {}
  });
}
