# V33 — Secure Message Push Integration

V33 connects V32 Web Push to the existing secure Student ↔ Lecturer messaging flow.

## Message flow

1. Authenticated user sends a message.
2. Server verifies conversation membership and module authorization.
3. Server inserts the message.
4. Server resolves the other participant from the conversation itself.
5. Server sends a Web Push notification to that participant's registered devices.
6. Stale subscriptions are removed.
7. Delivery attempts are recorded in `push_delivery_audit`.
8. A push failure does not cause a valid message to fail.

## Security

- The client does not choose the recipient for push delivery.
- The server derives the recipient from the authorized conversation.
- VAPID private key remains server-side.
- Push subscriptions are protected by Supabase RLS.
- Delivery audit has no client write policy.
- Message authorization from V28 remains authoritative.

## Setup

1. Run `supabase/v33_message_push.sql`.
2. Ensure V32 Web Push environment variables are configured.
3. Ensure the server has the `web-push` dependency.
4. Enable push from the user's Profile/Settings screen using `PushNotificationSettings`.
5. Deploy the server over HTTPS.
6. Test on a browser/device that supports Web Push.

## Important

Browser/OS notification permission can be denied or revoked. Push delivery is best-effort; the message itself remains stored in the application's database.
