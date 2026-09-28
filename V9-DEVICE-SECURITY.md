# V9 — Device Binding & Login Security

V9 introduces a PWA-compatible device credential instead of relying on IMEI.

## Why not IMEI?
A normal browser/PWA should not be designed around a permanent IMEI. The V9 approach
creates an app-scoped random device credential on the first registered browser/device,
stores only its SHA-256 hash on the server, and checks that credential for protected
operations.

This is a security control, not an absolute proof of physical device identity.

## Flow

### First device
1. Student or lecturer signs in normally.
2. If no registered device exists, the app creates a random device credential.
3. The server stores only the hash.
4. The account is bound to that device.
5. IP address, user agent, first registration time and last-seen time are recorded.

### Existing device
Every protected backend request can include:
- Supabase access token
- role
- device credential

The server validates the access token and then checks the device hash.

### Unknown device
The server returns:

`UNKNOWN_DEVICE`

The user should then go through the future account-recovery/device-replacement flow.
Do not silently replace the old device because that would let stolen credentials
take over an account.

## Important limitation

A PWA cannot guarantee hardware-level identity. A determined attacker with control of
the browser storage may be able to copy or lose the app-scoped credential.

For stronger hardware-backed protection later, consider a native/Capacitor wrapper
and WebAuthn/passkeys.

## IP address

IP is stored for security auditing and anomaly detection. It is NOT treated as the
permanent identity of the device because mobile networks, VPNs and shared networks can
change IP addresses.

## One-device policy

V9 uses one active device per Student/Lecturer account. A second device receives:

`DEVICE_ALREADY_BOUND`

The account owner must use an explicit recovery process before replacing the device.

## Recovery — next security stage

Do not implement “reset device” by accepting only Student ID + password.
A future recovery flow should require a second verified factor, such as a verified
email/OTP or another administrator-approved recovery method, and should log the
replacement event.

## Supabase Auth

The backend validates the Supabase access token using `auth.getUser(token)` before
authorizing protected operations. Supabase documents `getUser()` as a server-verifiable
way to obtain the authenticated user from an access token.

## SQL

Run:

`supabase/v9_device_security.sql`

## Routes

- `POST /api/devices/register`
- `POST /api/devices/verify`
- `GET /api/devices?role=student|lecturer`
- `POST /api/devices/:deviceId/revoke`
- `GET /api/login-history?role=student|lecturer`

## Security note

Never store the raw device credential in Supabase.
Never place the Supabase service-role/secret key in the frontend.
