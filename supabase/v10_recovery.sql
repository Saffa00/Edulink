-- V10: secure password recovery + device replacement foundation.
-- Run after V9.

create table if not exists public.device_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  lecturer_id uuid references public.lecturers(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  request_ip text,
  request_user_agent text,
  created_at timestamptz not null default now(),
  check (
    (student_id is not null and lecturer_id is null)
    or
    (student_id is null and lecturer_id is not null)
  )
);

create unique index if not exists device_recovery_token_hash_idx
  on public.device_recovery_requests(token_hash);

create index if not exists device_recovery_student_idx
  on public.device_recovery_requests(student_id, expires_at);

create index if not exists device_recovery_lecturer_idx
  on public.device_recovery_requests(lecturer_id, expires_at);

alter table public.device_recovery_requests enable row level security;

-- No client insert/update/select policy is intentionally provided.
-- The server handles recovery requests using the Supabase service role.

-- Add password recovery to the audit vocabulary.
alter table public.login_events
  drop constraint if exists login_events_event_type_check;

alter table public.login_events
  add constraint login_events_event_type_check
  check (event_type in (
    'login',
    'device_register',
    'device_revoke',
    'password_reset',
    'security_block',
    'recovery_request',
    'recovery_success',
    'recovery_failed'
  ));
