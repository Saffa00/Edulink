# V29 — Secure Conversation Creation

V29 prevents arbitrary Student ↔ Lecturer conversations.

## New flow

Student opens a registered module
→ request conversation for Module ID
→ trusted server authenticates student
→ verifies active student account
→ verifies student is registered for the module
→ finds the module's assigned lecturer
→ verifies lecturer is active
→ creates/reuses the single Student + Module + Lecturer conversation.

The student never supplies a Lecturer ID.

## Endpoint

`POST /api/conversations`

Body:
```json
{ "moduleId": "..." }
```

Authentication:
`Authorization: Bearer <Supabase access token>`

## Security rules

A student cannot:
- choose an unrelated lecturer;
- create a conversation for an unregistered module;
- create a conversation for an inactive account;
- create duplicate conversations for the same module relationship.

The lecturer is derived from `modules.lecturer_id`.

## Database

Run:
`supabase/v29_secure_conversations.sql`

The unique index enforces one conversation for:
`Student + Module + Lecturer`.

## Production note

The trusted server uses the Supabase service role and therefore must perform all authorization checks. Never expose the service-role key to the PWA.
