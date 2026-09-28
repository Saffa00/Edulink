const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function configure() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required.')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

async function sendPushToUser(userId, payload) {
  configure()
  const supabase = adminClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) throw error

  const results = []
  const messageId = payload?.data?.messageId || null
  for (const row of subscriptions || []) {
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth }
      }, JSON.stringify(payload))

      await supabase.from('push_delivery_audit').insert({
        message_id: messageId,
        recipient_user_id: userId,
        subscription_id: row.id,
        status: 'sent'
      })
      results.push({ id: row.id, ok: true })
    } catch (err) {
      const status = err.statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      }
      await supabase.from('push_delivery_audit').insert({
        message_id: messageId,
        recipient_user_id: userId,
        subscription_id: row.id,
        status: (status === 404 || status === 410) ? 'stale' : 'failed',
        provider_status: status,
        error_message: err.message
      })
      results.push({ id: row.id, ok: false, status })
    }
  }

  return results
}

module.exports = { sendPushToUser }
