-- V27: Secure server-side messaging
-- Run after V25/V26 SQL.

-- Messages remain readable through RLS, but INSERT should be restricted
-- to trusted server/service-role writes in production.
-- If your existing client INSERT policy allows authenticated users to insert,
-- replace it with a restrictive policy or remove it and send through /api/messages/send.

drop policy if exists "participants can send messages" on public.messages;

create table if not exists public.message_send_audit (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists message_send_audit_sender_time_v27
  on public.message_send_audit(sender_user_id, created_at desc);

alter table public.message_send_audit enable row level security;

-- No direct client policies are created for the audit table.
-- The service role used by the trusted server can write to it.

create unique index if not exists notifications_source_key_unique_v27
  on public.notifications(source_key)
  where source_key is not null;
