const { getMessageNotificationContext } = require('./message-notification-context')
const { sendNewMessagePush } = require('./message-push')
const { createClient } = require('@supabase/supabase-js')
const { authorizeConversation } = require('./message-authorization')

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function getAuthenticatedUser(req) {
  const auth = String(req.headers.authorization || '')
  if (!auth.startsWith('Bearer ')) return null

  const token = auth.slice(7)
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function sendSecureMessage({ req, conversationId, body }) {
  const user = await getAuthenticatedUser(req)
  if (!user) return { status: 401, error: 'Authentication required.' }

  const cleanBody = String(body || '').trim()
  if (!cleanBody) return { status: 400, error: 'Message cannot be empty.' }
  if (cleanBody.length > 5000) return { status: 400, error: 'Message is too long.' }

  const admin = getAdminClient()
  const { data: conversation, error: cError } = await admin
    .from('conversations')
    .select('id,module_id,student_id,lecturer_id,student_user_id,lecturer_user_id')
    .eq('id', conversationId)
    .single()

  if (cError || !conversation) return { status: 404, error: 'Conversation not found.' }

  const authorization = await authorizeConversation({
    admin,
    userId: user.id,
    conversation
  })

  if (!authorization.allowed) {
    return { status: 403, error: authorization.reason }
  }

  const isStudent = conversation.student_user_id === user.id
  const isLecturer = conversation.lecturer_user_id === user.id

  const recipientUserId = isStudent
    ? conversation.lecturer_user_id
    : conversation.student_user_id

  const { data: message, error: mError } = await admin
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_user_id: user.id,
      body: cleanBody
    })
    .select('id,conversation_id,sender_user_id,body,created_at,read_at')
    .single()

  if (mError) return { status: 400, error: mError.message }

  await admin.from('message_send_audit').insert({
    sender_user_id: user.id,
    conversation_id: conversation.id
  });

  const notificationContext = await getMessageNotificationContext(conversationId, user.id);

  try {
    await sendNewMessagePush({
      recipientUserId: notificationContext.recipientUserId,
      senderName: notificationContext.senderName,
      moduleLabel: notificationContext.moduleLabel,
      conversationId,
      messageId: message.id,
      body
    });
  } catch (pushError) {
    // Push delivery failure must not make an otherwise authorized message fail.
    console.warn('Message push notification failed:', pushError.message);
  }

  await admin
    .from('conversations')
    .update({ last_message_at: message.created_at })
    .eq('id', conversation.id)

  const sourceKey = `message:${message.id}`
  await admin
    .from('notifications')
    .upsert({
      recipient_user_id: recipientUserId,
      title: 'New message',
      body: 'You have a new message in your module conversation.',
      notification_type: 'message',
      source_key: sourceKey
    }, { onConflict: 'source_key' })

  return { status: 201, data: message }
}

module.exports = {
  sendSecureMessage,
  getAuthenticatedUser
}
