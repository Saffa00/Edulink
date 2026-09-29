import React, { useEffect, useMemo, useState } from 'react'
import { getLecturerConversationCenter } from '../services/conversationCenter'
import MessageUnreadBadge from './MessageUnreadBadge'
import { supabase } from '../services/supabase'

export default function LecturerConversationList({ onOpenConversation }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getLecturerConversationCenter()
      .then(data => active && setRows(data))
      .catch(e => active && setError(e.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('lecturer-conversation-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          getLecturerConversationCenter().then(setRows).catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
    rows.forEach(row => {
      const key = row.module_id
      if (!map.has(key)) {
        map.set(key, {
          module: row.modules,
          conversations: []
        })
      }
      map.get(key).conversations.push(row)
    })
    return [...map.values()]
  }, [rows])

  if (loading) return <p>Loading conversations…</p>
  if (error) return <p role="alert">{error}</p>
  if (!grouped.length) return <p>No module conversations yet.</p>

  return (
    <div>
      {grouped.map(group => (
        <section key={group.module?.id || 'module'}>
          <h3>{group.module?.code} — {group.module?.title}</h3>
          {group.conversations.map(conversation => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onOpenConversation?.(conversation)}
            >
              <>
                {conversation.students?.student_id} — {conversation.students?.full_name}
                <MessageUnreadBadge conversationId={conversation.id} />
              </>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}
