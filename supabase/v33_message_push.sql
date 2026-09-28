-- V33: Secure push delivery audit.
create table if not exists public.push_delivery_audit (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  status text not null check (status in ('sent','failed','stale')),
  provider_status integer,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.push_delivery_audit enable row level security;

-- No client insert/update/delete. Server/service-role writes delivery audit.
drop policy if exists "no client access to push delivery audit v33" on public.push_delivery_audit;

create index if not exists push_delivery_audit_message_v33
  on public.push_delivery_audit(message_id, created_at desc);

create index if not exists push_delivery_audit_recipient_v33
  on public.push_delivery_audit(recipient_user_id, created_at desc);
