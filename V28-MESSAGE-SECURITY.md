# V28 — Message Security & Anti-Abuse

V28 strengthens the V27 trusted messaging endpoint.

## Security additions

### 1. Server-side authorization
Before a message is accepted, the server verifies:
- authenticated Supabase user;
- conversation participant;
- active Student account or active Lecturer account;
- Student is registered for the conversation's module;
- Lecturer is actually assigned to the conversation's module.

### 2. Rate limiting
The message endpoint has a configurable limiter.

Defaults:
- 20 messages per 60 seconds.

Environment variables:
- `MESSAGE_RATE_MAX`
- `MESSAGE_RATE_WINDOW_MS`

The included limiter is an in-memory prototype. Production deployments with multiple server instances should use a shared store such as Redis/Upstash.

### 3. Message validation
Messages must contain 1–5000 non-empty characters.

### 4. Audit
Successful sends are recorded in `message_send_audit`.

### 5. Database indexes
Indexes are added for common authorization and audit lookups.

## Production recommendation
Keep the following security boundary:
Browser → HTTPS → authenticated server/Edge Function → Supabase service role.

Never expose the service-role key in the PWA.

## Conversation creation
The next hardening step should also create conversations only through a trusted server function using:
Student + registered module + assigned lecturer.

Do not allow a client to invent arbitrary student/lecturer/module combinations.
