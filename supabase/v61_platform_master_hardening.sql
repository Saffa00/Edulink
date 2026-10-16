-- ============================================================================
-- V61 — EduLink Platform Master Hardening & WhatsApp Messaging
-- Covers:
-- 1. Profiles & Admin Audit Logs (Part 2)
-- 2. GPS Attendance Server Validation & Lecturer Manual Override (Part 2)
-- 3. Multi-Campus Offering & Fee Config (Part 3 & Part 5)
-- 4. WhatsApp-style Messaging Data Model & RLS (Part 7)
-- 5. Chat Profiles & Direct Chat Security Definer Functions (Part 7)
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES & ADMIN AUDIT LOGS (Part 2)
-- ----------------------------------------------------------------------------
alter table if exists public.profiles
  add column if not exists level integer check (level between 1 and 4) default 1,
  add column if not exists campus_id text default 'goderich',
  add column if not exists avatar_path text,
  add column if not exists show_photo_to_classmates boolean default true;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action_type text not null, -- 'level_change', 'grade_publish', 'module_override', 'device_reset', 'dissertation_approval', 'block_user'
  target_entity text not null,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "admins read all audit logs" on public.admin_audit_logs;
create policy "admins read all audit logs" on public.admin_audit_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "authenticated insert audit logs" on public.admin_audit_logs;
create policy "authenticated insert audit logs" on public.admin_audit_logs
  for insert to authenticated
  with check (true);

-- ----------------------------------------------------------------------------
-- 2. ATTENDANCE ACCURACY & MANUAL LECTURER OVERRIDE (Part 2)
-- ----------------------------------------------------------------------------
alter table if exists public.attendance
  add column if not exists accuracy_meters numeric,
  add column if not exists verified_by_lecturer_id uuid references public.lecturers(id) on delete set null,
  add column if not exists manual_override boolean default false,
  add column if not exists override_reason text;

-- RPC for Lecturer to manually override student attendance with audit log
create or replace function public.lecturer_override_attendance(
  p_class_id uuid,
  p_student_id uuid,
  p_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lecturer_id uuid;
  v_class record;
  v_attendance record;
begin
  -- Resolve caller lecturer
  select id into v_lecturer_id
  from public.lecturers
  where auth_user_id = auth.uid();

  if v_lecturer_id is null then
    raise exception 'Unauthorized: only lecturers can override class attendance';
  end if;

  -- Verify class ownership
  select * into v_class
  from public.classes
  where id = p_class_id and lecturer_id = v_lecturer_id;

  if v_class.id is null then
    raise exception 'Class not found or not taught by the calling lecturer';
  end if;

  if p_status not in ('present', 'late', 'absent') then
    raise exception 'Invalid status: must be present, late, or absent';
  end if;

  -- Insert or update attendance record
  insert into public.attendance (
    class_id,
    student_id,
    status,
    marked_at,
    verified,
    verification_method,
    manual_override,
    verified_by_lecturer_id,
    override_reason
  )
  values (
    p_class_id,
    p_student_id,
    p_status,
    now(),
    true,
    'lecturer_manual_override',
    true,
    v_lecturer_id,
    coalesce(p_reason, 'Manual attendance override by lecturer')
  )
  on conflict (class_id, student_id)
  do update set
    status = p_status,
    manual_override = true,
    verified_by_lecturer_id = v_lecturer_id,
    override_reason = coalesce(p_reason, 'Manual attendance override by lecturer'),
    marked_at = now()
  returning * into v_attendance;

  -- Write audit entry
  insert into public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_entity,
    target_id,
    details
  ) values (
    auth.uid(),
    'attendance_manual_override',
    'attendance',
    v_attendance.id::text,
    jsonb_build_object(
      'class_id', p_class_id,
      'student_id', p_student_id,
      'new_status', p_status,
      'reason', p_reason
    )
  );

  return jsonb_build_object('success', true, 'attendance', row_to_json(v_attendance));
end;
$$;

grant execute on function public.lecturer_override_attendance to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. CONFIGURABLE SYSTEM FEES (Part 5)
-- ----------------------------------------------------------------------------
create table if not exists public.system_fees (
  fee_key text primary key,
  amount numeric not null,
  currency text not null default 'SLE',
  description text,
  updated_at timestamptz default now()
);

alter table public.system_fees enable row level security;

drop policy if exists "anyone can read system fees" on public.system_fees;
create policy "anyone can read system fees" on public.system_fees
  for select to authenticated, anon
  using (true);

