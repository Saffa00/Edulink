-- ============================================================================
-- V60 — Dissertation Access Rules for Final-Year Students
-- Institutional Rules:
-- 1. Dissertation is ONLY for Year 4 students in Semester 2.
-- 2. Year 4 Semester 2 is dissertation-only: NO taught modules, NO timetable,
--    NO attendance, and no student-chosen track (track is derived).
-- 3. Years 1-3, and Year 4 Semester 1, are regular students with NO access to
--    anything dissertation-related.
-- 4. Fees: SLE 100 per module for regular students, SLE 500 flat for dissertation.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. DATA MODEL
-- ============================================================================

-- 1.1 Add profiles.level (integer 1-4, editable by admins only)
alter table if exists public.profiles
  add column if not exists level integer check (level between 1 and 4) default 1;

-- Also ensure students table has level as integer/clean sync
alter table if exists public.students
  add column if not exists level_num integer check (level_num between 1 and 4) default 1;

-- Sync existing student levels into profiles and students.level_num
update public.students
set level_num = case
  when level in ('1', 'Year 1', 'Level 1') then 1
  when level in ('2', 'Year 2', 'Level 2') then 2
  when level in ('3', 'Year 3', 'Level 3') then 3
  when level in ('4', 'Year 4', 'Level 4') then 4
  else 1
end
where level_num is null or level_num = 1;

update public.profiles p
set level = s.level_num
from public.students s
where p.student_id = s.id
  and s.level_num is not null;

-- 1.2 Create academic_terms Table
create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null default '2026/2027',
  semester integer not null check (semester in (1, 2)),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  dissertation_reg_open boolean not null default false,
  created_at timestamptz not null default now(),
  unique (academic_year, semester)
);

-- Seed current academic terms (Idempotent)
insert into public.academic_terms (academic_year, semester, starts_on, ends_on, is_current, dissertation_reg_open)
values
  ('2026/2027', 1, '2026-09-01', '2027-01-31', true, false),
  ('2026/2027', 2, '2027-02-01', '2027-06-30', false, true)
on conflict (academic_year, semester) do update
set starts_on = excluded.starts_on,
    ends_on = excluded.ends_on;

-- Helper to ensure only ONE term is marked is_current at a time
create or replace function public.set_current_academic_term(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin()) then
    raise exception 'Access denied: Only system administrators can set the current academic term.';
  end if;

  update public.academic_terms set is_current = false where id <> p_term_id;
  update public.academic_terms set is_current = true where id = p_term_id;
end;
$$;

grant execute on function public.set_current_academic_term(uuid) to authenticated;

-- 1.3 Create student_term_registrations Table
create table if not exists public.student_term_registrations (
  student_id uuid not null references public.students(id) on delete cascade,
  term_id uuid not null references public.academic_terms(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  payment_status text not null check (payment_status in ('pending', 'paid', 'waived')) default 'pending',
  allow_modules_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, term_id)
);

