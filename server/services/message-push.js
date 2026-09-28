const { sendPushToUser } = require('./push-service')

async function sendNewMessagePush({
  recipientUserId,
  senderName,
  moduleLabel,
  conversationId,
  messageId,
  body
}) {
  if (!recipientUserId) return []

  const preview = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 120)

  return sendPushToUser(recipientUserId, {
    title: `New message${moduleLabel ? ` · ${moduleLabel}` : ''}`,
    body: `${senderName || 'You have a new message'}: ${preview || 'Open the conversation to view the message.'}`,
    tag: `message-${conversationId}`,
    data: {
      url: `/messages?conversation=${encodeURIComponent(conversationId)}`,
      type: 'message',
      conversationId,
      messageId
    }
  })
}

module.exports = { sendNewMessagePush }
