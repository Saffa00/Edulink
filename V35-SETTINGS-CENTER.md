# V35 — Complete Settings Center

V35 consolidates the account and application preferences into one mobile-first Settings Center.

## Sections
- Account & Security
- Profile
- Password change
- Registered devices
- Login history
- Push notifications
- Message/grade/assignment notification preferences
- Theme: System / Light / Dark
- Compact mode
- Reset preferences

## Component
Use:

`<SettingsCenter role="student" />`

or:

`<SettingsCenter role="lecturer" />`

The settings UI is intentionally reusable and can be placed in the existing Profile/Settings tab.

## Storage
UI preferences are currently stored in browser localStorage so the app works immediately as a PWA.

`supabase/v35_settings.sql` provides an optional secure database table for future cross-device preference synchronization.

## Security
Account profile, password, devices and login history continue to use the security mechanisms from earlier versions.
