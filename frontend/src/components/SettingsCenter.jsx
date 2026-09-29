import React, { useEffect, useState } from 'react'
import { getSettings, saveSettings, resetSettings } from '../services/settings'
import PushNotificationSettings from './PushNotificationSettings'
import ProfileSecurityCenter from './ProfileSecurityCenter'
import DeviceManagement from './DeviceManagement'
import LoginHistory from './LoginHistory'

export default function SettingsCenter({ role }) {
  const [settings,setSettings]=useState(getSettings())
  const update=(changes)=>setSettings(saveSettings(changes))

  useEffect(()=>{
    const handler=e=>setSettings(e.detail)
    window.addEventListener('academic-settings-changed',handler)
    return()=>window.removeEventListener('academic-settings-changed',handler)
  },[])

  useEffect(()=>{
    document.documentElement.dataset.theme=settings.theme
    document.documentElement.classList.toggle('compact-mode',settings.compactMode)
  },[settings.theme,settings.compactMode])

  return <main className="settings-center">
    <header>
      <h1>Settings</h1>
      <p>Manage your account, security, notifications and app preferences.</p>
    </header>

    <section>
      <h2>Account & Security</h2>
      <ProfileSecurityCenter role={role}/>
      <DeviceManagement role={role}/>
      <LoginHistory role={role}/>
    </section>

    <section>
      <h2>Notifications</h2>
      <label><input type="checkbox" checked={settings.messageNotifications} onChange={e=>update({messageNotifications:e.target.checked})}/> Message notifications</label>
      <label><input type="checkbox" checked={settings.gradeNotifications} onChange={e=>update({gradeNotifications:e.target.checked})}/> Grade notifications</label>
      <label><input type="checkbox" checked={settings.assignmentNotifications} onChange={e=>update({assignmentNotifications:e.target.checked})}/> Assignment notifications</label>
      <label><input type="checkbox" checked={settings.emailNotifications} onChange={e=>update({emailNotifications:e.target.checked})}/> Email notifications</label>
      <PushNotificationSettings/>
    </section>

    <section>
      <h2>Appearance</h2>
      <label>Theme
        <select value={settings.theme} onChange={e=>update({theme:e.target.value})}>
          <option value="system">System default</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label><input type="checkbox" checked={settings.compactMode} onChange={e=>update({compactMode:e.target.checked})}/> Compact mode</label>
    </section>

    <section>
      <h2>App Preferences</h2>
      <p>Notification preferences are stored for this signed-in browser.</p>
      <button type="button" onClick={()=>setSettings(resetSettings())}>Reset preferences</button>
    </section>
  </main>
}
