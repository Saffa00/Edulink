import React, { useEffect, useState } from 'react'
import { getStudentConversationCenter } from '../services/conversationCenter'
import { supabase } from '../services/supabase'
import MessageUnreadBadge from './MessageUnreadBadge'

export default function StudentConversationList({ onOpenConversation }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setRows(await getStudentConversationCenter())
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('student-conversation-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return <p>Loading conversations…</p>
  if (error) return <p role="alert">{error}</p>
  if (!rows.length) return <p>No conversations yet.</p>

  return (
    <div>
      {rows.map(row => (
        <button key={row.id} type="button" onClick={() => onOpenConversation?.(row)}>
          <strong>{row.modules?.code}</strong> — {row.modules?.title}
          <span> {row.lecturers?.full_name}</span>
          <MessageUnreadBadge conversationId={row.id} />
        </button>
      ))}
    </div>
  )
}
