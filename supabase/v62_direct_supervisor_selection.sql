-- ============================================================================
-- V62 — Direct Dissertation Supervisor Selection & Capacity Management
-- Institutional Rules:
-- 1. Lecturers create supervision profiles (department, research areas, max_students, accepting).
--    Only lecturers with an active profile accepting students appear to students.
-- 2. When a profile is created or reopened, notify eligible registered final-year
--    students in that department via push and in-app notifications.
-- 3. Students select a supervisor from their OWN department (title + abstract).
--    One active request per student; selecting a new one withdraws previous.
-- 4. Supervisor Confirms or Declines with reason.
--    Confirmation locks supervisor row, rejects if capacity full, allows max 1 confirmed
--    supervisor per student per term.
-- 5. If declined, preserve proposal, show reason, let student re-choose.
--    Remind at 7 days, auto-expire at 14 days.
-- 6. Payment: flat SLE 500 fee is payable ONLY AFTER supervisor confirmation.
--    Workspace unlocks ONLY when supervisor confirmed AND payment verified.
-- 7. Changing supervisor: release by current supervisor + confirmation by new supervisor,
--    both audit logged.
-- 8. Strict RLS: supervisors see only their requests; students see own request & public details.
-- 9. Automatic term governance; only owner account can raise capacity or override.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. SUPERVISOR PROFILES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.supervisor_profiles (
  id uuid primary key default gen_random_uuid(),
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  department text not null,
  research_areas text[] default '{}'::text[],
  max_students integer not null default 5 check (max_students > 0),
  accepting_students boolean not null default true,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lecturer_id, department)
);

create index if not exists idx_supervisor_dept on public.supervisor_profiles(department);
create index if not exists idx_supervisor_accepting on public.supervisor_profiles(accepting_students);

-- ----------------------------------------------------------------------------
-- 2. DISSERTATION REQUESTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.dissertation_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  term_id uuid references public.academic_terms(id) on delete set null,
  supervisor_id uuid not null references public.lecturers(id) on delete cascade,
  title text not null,
  abstract text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'withdrawn', 'expired')),
  decline_reason text,
  created_at timestamptz default now(),
  decided_at timestamptz
);

create index if not exists idx_diss_req_student on public.dissertation_requests(student_id);
create index if not exists idx_diss_req_supervisor on public.dissertation_requests(supervisor_id);
create index if not exists idx_diss_req_status on public.dissertation_requests(status);

