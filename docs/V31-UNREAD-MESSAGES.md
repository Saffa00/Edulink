# V31 — Unread Messages & Read Tracking

V31 adds unread message indicators and live conversation-list updates.

## Added
- Per-conversation unread count.
- Global unread message badge.
- Student conversation list.
- Lecturer conversation list updates when a new message arrives.
- Read-state helper.
- Database indexes for unread messages.
- Participant-only read-state update policy.

## Read flow
When the user opens a conversation, call:

`markConversationRead(conversationId)`

The function sets `read_at` only on messages sent by the other participant.

## Important
The UI components are reusable pieces. Wire them into the existing Messages screen:
- `StudentConversationList`
- `LecturerConversationList`
- `MessageNotificationBadge`

The existing V25/V26 chat view can remain the actual conversation screen.

## Security
The V31 SQL policy is designed so a participant can mark received messages read, but cannot mark their own sent messages through this policy.

Review older message UPDATE policies before production to ensure clients cannot modify message bodies or sender IDs.
