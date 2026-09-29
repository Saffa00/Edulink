const KEY = 'academic_app_settings_v35'

const defaults = {
  pushEnabled: false,
  emailNotifications: true,
  messageNotifications: true,
  gradeNotifications: true,
  assignmentNotifications: true,
  compactMode: false,
  theme: 'system'
}

export function getSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(changes) {
  const next = { ...getSettings(), ...changes }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('academic-settings-changed', { detail: next }))
  return next
}

export function resetSettings() {
  localStorage.removeItem(KEY)
  return getSettings()
}
