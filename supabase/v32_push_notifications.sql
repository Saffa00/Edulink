-- V32: Web Push subscriptions.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage own push subscriptions v32" on public.push_subscriptions;
create policy "users manage own push subscriptions v32"
on public.push_subscriptions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists push_subscriptions_user_id_v32
  on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_endpoint_v32
  on public.push_subscriptions(endpoint);
