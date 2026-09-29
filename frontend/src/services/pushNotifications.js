import { supabase } from './supabase'

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported.')
  return navigator.serviceWorker.register('/sw.js')
}

export async function requestPushPermission() {
  if (!('Notification' in window)) throw new Error('Browser notifications are not supported.')
  return Notification.requestPermission()
}

export async function subscribeToPush(vapidPublicKey) {
  if (!vapidPublicKey) throw new Error('VITE_VAPID_PUBLIC_KEY is not configured.')

  const registration = await registerServiceWorker()
  const permission = await requestPushPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to enable notifications.')

  const json = subscription.toJSON()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' })

  if (error) throw error
  return subscription
}

export async function disablePushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  }
}