-- 1.4 Helper function: Derived Track (Never stored directly from student input)
-- Returns 'dissertation' if level = 4 and active term semester = 2; else 'regular'
create or replace function public.get_student_academic_track(p_student_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_level integer;
  v_semester integer;
begin
  -- Resolve level from profiles (or students fallback)
  select coalesce(p.level, s.level_num, 1) into v_level
  from public.students s
  left join public.profiles p on p.student_id = s.id
  where s.id = p_student_id;

  -- Resolve active term semester
  select semester into v_semester
  from public.academic_terms
  where is_current = true
  limit 1;

  if v_level = 4 and coalesce(v_semester, 1) = 2 then
    return 'dissertation';
  else
    return 'regular';
  end if;
end;
$$;

grant execute on function public.get_student_academic_track(uuid) to authenticated, anon;

-- 1.5 Adapt Dissertations Table to link with student_id and term_id
alter table if exists public.dissertations
  add column if not exists term_id uuid references public.academic_terms(id) on delete cascade,
  add column if not exists requested_supervisor_id uuid references public.lecturers(id) on delete set null,
  add column if not exists defense_date timestamptz,
  add column if not exists defense_status text check (defense_status in ('not_scheduled', 'scheduled', 'passed', 'revision_required', 'failed')) default 'not_scheduled';

-- Link existing dissertations to the Semester 2 term if term_id is null
update public.dissertations d
set term_id = (
  select id from public.academic_terms
  where academic_year = '2026/2027' and semester = 2
  limit 1
)
where d.term_id is null;

-- ============================================================================
-- 2. REGISTRATION FLOW & DATABASE-LEVEL ENFORCEMENT
-- ============================================================================

-- Server-side RPC to submit dissertation registration
-- Rejects unless: level = 4, active term semester = 2, and dissertation_reg_open = true
create or replace function public.register_dissertation_term(
  p_topic text,
  p_requested_supervisor_id uuid default null,
  p_monime_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_student_auth_id uuid := auth.uid();
  v_student_name text;
  v_level integer;
  v_term_id uuid;
  v_semester integer;
  v_reg_open boolean;
  v_dissertation_id uuid;
  v_term_reg record;
begin
  if v_student_auth_id is null then
    raise exception 'Authentication required.';
  end if;

  -- 1. Resolve student record & level
  select s.id, s.full_name, coalesce(p.level, s.level_num, 1)
  into v_student_id, v_student_name, v_level
  from public.students s
  left join public.profiles p on p.student_id = s.id
  where s.auth_user_id = v_student_auth_id
  limit 1;

  if v_student_id is null then
    raise exception 'Student record not found for authenticated user.';
  end if;

  -- 2. Resolve current academic term
  select id, semester, dissertation_reg_open
  into v_term_id, v_semester, v_reg_open
  from public.academic_terms
  where is_current = true
  limit 1;

  if v_term_id is null then
    -- Fallback to the latest Semester 2 term
    select id, semester, dissertation_reg_open
    into v_term_id, v_semester, v_reg_open
    from public.academic_terms
    where semester = 2
    order by created_at desc
    limit 1;
  end if;

  -- 3. Strict Institutional Eligibility Rule Enforcement
  if v_level <> 4 then
    raise exception 'Eligibility violation: Dissertation registration is strictly reserved for Year 4 students (Your current level is Year %).', v_level;
  end if;

  if coalesce(v_semester, 1) <> 2 then
    raise exception 'Eligibility violation: Dissertation is only offered in Semester 2 (Current term is Semester %).', coalesce(v_semester, 1);
  end if;

  if not coalesce(v_reg_open, false) then
    raise exception 'Dissertation registration is currently closed for this term.';
  end if;

  if p_topic is null or length(trim(p_topic)) < 5 then
    raise exception 'Please provide a valid research dissertation topic proposal.';
  end if;

  -- 4. Create or update student_term_registrations (status = pending)
  insert into public.student_term_registrations (
    student_id, term_id, status, payment_status, allow_modules_override, updated_at
  ) values (
    v_student_id, v_term_id, 'pending',
    case when p_monime_reference is not null then 'paid' else 'pending' end,
    false, now()
  )
  on conflict (student_id, term_id) do update
  set status = 'pending',
      payment_status = case when p_monime_reference is not null then 'paid' else public.student_term_registrations.payment_status end,
      updated_at = now()
  returning * into v_term_reg;

  -- 5. Create or update dissertations record
  insert into public.dissertations (
    student_id, term_id, title, requested_supervisor_id, status, current_chapter, progress_percentage
  ) values (
    v_student_id, v_term_id, trim(p_topic), p_requested_supervisor_id, 'proposal', 1, 20
  )
  on conflict (student_id) do update
  set term_id = v_term_id,
      title = trim(p_topic),
      requested_supervisor_id = coalesce(p_requested_supervisor_id, public.dissertations.requested_supervisor_id),
      status = 'proposal',
      updated_at = now()
  returning id into v_dissertation_id;

  -- 6. Record payment if reference provided
  if p_monime_reference is not null then
    insert into public.payments (
      student_id, amount, currency, status, reference_number, type, provider, description
    ) values (
      v_student_id, 500.00, 'SLE', 'completed', p_monime_reference, 'dissertation', 'monime',
      format('Year 4 Semester 2 Dissertation Registration Fee - %s', trim(p_topic))
    );
  end if;

  -- 7. Notify admins and requested supervisor
  insert into public.notifications (
    user_id, recipient_user_id, type, category, title, body, url, link_url, read
  )
  select
    p.id, p.id, 'dissertation', 'dissertation',
    'New Dissertation Registration Pending Approval',
    format('%s (Year 4) registered for Dissertation: "%s"', v_student_name, trim(p_topic)),
    '/lecturer?page=admin', 'admin', false
  from public.profiles p
  where p.role = 'admin';

  if p_requested_supervisor_id is not null then
    insert into public.notifications (
      user_id, recipient_user_id, type, category, title, body, url, link_url, read
    )
    select
      l.auth_user_id, l.auth_user_id, 'dissertation', 'dissertation',
      'Dissertation Supervision Request',
      format('%s requested you as supervisor for: "%s"', v_student_name, trim(p_topic)),
      '/lecturer?page=dissertation', 'dissertation', false
    from public.lecturers l
    where l.id = p_requested_supervisor_id
      and l.auth_user_id is not null;
  end if;

  return jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'term_id', v_term_id,
    'dissertation_id', v_dissertation_id,
    'status', 'pending',
    'message', 'Dissertation registration submitted successfully. Awaiting administrative approval.'
  );
end;
$$;

grant execute on function public.register_dissertation_term(text, uuid, text) to authenticated;

-- ============================================================================
-- 3. BLOCK MODULES FOR FINAL YEAR IN SEMESTER 2
-- ============================================================================

create or replace function public.enforce_no_modules_in_year4_sem2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := new.student_id;
  v_level integer;
  v_term_id uuid;
  v_semester integer;
  v_override boolean := false;
begin
  -- Resolve student level
  select coalesce(p.level, s.level_num, 1) into v_level
  from public.students s
  left join public.profiles p on p.student_id = s.id
  where s.id = v_student_id;

  -- Resolve active term
  select id, semester into v_term_id, v_semester
  from public.academic_terms
  where is_current = true
  limit 1;

  if v_level = 4 and coalesce(v_semester, 1) = 2 then
    -- Check if student has administrative module override
    select coalesce(allow_modules_override, false) into v_override
    from public.student_term_registrations
    where student_id = v_student_id
      and term_id = v_term_id;

    if not coalesce(v_override, false) then
      raise exception 'Course module enrollment is not permitted for Year 4 Semester 2 students. Final year Semester 2 is dissertation-only unless an administrative override has been granted.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_modules_year4_sem2 on public.student_modules;
create trigger trg_block_modules_year4_sem2
before insert on public.student_modules
for each row execute function public.enforce_no_modules_in_year4_sem2();

drop trigger if exists trg_block_enrollments_year4_sem2 on public.enrollments;
create trigger trg_block_enrollments_year4_sem2
before insert on public.enrollments
for each row execute function public.enforce_no_modules_in_year4_sem2();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.academic_terms enable row level security;
alter table public.student_term_registrations enable row level security;
alter table public.dissertations enable row level security;
alter table public.dissertation_versions enable row level security;

-- 5.1 academic_terms RLS
drop policy if exists "all authenticated read academic terms" on public.academic_terms;
create policy "all authenticated read academic terms"
on public.academic_terms for select
to authenticated, anon
using (true);

drop policy if exists "only admins modify academic terms" on public.academic_terms;
create policy "only admins modify academic terms"
on public.academic_terms for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 5.2 student_term_registrations RLS
drop policy if exists "students read own term registration" on public.student_term_registrations;
create policy "students read own term registration"
on public.student_term_registrations for select
to authenticated
using (
  student_id in (select id from public.students where auth_user_id = auth.uid())
  or public.is_admin()
  or public.is_lecturer()
);

drop policy if exists "admins manage term registrations" on public.student_term_registrations;
create policy "admins manage term registrations"
on public.student_term_registrations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 5.3 dissertations RLS:
-- Accessible ONLY to (a) approved student, (b) assigned supervisor, (c) admins
drop policy if exists "dissertations access policy" on public.dissertations;
create policy "dissertations access policy"
on public.dissertations for select
to authenticated
using (
  -- (a) Student with approved/pending registration
  student_id in (
    select str.student_id
    from public.student_term_registrations str
    join public.students s on s.id = str.student_id
    where s.auth_user_id = auth.uid()
      and str.status in ('approved', 'pending')
  )
  -- (b) Assigned supervisor or requested supervisor
  or supervisor_id in (
    select id from public.lecturers where auth_user_id = auth.uid()
  )
  or requested_supervisor_id in (
    select id from public.lecturers where auth_user_id = auth.uid()
  )
  -- (c) System Administrator
  or public.is_admin()
);

drop policy if exists "dissertations student update policy" on public.dissertations;
create policy "dissertations student update policy"
on public.dissertations for update
to authenticated
using (
  student_id in (
    select s.id from public.students s
    where s.auth_user_id = auth.uid()
  )
  or supervisor_id in (
    select l.id from public.lecturers l
    where l.auth_user_id = auth.uid()
  )
  or public.is_admin()
)
with check (
  student_id in (
    select s.id from public.students s
    where s.auth_user_id = auth.uid()
  )
  or supervisor_id in (
    select l.id from public.lecturers l
    where l.auth_user_id = auth.uid()
  )
  or public.is_admin()
);

-- 5.4 dissertation_versions RLS
drop policy if exists "dissertation versions access policy" on public.dissertation_versions;
create policy "dissertation versions access policy"
on public.dissertation_versions for select
to authenticated
using (
  dissertation_id in (
    select id from public.dissertations
    where student_id in (select id from public.students where auth_user_id = auth.uid())
       or supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
       or public.is_admin()
  )
);

drop policy if exists "dissertation versions insert update policy" on public.dissertation_versions;
create policy "dissertation versions insert update policy"
on public.dissertation_versions for all
to authenticated
using (
  dissertation_id in (
    select id from public.dissertations
    where student_id in (select id from public.students where auth_user_id = auth.uid())
       or supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
       or public.is_admin()
  )
)
with check (
  dissertation_id in (
    select id from public.dissertations
    where student_id in (select id from public.students where auth_user_id = auth.uid())
       or supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
       or public.is_admin()
  )
);

-- ============================================================================
-- 6. ADMIN OPERATIONS: APPROVE / REJECT / ASSIGN SUPERVISOR / PROMOTE LEVELS
-- ============================================================================

-- 6.1 Approve dissertation registration
create or replace function public.admin_approve_dissertation_registration(
  p_student_id uuid,
  p_term_id uuid,
  p_supervisor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_auth_id uuid;
  v_title text;
begin
  if not (public.is_admin()) then
    raise exception 'Unauthorized: Only administrators can approve dissertation registrations.';
  end if;

  update public.student_term_registrations
  set status = 'approved',
      updated_at = now()
  where student_id = p_student_id and term_id = p_term_id;

  if p_supervisor_id is not null then
    update public.dissertations
    set supervisor_id = p_supervisor_id,
        status = 'chapter_review',
        updated_at = now()
    where student_id = p_student_id;
  else
    update public.dissertations
    set status = 'chapter_review',
        updated_at = now()
    where student_id = p_student_id;
  end if;

  select s.auth_user_id, d.title
  into v_student_auth_id, v_title
  from public.students s
  left join public.dissertations d on d.student_id = s.id
  where s.id = p_student_id;

  if v_student_auth_id is not null then
    insert into public.notifications (
      user_id, recipient_user_id, type, category, title, body, url, link_url, read
    ) values (
      v_student_auth_id, v_student_auth_id, 'dissertation', 'dissertation',
      'Dissertation Registration Approved!',
      'Your Year 4 Semester 2 dissertation registration has been approved. You can now begin Chapter 1.',
      '/student?page=dissertation', 'dissertation', false
    );
  end if;
end;
$$;

grant execute on function public.admin_approve_dissertation_registration(uuid, uuid, uuid) to authenticated;

-- 6.2 Assign/Reassign supervisor
create or replace function public.admin_assign_dissertation_supervisor(
  p_dissertation_id uuid,
  p_supervisor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_auth_id uuid;
  v_supervisor_name text;
begin
  if not (public.is_admin()) then
    raise exception 'Unauthorized: Only administrators can assign supervisors.';
  end if;

  update public.dissertations
  set supervisor_id = p_supervisor_id,
      updated_at = now()
  where id = p_dissertation_id;

  select l.full_name into v_supervisor_name
  from public.lecturers l where l.id = p_supervisor_id;

  select s.auth_user_id into v_student_auth_id
  from public.dissertations d
  join public.students s on s.id = d.student_id
  where d.id = p_dissertation_id;

  if v_student_auth_id is not null then
    insert into public.notifications (
      user_id, recipient_user_id, type, category, title, body, url, link_url, read
    ) values (
      v_student_auth_id, v_student_auth_id, 'dissertation', 'dissertation',
      'Supervisor Assigned',
      format('Faculty supervisor %s has been assigned to your dissertation.', coalesce(v_supervisor_name, 'Faculty Staff')),
      '/student?page=dissertation', 'dissertation', false
    );
  end if;
end;
$$;

grant execute on function public.admin_assign_dissertation_supervisor(uuid, uuid) to authenticated;

-- 6.3 Bulk promote student academic levels (Year 1->2, 2->3, 3->4)
create or replace function public.admin_bulk_promote_student_levels()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted_count integer := 0;
begin
  if not (public.is_admin()) then
    raise exception 'Unauthorized: Only administrators can execute bulk level promotion.';
  end if;

  -- Increment level for students level 1..3
  update public.students
  set level_num = level_num + 1,
      level = (level_num + 1)::text
  where level_num between 1 and 3;

  get diagnostics v_promoted_count = row_count;

  -- Synchronize profiles table
  update public.profiles p
  set level = s.level_num
  from public.students s
  where p.student_id = s.id;

  return jsonb_build_object(
    'success', true,
    'promoted_count', v_promoted_count,
    'message', format('Successfully promoted %s students to their next academic year level.', v_promoted_count)
  );
end;
$$;

grant execute on function public.admin_bulk_promote_student_levels() to authenticated;