drop policy if exists "only admins can update system fees" on public.system_fees;
create policy "only admins can update system fees" on public.system_fees
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

insert into public.system_fees (fee_key, amount, currency, description)
values
  ('fee_per_module', 1.00, 'SLE', 'Module registration fee (testing rate: SLE 1.00, production: SLE 100.00)'),
  ('dissertation_flat_fee', 500.00, 'SLE', 'Final-year semester 2 flat dissertation registration fee')
on conflict (fee_key) do update
set amount = excluded.amount, description = excluded.description;

-- ----------------------------------------------------------------------------
-- 4. WHATSAPP-STYLE MESSAGING DATA MODEL (Part 7)
-- ----------------------------------------------------------------------------

-- 4.1 module_offerings private messages mode
alter table if exists public.module_offerings
  add column if not exists private_messages_mode text check (private_messages_mode in ('on', 'off', 'office_hours')) default 'on';

-- 4.2 conversations table upgrades
alter table if exists public.conversations
  add column if not exists type text check (type in ('direct', 'offering_group', 'supervision')) default 'direct',
  add column if not exists offering_id uuid references public.module_offerings(id) on delete cascade,
  add column if not exists group_kind text check (group_kind in ('announcements', 'discussion')),
  add column if not exists announcements_only boolean default false,
  add column if not exists status text check (status in ('request', 'active', 'read_only')) default 'active',
  add column if not exists initiated_by uuid references auth.users(id) on delete set null,
  add column if not exists last_message_preview text,
  add column if not exists title text;

-- 4.3 conversation_members table
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz default now(),
  muted boolean default false,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create index if not exists idx_conv_members_user on public.conversation_members(user_id);
create index if not exists idx_conv_members_conv on public.conversation_members(conversation_id);

-- 4.4 messages table upgrades
alter table if exists public.messages
  add column if not exists sender_id uuid references auth.users(id) on delete cascade,
  add column if not exists client_id uuid default gen_random_uuid(),
  add column if not exists attachment_path text,
  add column if not exists reply_to uuid references public.messages(id) on delete set null,
  add column if not exists deleted_at timestamptz;

-- Ensure sender_id has fallback from sender_user_id
update public.messages
set sender_id = sender_user_id
where sender_id is null and sender_user_id is not null;

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at desc);

-- 4.5 message_reports table
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  action_taken text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- 4.6 bulk_message_audit table
create table if not exists public.bulk_message_audit (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references auth.users(id) on delete cascade,
  recipient_count integer not null,
  message_preview text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) FOR MESSAGING (Part 7)
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
alter table public.bulk_message_audit enable row level security;

-- 5.1 Conversations RLS
drop policy if exists "members can view conversation" on public.conversations;
create policy "members can view conversation" on public.conversations
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 5.2 Conversation Members RLS
drop policy if exists "members can view fellow members" on public.conversation_members;
create policy "members can view fellow members" on public.conversation_members
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members my_cm
      where my_cm.conversation_id = conversation_members.conversation_id
        and my_cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "members can update own member state" on public.conversation_members;
create policy "members can update own member state" on public.conversation_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5.3 Messages RLS
drop policy if exists "members can view conversation messages" on public.messages;
create policy "members can view conversation messages" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "members can insert message" on public.messages;
create policy "members can insert message" on public.messages
  for insert to authenticated
  with check (
    -- Caller must be the sender
    (sender_id = auth.uid() or sender_user_id = auth.uid())
    -- Caller must be member of conversation
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
    -- If announcements only, caller must be lecturer or admin
    and (
      not exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id and c.announcements_only = true
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('lecturer', 'admin')
      )
    )
  );

