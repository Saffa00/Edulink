-- V35 application settings metadata.
-- User-specific UI preferences remain client-side in this version.
-- This table is optional and can be enabled later for cross-device sync.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  email_notifications boolean not null default true,
  message_notifications boolean not null default true,
  grade_notifications boolean not null default true,
  assignment_notifications boolean not null default true,
  compact_mode boolean not null default false,
  theme text not null default 'system'
    check (theme in ('system','light','dark')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "users manage own settings v35" on public.user_settings;
create policy "users manage own settings v35"
on public.user_settings
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists user_settings_user_id_v35
on public.user_settings(user_id);
