const express = require('express')
const { createConversation, getStudentConversations, getLecturerConversations } = require('../services/conversation-service')

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const result = await createConversation({
      req,
      moduleId: req.body?.moduleId
    })
    return res.status(result.status).json(
      result.error ? { error: result.error } : { conversation: result.data }
    )
  } catch (error) {
    console.error('Conversation creation error:', error)
    return res.status(500).json({ error: 'Unable to create conversation.' })
  }
})

router.get('/student', async (req, res) => {
  try {
    const result = await getStudentConversations({ req })
    return res.status(result.status).json(
      result.error ? { error: result.error } : { conversations: result.data }
    )
  } catch (error) {
    console.error('Conversation list error:', error)
    return res.status(500).json({ error: 'Unable to load conversations.' })
  }
})

module.exports = router


router.get('/lecturer', async (req, res) => {
  try {
    const result = await getLecturerConversations({ req })
    return res.status(result.status).json(
      result.error ? { error: result.error } : { conversations: result.data }
    )
  } catch (error) {
    console.error('Lecturer conversation list error:', error)
    return res.status(500).json({ error: 'Unable to load lecturer conversations.' })
  }
})

module.exports = router