drop policy if exists "sender can soft-delete message" on public.messages;
create policy "sender can soft-delete message" on public.messages
  for update to authenticated
  using (sender_id = auth.uid() or sender_user_id = auth.uid())
  with check (sender_id = auth.uid() or sender_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. SECURITY DEFINER FUNCTIONS (Part 7)
-- ----------------------------------------------------------------------------

-- 6.1 Create direct chat (verified lecturer-student pairs only)
create or replace function public.create_direct_chat(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_is_lecturer_caller boolean;
  v_lecturer_user_id uuid;
  v_student_user_id uuid;
  v_is_linked boolean := false;
  v_existing_id uuid;
  v_new_conv_id uuid;
  v_private_mode text := 'on';
  v_status text;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'You cannot start a direct chat with yourself.';
  end if;

  -- Determine roles
  select role into v_caller_role from public.profiles where id = v_caller_id;
  select role into v_target_role from public.profiles where id = p_target_user_id;

  if v_caller_role is null or v_target_role is null then
    raise exception 'User profile not found.';
  end if;

  -- Direct chat is strictly lecturer-student only (no student-student)
  if (v_caller_role = 'student' and v_target_role = 'student') then
    raise exception 'Direct student-to-student private chats are not permitted by institutional policy.';
  end if;

  if (v_caller_role = 'lecturer' and v_target_role = 'lecturer') then
    raise exception 'Direct chats are for academic consultation between lecturers and students.';
  end if;

  if v_caller_role = 'lecturer' then
    v_is_lecturer_caller := true;
    v_lecturer_user_id := v_caller_id;
    v_student_user_id := p_target_user_id;
  else
    v_is_lecturer_caller := false;
    v_lecturer_user_id := p_target_user_id;
    v_student_user_id := v_caller_id;
  end if;

  -- Verify relationship: student is enrolled in lecturer's offering OR is their dissertation supervisee
  -- Check 1: Enrolled in offering
  select exists (
    select 1
    from public.enrollments e
    join public.module_offerings mo on mo.id = e.offering_id
    where e.student_id = v_student_user_id
      and mo.lecturer_id = v_lecturer_user_id
  ) into v_is_linked;

  -- Check 2: Dissertation supervisee
  if not v_is_linked then
    select exists (
      select 1
      from public.dissertations d
      join public.students s on s.id = d.student_id
      join public.lecturers l on l.id = d.supervisor_id
      where s.auth_user_id = v_student_user_id
        and l.auth_user_id = v_lecturer_user_id
    ) into v_is_linked;
  end if;

  -- If neither, check legacy student_modules fallback
  if not v_is_linked then
    select exists (
      select 1
      from public.student_modules sm
      join public.modules m on m.id = sm.module_id
      join public.students s on s.id = sm.student_id
      join public.lecturers l on l.id = m.lecturer_id
      where s.auth_user_id = v_student_user_id
        and l.auth_user_id = v_lecturer_user_id
    ) into v_is_linked;
  end if;

  if not v_is_linked then
    raise exception 'Direct private chats are only allowed between students and their course lecturers or dissertation supervisors.';
  end if;

  -- Check if conversation already exists between this pair
  select c.id into v_existing_id
  from public.conversations c
  join public.conversation_members cm1 on cm1.conversation_id = c.id and cm1.user_id = v_caller_id
  join public.conversation_members cm2 on cm2.conversation_id = c.id and cm2.user_id = p_target_user_id
  where c.type = 'direct'
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object('success', true, 'conversation_id', v_existing_id, 'is_new', false);
  end if;

  -- Check private_messages_mode if student initiated
  if not v_is_lecturer_caller then
    -- If student initiated, default status is 'request'
    v_status := 'request';
  else
    -- Lecturer initiated opens immediately without request
    v_status := 'active';
  end if;

  -- Create conversation
  insert into public.conversations (
    type,
    status,
    initiated_by,
    last_message_at,
    title
  )
  values (
    'direct',
    v_status,
    v_caller_id,
    now(),
    'Direct Consultation'
  )
  returning id into v_new_conv_id;

  -- Add both members
  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_new_conv_id, v_caller_id),
    (v_new_conv_id, p_target_user_id)
  on conflict do nothing;

  return jsonb_build_object(
    'success', true,
    'conversation_id', v_new_conv_id,
    'is_new', true,
    'status', v_status
  );
end;
$$;

grant execute on function public.create_direct_chat to authenticated, service_role;

-- 6.2 get_chat_profiles: privacy-safe profiles for conversation members
create or replace function public.get_chat_profiles(p_conversation_id uuid)
returns table (
  id uuid,
  full_name text,
  role text,
  avatar_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_is_member boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Verify caller is a member of this conversation (or admin)
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = v_caller_id
  ) into v_is_member;

  select p.role into v_caller_role
  from public.profiles p
  where p.id = v_caller_id;

  if not v_is_member and v_caller_role <> 'admin' then
    raise exception 'You must be a member of this conversation to view member profiles.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.role,
    case
      -- Lecturers and admins always see avatar
      when v_caller_role in ('lecturer', 'admin') then p.avatar_path
      -- Classmate photo hiding rule: if user hid photo from classmates, return null
      when p.show_photo_to_classmates = false and p.role = 'student' and p.id <> v_caller_id then null
      else p.avatar_path
    end as avatar_path
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = p_conversation_id;
end;
$$;

grant execute on function public.get_chat_profiles to authenticated, service_role;
