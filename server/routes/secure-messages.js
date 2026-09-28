const express = require('express')
const { sendSecureMessage } = require('../services/secure-messaging')
const { messageRateLimit } = require('../middleware/messageRateLimit')

const router = express.Router()

router.post('/send', messageRateLimit, async (req, res) => {
  try {
    const result = await sendSecureMessage({
      req,
      conversationId: req.body?.conversationId,
      body: req.body?.body
    })
    return res.status(result.status).json(
      result.error ? { error: result.error } : { message: result.data }
    )
  } catch (error) {
    console.error('Secure message error:', error)
    return res.status(500).json({ error: 'Unable to send message.' })
  }
})

module.exports = router
