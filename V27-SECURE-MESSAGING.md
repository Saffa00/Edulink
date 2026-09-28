# V27 — Secure Server-Side Messaging

V27 moves message creation and message-notification creation behind the trusted server.

## New flow

Student/Lecturer
→ Supabase access token
→ `POST /api/messages/send`
→ server verifies authenticated user
→ server verifies conversation membership
→ server inserts message with service role
→ server updates conversation timestamp
→ server creates exactly one notification using `source_key = message:<message-id>`
→ Supabase Realtime broadcasts the new message.

## Environment variables

The server needs:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.

## Frontend

Use:
`src/services/secureMessages.js`

The frontend sends only the conversation ID and message body. The server determines the sender from the Supabase access token.

## Database

Run:
`supabase/v27_secure_messaging.sql`

The previous client-side `messages` INSERT policy is removed. This makes the trusted server the intended write path.

## Important

The service-role key bypasses RLS, so the server must perform all authorization checks itself. Keep this endpoint behind HTTPS and add production rate limiting, abuse protection, logging, and monitoring.

V27 is a secure architecture foundation, not a complete anti-abuse system.
