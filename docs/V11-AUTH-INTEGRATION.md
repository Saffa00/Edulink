# V11 — Complete Authentication Integration

V11 connects the authentication screens to the Supabase/Auth, device-security, registration-payment and recovery services.

## Flow

### Student
1. Student chooses Student.
2. Registers personal + academic details and module(s).
3. Supabase creates the authentication account.
4. Student profile is created as `pending_payment`.
5. Selected module codes are linked to the student's profile when a session is available.
6. Student continues to the server-side Monime checkout.
7. Monime webhook/status reconciliation verifies payment.
8. Server activates the student account only after verified payment.
9. Student logs in with Student ID + password.
10. First successful login registers the device; later logins require that device credential.

### Lecturer
1. Lecturer self-registers.
2. System generates a Lecturer ID.
3. Lecturer verifies email if email confirmation is enabled.
4. Lecturer logs in with Lecturer ID + password.
5. First successful login registers the device.
6. Dashboard opens only after device verification.

## Password recovery
Forgot Password uses Supabase's password recovery flow. Resetting the password does not automatically remove device binding.

## Important deployment settings
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`.
- Server must have Supabase service-role credentials and Monime credentials.
- Configure Supabase Auth email templates and redirect URLs for the deployed domain.
- Run all SQL migrations from V4, V8, V9 and V10 before using the production flows.
- Device replacement still requires a verified recovery-channel delivery implementation; V10 deliberately does not expose raw recovery tokens to the browser.

## V11 security behavior
- Student IDs and Lecturer IDs are resolved to their registered email before Supabase password authentication.
- Student accounts must be `active` before normal login.
- Unknown devices cannot enter the dashboard.
- The browser stores only an app-scoped device credential; the server stores its SHA-256 hash.
- IP address and user agent are audit signals, not permanent device identity.
