-- V57: WebRTC Audio and Video Calls & Call History
create table if not exists public.academic_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  caller_user_id uuid not null,
  receiver_user_id uuid not null,
  caller_name text not null,
  receiver_name text not null,
  call_type text not null check(call_type in ('audio', 'video')),
  module_code text,
  status text not null check(status in ('initiated', 'connected', 'missed', 'rejected', 'completed')),
  duration_seconds int default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists academic_calls_caller_idx on public.academic_calls(caller_user_id, created_at desc);
create index if not exists academic_calls_receiver_idx on public.academic_calls(receiver_user_id, created_at desc);
create index if not exists academic_calls_conv_idx on public.academic_calls(conversation_id);

alter table public.academic_calls enable row level security;

drop policy if exists "members can view own calls" on public.academic_calls;
create policy "members can view own calls" on public.academic_calls for select to authenticated
using(caller_user_id = auth.uid() or receiver_user_id = auth.uid());

drop policy if exists "members can insert calls" on public.academic_calls;
create policy "members can insert calls" on public.academic_calls for insert to authenticated
with check(caller_user_id = auth.uid());

drop policy if exists "members can update own calls" on public.academic_calls;
create policy "members can update own calls" on public.academic_calls for update to authenticated
using(caller_user_id = auth.uid() or receiver_user_id = auth.uid())
with check(caller_user_id = auth.uid() or receiver_user_id = auth.uid());
