# V26 — Real-Time Messaging & Message Notifications

V26 extends V25 with live chat and message notifications.

## Added
- Supabase Realtime subscription for the active conversation.
- Message notification creation for the other participant.
- `notification_type = 'message'`.
- Stable notification source-key strategy.
- Realtime SQL publication setup.
- Additional indexes for messages and notifications.

## Supabase setup
Run:
`supabase/v26_realtime_messaging.sql`

If `supabase_realtime` is unavailable, enable Realtime for the `messages` table in the Supabase Dashboard.

## Important production note
Client-side notification insertion is suitable for the prototype but should be moved to a trusted Supabase Edge Function/server transaction before production. The trusted backend should:
1. verify the authenticated sender,
2. verify the sender belongs to the conversation,
3. insert the message,
4. determine the other participant,
5. create exactly one notification using `source_key = message:<message-id>`.

The production source key should use the actual message UUID rather than a timestamp.

## V26 flow
Student/Lecturer opens chat
→ Supabase Realtime subscribes
→ new message appears without manual refresh
→ recipient receives a message notification
→ notification is marked read from the Notifications Center
→ opening the conversation marks received messages as read.

## V26 limitation
The notification helper is still client-side in this prototype. Do not treat it as a security boundary.
