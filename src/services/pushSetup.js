import { subscribeToPush, disablePushSubscription } from './pushNotifications'

export async function enableMessagePushNotifications() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!key) throw new Error('VITE_VAPID_PUBLIC_KEY is not configured.')
  return subscribeToPush(key)
}

export async function disableMessagePushNotifications() {
  return disablePushSubscription()
}
