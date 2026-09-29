# V34 — Profile & Security Center

V34 adds a reusable security center for both Students and Lecturers.

## Included
- View own Student/Lecturer profile.
- Edit allowed personal fields: full name, phone, photo URL.
- Password change through Supabase Auth.
- Registered-device listing and revocation UI.
- Login-history UI.
- Secure logout.
- Profile RLS hardening.
- Push notification settings from V33 remain compatible.

## Identity fields
Student ID / Lecturer ID and email are displayed but are not editable from the profile form.

## Production notes
- Device registration/replacement should continue through the trusted V9/V10 server flow.
- For profile photos, use private/public Supabase Storage according to the application's privacy requirements rather than arbitrary URLs.
- Add MFA if the deployment requires stronger account protection.
