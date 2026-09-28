import React, { useState } from 'react'
import { enableMessagePushNotifications, disableMessagePushNotifications } from '../services/pushSetup'

export default function PushNotificationSettings() {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function enable() {
    setBusy(true)
    try {
      await enableMessagePushNotifications()
      setStatus('Push notifications are enabled on this device.')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      await disableMessagePushNotifications()
      setStatus('Push notifications are disabled on this device.')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Push notifications">
      <h3>Message Notifications</h3>
      <p>Receive Student ↔ Lecturer message alerts even when the PWA is closed.</p>
      <button type="button" disabled={busy} onClick={enable}>
        Enable Notifications
      </button>
      <button type="button" disabled={busy} onClick={disable}>
        Disable on This Device
      </button>
      {status && <p role="status">{status}</p>}
    </section>
  )
}