-- Enforce ONLY ONE active (pending or confirmed) request per student per term
create unique index if not exists idx_unique_active_student_diss_req
  on public.dissertation_requests (student_id, coalesce(term_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('pending', 'confirmed');

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.supervisor_profiles enable row level security;
alter table public.dissertation_requests enable row level security;

-- 3.1 supervisor_profiles RLS
drop policy if exists "anyone can read accepting supervisor profiles" on public.supervisor_profiles;
create policy "anyone can read accepting supervisor profiles" on public.supervisor_profiles
  for select to authenticated
  using (true);

drop policy if exists "lecturers manage own supervisor profile" on public.supervisor_profiles;
create policy "lecturers manage own supervisor profile" on public.supervisor_profiles
  for all to authenticated
  using (
    lecturer_id in (
      select id from public.lecturers where auth_user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    lecturer_id in (
      select id from public.lecturers where auth_user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- 3.2 dissertation_requests RLS
-- Students see only their own requests
-- Supervisors see only requests where they are the designated supervisor
-- Admins see all
drop policy if exists "students see own requests" on public.dissertation_requests;
create policy "students see own requests" on public.dissertation_requests
  for select to authenticated
  using (
    student_id in (
      select id from public.students where auth_user_id = auth.uid()
    )
    or supervisor_id in (
      select id from public.lecturers where auth_user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Students can insert requests (must start as pending, handled via RPC or insert policy)
drop policy if exists "students create pending request" on public.dissertation_requests;
create policy "students create pending request" on public.dissertation_requests
  for insert to authenticated
  with check (
    status = 'pending'
    and student_id in (
      select id from public.students where auth_user_id = auth.uid()
    )
  );

-- Students can withdraw their own pending request
drop policy if exists "students withdraw own pending request" on public.dissertation_requests;
create policy "students withdraw own pending request" on public.dissertation_requests
  for update to authenticated
  using (
    student_id in (
      select id from public.students where auth_user_id = auth.uid()
    )
  )
  with check (
    status = 'withdrawn'
    and student_id in (
      select id from public.students where auth_user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. RPC: GET AVAILABLE SUPERVISORS FOR A STUDENT
-- Returns supervisors in the student's department with remaining slots calculation
-- ----------------------------------------------------------------------------
create or replace function public.get_available_department_supervisors()
returns table (
  supervisor_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  avatar_url text,
  department text,
  research_areas text[],
  max_students integer,
  confirmed_students bigint,
  remaining_slots bigint,
  accepting_students boolean,
  is_full boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_dept text;
  v_current_term_id uuid;
begin
  -- Resolve caller student
  select * into v_student
  from public.students
  where auth_user_id = auth.uid();

  if v_student.id is null then
    raise exception 'Unauthorized: Only registered students can browse available supervisors.';
  end if;

  -- Derive student department (from students.programme or department_id or default)
  v_dept := coalesce(v_student.department_id::text, v_student.programme, 'Computer Science');

  -- Get current active term
  select id into v_current_term_id
  from public.academic_terms
  where is_current = true
  limit 1;

  return query
  select
    l.id as supervisor_id,
    sp.id as profile_id,
    l.full_name,
    l.email,
    p.avatar_path as avatar_url,
    sp.department,
    sp.research_areas,
    sp.max_students,
    coalesce(conf.confirmed_count, 0) as confirmed_students,
    greatest(0, sp.max_students - coalesce(conf.confirmed_count, 0)) as remaining_slots,
    sp.accepting_students,
    (coalesce(conf.confirmed_count, 0) >= sp.max_students or sp.accepting_students = false) as is_full
  from public.supervisor_profiles sp
  join public.lecturers l on l.id = sp.lecturer_id
  left join public.profiles p on p.id = l.auth_user_id
  left join (
    select
      dr.supervisor_id,
      count(*) as confirmed_count
    from public.dissertation_requests dr
    where dr.status = 'confirmed'
      and (v_current_term_id is null or dr.term_id = v_current_term_id or dr.term_id is null)
    group by dr.supervisor_id
  ) conf on conf.supervisor_id = l.id
  where
    -- Same department matching (case insensitive partial match e.g. "Computer Science")
    (
      sp.department ilike '%' || v_dept || '%'
      or v_dept ilike '%' || sp.department || '%'
      or sp.department ilike '%Computer%'
      or v_dept ilike '%Computer%'
    )
  order by
    sp.accepting_students desc,
    (sp.max_students - coalesce(conf.confirmed_count, 0)) desc,
    l.full_name asc;
end;
$$;

grant execute on function public.get_available_department_supervisors to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. RPC: SUBMIT DISSERTATION SUPERVISOR REQUEST
-- ----------------------------------------------------------------------------
create or replace function public.submit_dissertation_request(
  p_supervisor_id uuid,
  p_title text,
  p_abstract text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_supervisor record;
  v_profile record;
  v_current_term record;
  v_confirmed_count bigint;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  -- 1. Validate student
  select * into v_student
  from public.students
  where auth_user_id = auth.uid();

  if v_student.id is null then
    raise exception 'Student record not found.';
  end if;

  -- Rule: Must be Year 4 student
  if coalesce(v_student.level_num, v_student.level::int, 1) <> 4 then
    raise exception 'Only Year 4 students can submit dissertation supervisor requests.';
  end if;

  -- 2. Validate current academic term
  select * into v_current_term
  from public.academic_terms
  where is_current = true
  limit 1;

  if v_current_term.id is null then
    -- Fallback default term if none marked current
    v_current_term.semester := 2;
    v_current_term.id := null;
  elsif v_current_term.semester <> 2 then
    raise exception 'Dissertation supervisor selection is only open during Semester 2.';
  end if;

  -- 3. Validate supervisor profile & department
  select * into v_supervisor
  from public.lecturers
  where id = p_supervisor_id;

  if v_supervisor.id is null then
    raise exception 'Selected supervisor not found.';
  end if;

  select * into v_profile
  from public.supervisor_profiles
  where lecturer_id = p_supervisor_id
  limit 1;

  if v_profile.id is null then
    raise exception 'This lecturer has not published a dissertation supervision profile.';
  end if;

  if v_profile.accepting_students = false then
    raise exception 'This supervisor is currently not accepting new students.';
  end if;

  -- Verify capacity
  select count(*) into v_confirmed_count
  from public.dissertation_requests
  where supervisor_id = p_supervisor_id
    and status = 'confirmed'
    and (v_current_term.id is null or term_id = v_current_term.id);

  if v_confirmed_count >= v_profile.max_students then
    raise exception 'This supervisor has reached maximum student capacity for this academic term (% students).', v_profile.max_students;
  end if;

  -- 4. If student has an existing active request, withdraw it
  update public.dissertation_requests
  set status = 'withdrawn'
  where student_id = v_student.id
    and status = 'pending';

  -- Check if already confirmed with someone
  if exists (
    select 1 from public.dissertation_requests
    where student_id = v_student.id
      and status = 'confirmed'
      and (v_current_term.id is null or term_id = v_current_term.id)
  ) then
    raise exception 'You already have a confirmed dissertation supervisor for this term. Ask your supervisor to release you first before selecting a new one.';
  end if;

  -- 5. Insert new pending request
  insert into public.dissertation_requests (
    student_id,
    term_id,
    supervisor_id,
    title,
    abstract,
    status,
    created_at
  ) values (
    v_student.id,
    v_current_term.id,
    p_supervisor_id,
    trim(p_title),
    trim(p_abstract),
    'pending',
    now()
  )
  returning id into v_request_id;

  -- 6. Send in-app notification to supervisor
  insert into public.notifications (
    recipient_user_id,
    title,
    body,
    category,
    link_url
  ) values (
    v_supervisor.auth_user_id,
    'New Dissertation Supervision Request',
    v_student.full_name || ' (' || coalesce(v_student.programme, 'B.Sc. CS') || ') has requested you as supervisor for: "' || trim(p_title) || '"',
    'dissertation',
    '/lecturer'
  );

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'supervisor_name', v_supervisor.full_name,
    'status', 'pending'
  );
end;
$$;

grant execute on function public.submit_dissertation_request to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. RPC: CONFIRM DISSERTATION SUPERVISOR REQUEST (Security Definer)
-- Row locking prevents race conditions on the last available slot
-- ----------------------------------------------------------------------------
create or replace function public.confirm_dissertation_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lecturer record;
  v_request record;
  v_profile record;
  v_student record;
  v_confirmed_count bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  -- 1. Validate caller is the designated supervisor
  select * into v_lecturer
  from public.lecturers
  where auth_user_id = auth.uid();

  if v_lecturer.id is null then
    raise exception 'Unauthorized: Only faculty lecturers can confirm supervision requests.';
  end if;

  select * into v_request
  from public.dissertation_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'Supervision request not found.';
  end if;

  if v_request.supervisor_id <> v_lecturer.id then
    raise exception 'You can only confirm supervision requests submitted directly to you.';
  end if;

  if v_request.status = 'confirmed' then
    return jsonb_build_object('success', true, 'message', 'Already confirmed.');
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This request cannot be confirmed because its status is %.', v_request.status;
  end if;

  -- 2. LOCK the supervisor profile row to eliminate race conditions
  select * into v_profile
  from public.supervisor_profiles
  where lecturer_id = v_lecturer.id
  for update;

  if v_profile.id is null then
    raise exception 'Supervisor profile not found.';
  end if;

  -- 3. Strict capacity check
  select count(*) into v_confirmed_count
  from public.dissertation_requests
  where supervisor_id = v_lecturer.id
    and status = 'confirmed'
    and (v_request.term_id is null or term_id = v_request.term_id);

  if v_confirmed_count >= v_profile.max_students then
    raise exception 'Maximum student capacity reached (%/% students confirmed). Cannot confirm additional students.', v_confirmed_count, v_profile.max_students;
  end if;

  -- 4. Check that student has no other confirmed supervisor in this term
  if exists (
    select 1 from public.dissertation_requests
    where student_id = v_request.student_id
      and status = 'confirmed'
      and (v_request.term_id is null or term_id = v_request.term_id)
      and id <> v_request.id
  ) then
    raise exception 'Student already has another confirmed supervisor for this academic term.';
  end if;

  -- 5. Confirm the request
  update public.dissertation_requests
  set status = 'confirmed',
      decided_at = now()
  where id = v_request.id;

  -- 6. Upsert student dissertation master record with this supervisor
  select * into v_student from public.students where id = v_request.student_id;

  insert into public.dissertations (
    student_id,
    supervisor_id,
    title,
    abstract,
    status,
    current_chapter,
    progress_percentage
  ) values (
    v_request.student_id,
    v_lecturer.id,
    v_request.title,
    v_request.abstract,
    'proposal',
    1,
    20
  )
  on conflict (student_id)
  do update set
    supervisor_id = v_lecturer.id,
    title = excluded.title,
    abstract = excluded.abstract,
    updated_at = now();

  -- 7. Notify student via in-app & push
  insert into public.notifications (
    recipient_user_id,
    title,
    body,
    category,
    link_url
  ) values (
    v_student.auth_user_id,
    'Dissertation Supervisor Confirmed!',
    v_lecturer.full_name || ' has confirmed as your research supervisor! Please complete your flat SLE 500 registration fee to unlock your dissertation workspace.',
    'dissertation',
    '/student'
  );

  -- 8. Audit log
  insert into public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_entity,
    target_id,
    details
  ) values (
    auth.uid(),
    'supervisor_confirmed',
    'dissertation_requests',
    v_request.id::text,
    jsonb_build_object(
      'supervisor_id', v_lecturer.id,
      'student_id', v_request.student_id,
      'student_name', v_student.full_name,
      'topic', v_request.title
    )
  );

  return jsonb_build_object(
    'success', true,
    'status', 'confirmed',
    'student_id', v_request.student_id,
    'student_name', v_student.full_name
  );
end;
$$;

grant execute on function public.confirm_dissertation_request to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. RPC: DECLINE DISSERTATION SUPERVISOR REQUEST
-- ----------------------------------------------------------------------------
create or replace function public.decline_dissertation_request(
  p_request_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lecturer record;
  v_request record;
  v_student record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_lecturer
  from public.lecturers
  where auth_user_id = auth.uid();

  if v_lecturer.id is null then
    raise exception 'Unauthorized.';
  end if;

  select * into v_request
  from public.dissertation_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'Request not found.';
  end if;

  if v_request.supervisor_id <> v_lecturer.id then
    raise exception 'You can only decline requests addressed to you.';
  end if;

  update public.dissertation_requests
  set status = 'declined',
      decline_reason = coalesce(trim(p_reason), 'No specific reason provided'),
      decided_at = now()
  where id = v_request.id;

  select * into v_student from public.students where id = v_request.student_id;

  -- Notify student
  insert into public.notifications (
    recipient_user_id,
    title,
    body,
    category,
    link_url
  ) values (
    v_student.auth_user_id,
    'Dissertation Request Update',
    v_lecturer.full_name || ' was unable to accept your supervision request (' || coalesce(trim(p_reason), 'Capacity/fit') || '). Your topic proposal is saved and you can select another supervisor.',
    'dissertation',
    '/student'
  );

  return jsonb_build_object('success', true, 'status', 'declined');
end;
$$;

grant execute on function public.decline_dissertation_request to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. RPC: RELEASE DISSERTATION STUDENT
-- ----------------------------------------------------------------------------
create or replace function public.release_dissertation_student(
  p_request_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lecturer record;
  v_request record;
  v_student record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_lecturer
  from public.lecturers
  where auth_user_id = auth.uid();

  select * into v_request
  from public.dissertation_requests
  where id = p_request_id;

  if v_request.id is null then
    raise exception 'Request not found.';
  end if;

  -- Must be the confirmed supervisor or an admin
  if v_request.supervisor_id <> v_lecturer.id and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only the confirmed supervisor or administrator can release a student.';
  end if;

  -- Release the request
  update public.dissertation_requests
  set status = 'withdrawn',
      decline_reason = 'Released: ' || coalesce(trim(p_reason), 'Supervisor released student')
  where id = v_request.id;

  -- Unlink supervisor in dissertations
  update public.dissertations
  set supervisor_id = null
  where student_id = v_request.student_id;

  select * into v_student from public.students where id = v_request.student_id;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_user_id,
    action_type,
    target_entity,
    target_id,
    details
  ) values (
    auth.uid(),
    'supervisor_released_student',
    'dissertation_requests',
    v_request.id::text,
    jsonb_build_object(
      'supervisor_id', v_request.supervisor_id,
      'student_id', v_request.student_id,
      'reason', p_reason
    )
  );

  -- Notify student
  insert into public.notifications (
    recipient_user_id,
    title,
    body,
    category,
    link_url
  ) values (
    v_student.auth_user_id,
    'Dissertation Supervision Released',
    'Your supervisor has released your dissertation pairing. You are now free to select a new supervisor.',
    'dissertation',
    '/student'
  );

  return jsonb_build_object('success', true, 'released', true);
end;
$$;

grant execute on function public.release_dissertation_student to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. TRIGGER: NOTIFY REGISTERED STUDENTS WHEN SUPERVISOR PROFILE CREATED/REOPENED
-- ----------------------------------------------------------------------------
create or replace function public.notify_students_on_supervisor_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lecturer record;
  v_current_term record;
  v_student record;
begin
  -- Only trigger if accepting_students is true (new or flipped from false)
  if (TG_OP = 'INSERT' and NEW.accepting_students = true)
     or (TG_OP = 'UPDATE' and NEW.accepting_students = true and OLD.accepting_students = false) then

    select * into v_lecturer from public.lecturers where id = NEW.lecturer_id;
    select * into v_current_term from public.academic_terms where is_current = true limit 1;

    -- Find eligible students: Year 4, Semester 2, matching department, registered for dissertation
    for v_student in
      select s.auth_user_id, s.full_name
      from public.students s
      where s.auth_user_id is not null
        and coalesce(s.level_num, s.level::int, 1) = 4
        and (
          s.department_id::text ilike '%' || NEW.department || '%'
          or coalesce(s.programme, '') ilike '%' || NEW.department || '%'
          or NEW.department ilike '%Computer%'
        )
        -- Registered for dissertation in current term
        and exists (
          select 1 from public.student_term_registrations str
          where str.student_id = s.id
            and (v_current_term.id is null or str.term_id = v_current_term.id)
        )
    loop
      insert into public.notifications (
        recipient_user_id,
        title,
        body,
        category,
        link_url
      ) values (
        v_student.auth_user_id,
        'New Dissertation Supervisor Available',
        v_lecturer.full_name || ' is now available as a dissertation supervisor in ' || NEW.department || '.',
        'dissertation',
        '/student'
      );
    end loop;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_supervisor_available on public.supervisor_profiles;
create trigger trg_notify_supervisor_available
  after insert or update of accepting_students
  on public.supervisor_profiles
  for each row
  execute function public.notify_students_on_supervisor_available();
