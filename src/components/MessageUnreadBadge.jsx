import React, { useEffect, useState } from 'react'
import { getConversationUnreadCount } from '../services/messageReadState'
import { supabase } from '../services/supabase'

export default function MessageUnreadBadge({ conversationId }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const value = await getConversationUnreadCount(conversationId)
        if (active) setCount(value)
      } catch {}
    }

    load()

    const channel = supabase
      .channel(`unread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        load
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  if (!count) return null

  return <span aria-label={`${count} unread messages`}>{count > 99 ? '99+' : count}</span>
}
