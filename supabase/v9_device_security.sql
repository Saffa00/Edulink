-- V9: device binding, login history and secure recovery foundation.
-- Run after V8 migrations.

alter table public.devices
  add column if not exists registered_ip text;

alter table public.devices
  add column if not exists last_ip text;

alter table public.devices
  add column if not exists user_agent text;

create index if not exists devices_student_active_idx
  on public.devices(student_id, revoked_at);

create index if not exists devices_lecturer_active_idx
  on public.devices(lecturer_id, revoked_at);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  lecturer_id uuid references public.lecturers(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  event_type text not null check (event_type in ('login', 'device_register', 'device_revoke', 'password_reset', 'security_block')),
  ip_address text,
  user_agent text,
  success boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (student_id is not null and lecturer_id is null)
    or
    (student_id is null and lecturer_id is not null)
  )
);

create index if not exists login_events_student_created_idx
  on public.login_events(student_id, created_at desc);

create index if not exists login_events_lecturer_created_idx
  on public.login_events(lecturer_id, created_at desc);

alter table public.login_events enable row level security;

-- Authenticated users can read only their own history.
drop policy if exists "Users read own login history" on public.login_events;
create policy "Users read own login history"
on public.login_events for select
to authenticated
using (
  (student_id is not null and exists (
    select 1 from public.students s
    where s.id = login_events.student_id
      and s.auth_user_id = auth.uid()
  ))
  or
  (lecturer_id is not null and exists (
    select 1 from public.lecturers l
    where l.id = login_events.lecturer_id
      and l.auth_user_id = auth.uid()
  ))
);

-- The backend uses the service-role/secret key for inserts and device updates.
-- Do not create a client-side insert policy for login_events.

comment on table public.devices is
  'V9 device binding. device_token_hash is a one-way hash; raw device credentials are never stored server-side.';

comment on table public.login_events is
  'Security audit trail for login/device/password events. IP is an audit signal, not a permanent device identity.';
