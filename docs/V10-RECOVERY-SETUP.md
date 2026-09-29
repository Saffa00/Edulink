# V10 — Secure Password Recovery + Device Replacement

V10 separates two security operations:

1. **Forgot Password** — resets the password through Supabase Auth.
2. **Lost/Replaced Device** — separately replaces the registered device after a
   verified recovery process.

Supabase's current password recovery flow uses `resetPasswordForEmail()` and then
`updateUser({ password })` after the recovery link redirects back to the app.
Supabase also documents OTP/token-hash verification for email authentication.

## Important security behavior

### Forgot Password
- User enters registered email.
- The UI gives a generic response rather than revealing whether the email exists.
- Supabase sends the password recovery email.
- User follows the recovery link.
- User sets a new password.
- Device binding is NOT automatically removed.

### Device replacement
- Existing device remains valid until recovery succeeds.
- Recovery requests are short-lived (15 minutes in this implementation).
- Only a hash of the recovery token is stored.
- A successful recovery revokes existing active devices.
- The replacement device is registered.
- Recovery success is audited.
- The raw recovery token must be delivered only through a verified recovery channel.

## Production email delivery

The V10 server intentionally does NOT return a raw device-recovery token to the
browser. For production, connect the recovery request to a transactional email
provider or a verified Supabase Auth email flow.

Do not expose the raw token in an API response.

## Supabase password reset

Configure the Supabase Auth redirect URL:

`https://YOUR-DOMAIN/reset-password`

For local development:

`http://localhost:5173/reset-password`

The exact URL must be included in the Supabase Auth redirect allow list.

## SQL

Run:

`supabase/v10_recovery.sql`

## Routes

- `POST /api/recovery/device/request`
- `POST /api/recovery/device/request-by-id`
- `POST /api/recovery/device/verify`

## Account takeover protection

The system must NOT support:

Student ID + password → automatically replace device.

Instead:

Student/Lecturer ID
→ verified recovery channel
→ short-lived recovery token
→ replacement device
→ revoke old device
→ audit event

This protects against a person who obtained both an account identifier and password.

## Supabase references

Password reset:
https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

OTP/token-hash verification:
https://supabase.com/docs/reference/javascript/auth-verifyotp
