# V25 — Student ↔ Lecturer Messaging

V25 adds private module-based conversations between a Student and Lecturer.

- One conversation per Student + Lecturer + Module.
- Both participants can read messages.
- Only authenticated participants can send messages.
- Messages are timestamped.
- Read status is supported.
- Conversation list is ordered by latest message.
- RLS prevents unrelated users from accessing conversations.

Production hardening can add realtime subscriptions, message notifications, rate limits, moderation/reporting, and server-side conversation creation.
