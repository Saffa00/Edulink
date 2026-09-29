# V32 — Web Push Notifications

V32 adds the foundation for browser push notifications when the PWA is not open.

## What was added
- `/public/sw.js` service worker push handler.
- Client push subscription service.
- Private `push_subscriptions` table.
- RLS so users can manage only their own subscriptions.
- Server-side Web Push sender using VAPID.
- Push status endpoint.
- `web-push` server dependency.

## Setup
1. Generate VAPID keys with a trusted server environment.
2. Put the public key in `VITE_VAPID_PUBLIC_KEY`.
3. Keep the private key only on the server.
4. Set `VAPID_SUBJECT` to an administrative contact such as `mailto:admin@example.com`.
5. Run `supabase/v32_push_notifications.sql`.
6. Run `npm install` inside `server`.
7. Call `subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY)` after login when the user chooses to enable notifications.

## Sending a message notification
After the secure server message is created in V27/V28, call:

`sendPushToUser(recipientUserId, { title, body, data: { url: '/messages' } })`

This must happen on the trusted server only.

## Security
- Never expose `VAPID_PRIVATE_KEY`.
- Do not accept arbitrary recipient IDs from an untrusted client for push delivery.
- Determine the recipient from the authorized conversation.
- Remove stale 404/410 push subscriptions.
- Push notifications may be disabled by the browser or operating system.
