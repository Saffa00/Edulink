import React, { useEffect, useState } from 'react'
import { getMyUnreadMessageCount } from '../services/messageReadState'
import { supabase } from '../services/supabase'

export default function MessageNotificationBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const value = await getMyUnreadMessageCount()
        if (active) setCount(value)
      } catch {}
    }

    load()
    const timer = setInterval(load, 15000)

    const channel = supabase
      .channel('global-message-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        load
      )
      .subscribe()

    return () => {
      active = false
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  if (!count) return null
  return <span aria-label={`${count} unread messages`}>{count > 99 ? '99+' : count}</span>
}
