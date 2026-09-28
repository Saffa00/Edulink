import React, { useState } from 'react'
import { createConversationFromModule } from '../services/conversationCenter'

export default function ModuleConversationButton({ moduleId, onConversation }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setError('')
    setLoading(true)
    try {
      const conversation = await createConversationFromModule(moduleId)
      onConversation?.(conversation)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={loading}>
        {loading ? 'Opening…' : 'Message Lecturer'}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  )
}
