-- ============================================================================
-- V59 — Multi-Campus Offerings, Strict Role/Offering RLS, OneSignal Push
-- Webhooks, and Africa/Freetown Weekly Class-Start Reminders (Tasks 2, 3, 4, 5)
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TASK 2 & 3.1: Campuses, Profiles, Lecturer Campuses, Module Offerings,
--               Enrollments, and Course Materials
-- ============================================================================

-- 1. Campuses Table
create table if not exists public.campuses (
  id text primary key,
  name text unique not null,
  code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz default now()
);

insert into public.campuses (id, name, code, latitude, longitude)
values
  ('goderich', 'Goderich Campus', 'GOD', 8.4319400, -13.2897200),
  ('congo-cross', 'Congo Cross Campus', 'CCX', 8.4775000, -13.2627800),
  ('brookfields', 'Brookfields Campus', 'BRK', 8.4722200, -13.2455600)
on conflict (id) do update
set name = excluded.name,
    code = excluded.code,
    latitude = excluded.latitude,
    longitude = excluded.longitude;

-- 2. Many-to-Many Lecturer Campuses Table
create table if not exists public.lecturer_campuses (
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  campus_id text not null references public.campuses(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (lecturer_id, campus_id)
);

-- 3. Student Campus Column & Unified Profiles Table (Role Source of Truth)
alter table if exists public.students
  add column if not exists campus_id text references public.campuses(id) default 'goderich';

create table if not exists public.profiles (
  id uuid primary key,
  role text not null check (role in ('student', 'lecturer', 'admin')),
  campus_id text references public.campuses(id),
  student_id uuid references public.students(id) on delete cascade,
  lecturer_id uuid references public.lecturers(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sync existing students & lecturers into public.profiles
insert into public.profiles (id, role, campus_id, student_id, full_name, email)
select
  s.auth_user_id,
  'student',
  coalesce(s.campus_id, 'goderich'),
  s.id,
  s.full_name,
  s.email
from public.students s
where s.auth_user_id is not null
on conflict (id) do update
set role = 'student',
    campus_id = coalesce(excluded.campus_id, public.profiles.campus_id, 'goderich'),
    student_id = excluded.student_id,
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

insert into public.profiles (id, role, lecturer_id, full_name, email)
select
  l.auth_user_id,
  'lecturer',
  l.id,
  l.full_name,
  l.email
from public.lecturers l
where l.auth_user_id is not null
  and not exists (select 1 from public.students s where s.auth_user_id = l.auth_user_id)
on conflict (id) do update
set role = 'lecturer',
    lecturer_id = excluded.lecturer_id,
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

-- Trigger to keep public.profiles automatically synced when students/lecturers are created or updated
create or replace function public.sync_profile_from_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is not null then
    insert into public.profiles (id, role, campus_id, student_id, full_name, email, updated_at)
    values (new.auth_user_id, 'student', coalesce(new.campus_id, 'goderich'), new.id, new.full_name, new.email, now())
    on conflict (id) do update
    set role = 'student',
        campus_id = coalesce(excluded.campus_id, 'goderich'),
        student_id = excluded.student_id,
        full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_student on public.students;
create trigger trg_sync_profile_student
after insert or update on public.students
for each row execute function public.sync_profile_from_student();

create or replace function public.sync_profile_from_lecturer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is not null then
    insert into public.profiles (id, role, lecturer_id, full_name, email, updated_at)
    values (new.auth_user_id, 'lecturer', new.id, new.full_name, new.email, now())
    on conflict (id) do update
    set role = case when public.profiles.role = 'admin' then 'admin' else 'lecturer' end,
        lecturer_id = excluded.lecturer_id,
        full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_lecturer on public.lecturers;
create trigger trg_sync_profile_lecturer
after insert or update on public.lecturers
for each row execute function public.sync_profile_from_lecturer();

-- 4. Module Offerings Table (Module + Campus + Academic Year + Semester + Price)
create table if not exists public.module_offerings (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  campus_id text not null references public.campuses(id) on delete cascade,
  lecturer_id uuid references public.lecturers(id) on delete set null,
  academic_year text not null default '2026/2027',
  semester text not null default 'First Semester',
  price numeric(12,2) not null default 100.00,
  active boolean default true,
  created_at timestamptz default now(),
  unique (module_id, campus_id, academic_year, semester)
);

-- 5. Enrollments Table (Student -> Offering)
create table if not exists public.enrollments (
  student_id uuid not null references public.students(id) on delete cascade,
  offering_id uuid not null references public.module_offerings(id) on delete cascade,
  enrolled_at timestamptz default now(),
  primary key (student_id, offering_id)
);

-- 6. Course Materials & Multi-Campus Announcements Table
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.module_offerings(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  campus_id text references public.campuses(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  is_announcement boolean default false,
  created_at timestamptz default now()
);

-- 7. Attach offering_id and campus_id to Attendance/Classes, Assignments, Grades, Schedules, and Payments
alter table if exists public.classes
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null,
  add column if not exists campus_id text references public.campuses(id) default 'goderich';

alter table if exists public.attendance
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null;

alter table if exists public.assignments
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null,
  add column if not exists campus_id text references public.campuses(id) default 'goderich';

alter table if exists public.grades
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null,
  add column if not exists campus_id text references public.campuses(id) default 'goderich';

alter table if exists public.schedules
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null,
  add column if not exists campus_id text references public.campuses(id) default 'goderich',
  add column if not exists day_of_week_num smallint check (day_of_week_num between 1 and 7),
  add column if not exists room text;

alter table if exists public.payments
  add column if not exists offering_id uuid references public.module_offerings(id) on delete set null,
  add column if not exists campus_id text references public.campuses(id) default 'goderich';

-- 8. Migrate Existing Data into Multi-Campus Structure (Idempotent)
-- Link existing lecturers to all three campuses so multi-campus teaching works immediately
insert into public.lecturer_campuses (lecturer_id, campus_id)
select l.id, c.id
from public.lecturers l
cross join public.campuses c
on conflict (lecturer_id, campus_id) do nothing;

-- Create module_offerings for existing modules across campuses
insert into public.module_offerings (module_id, campus_id, lecturer_id, academic_year, semester, price)
select
  m.id,
  c.id,
  m.lecturer_id,
  '2026/2027',
  coalesce(m.semester, 'First Semester'),
  100.00
from public.modules m
cross join public.campuses c
on conflict (module_id, campus_id, academic_year, semester) do update
set lecturer_id = coalesce(public.module_offerings.lecturer_id, excluded.lecturer_id);

-- Migrate existing student_modules into enrollments matched to the student's campus offering
insert into public.enrollments (student_id, offering_id, enrolled_at)
select
  sm.student_id,
  mo.id,
  sm.registered_at
from public.student_modules sm
join public.students s on s.id = sm.student_id
join public.module_offerings mo
  on mo.module_id = sm.module_id
 and mo.campus_id = coalesce(s.campus_id, 'goderich')
on conflict (student_id, offering_id) do nothing;

-- Keep enrollments automatically synced when student_modules are inserted
create or replace function public.sync_enrollment_from_student_module()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campus_id text;
  v_offering_id uuid;
begin
  select coalesce(campus_id, 'goderich') into v_campus_id
  from public.students where id = new.student_id;

  select id into v_offering_id
  from public.module_offerings
  where module_id = new.module_id
    and campus_id = coalesce(v_campus_id, 'goderich')
  order by created_at desc
  limit 1;

  if v_offering_id is not null then
    insert into public.enrollments (student_id, offering_id, enrolled_at)
    values (new.student_id, v_offering_id, coalesce(new.registered_at, now()))
    on conflict (student_id, offering_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_enrollment_student_module on public.student_modules;
create trigger trg_sync_enrollment_student_module
after insert on public.student_modules
for each row execute function public.sync_enrollment_from_student_module();

-- Backfill offering_id on classes, assignments, grades, schedules, payments
update public.classes cl
set offering_id = mo.id
from public.module_offerings mo
where cl.offering_id is null
  and mo.module_id = cl.module_id
  and mo.campus_id = coalesce(cl.campus_id, 'goderich');

update public.attendance att
set offering_id = cl.offering_id
from public.classes cl
where att.offering_id is null
  and att.class_id = cl.id;

update public.assignments a
set offering_id = mo.id
from public.module_offerings mo
where a.offering_id is null
  and mo.module_id = a.module_id
  and mo.campus_id = coalesce(a.campus_id, 'goderich');

update public.grades g
set campus_id = coalesce(s.campus_id, 'goderich'),
    offering_id = mo.id
from public.students s
join public.module_offerings mo on mo.campus_id = coalesce(s.campus_id, 'goderich')
where g.offering_id is null
  and g.student_id = s.id
  and mo.module_id = g.module_id;

update public.schedules sch
set offering_id = mo.id,
    room = coalesce(sch.room, sch.room_code, sch.location_name),
    day_of_week_num = case lower(trim(sch.day_of_week))
      when '1' then 1 when 'monday' then 1
      when '2' then 2 when 'tuesday' then 2
      when '3' then 3 when 'wednesday' then 3
      when '4' then 4 when 'thursday' then 4
      when '5' then 5 when 'friday' then 5
      when '6' then 6 when 'saturday' then 6
      when '7' then 7 when 'sunday' then 7
      else 1
    end
from public.module_offerings mo
where mo.module_id = sch.module_id
  and mo.campus_id = coalesce(sch.campus_id, 'goderich');

update public.payments p
set campus_id = coalesce(s.campus_id, 'goderich'),
    offering_id = (
      select e.offering_id
      from public.enrollments e
      where e.student_id = p.student_id
      limit 1
    )
from public.students s
where p.student_id = s.id
  and p.offering_id is null;

-- Normalize day_of_week_num and room automatically on schedule insert/update
create or replace function public.normalize_schedule_fields()
returns trigger
language plpgsql
as $$
begin
  new.room := coalesce(new.room, new.room_code, new.location_name, 'TBA');
  new.day_of_week_num := case lower(trim(coalesce(new.day_of_week, 'monday')))
    when '1' then 1 when 'monday' then 1
    when '2' then 2 when 'tuesday' then 2
    when '3' then 3 when 'wednesday' then 3
    when '4' then 4 when 'thursday' then 4
    when '5' then 5 when 'friday' then 5
    when '6' then 6 when 'saturday' then 6
    when '7' then 7 when 'sunday' then 7
    else coalesce(new.day_of_week_num, 1)
  end;
  if new.offering_id is null and new.module_id is not null then
    select id into new.offering_id
    from public.module_offerings
    where module_id = new.module_id
      and campus_id = coalesce(new.campus_id, 'goderich')
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_schedule_fields on public.schedules;
create trigger trg_normalize_schedule_fields
before insert or update on public.schedules
for each row execute function public.normalize_schedule_fields();

-- ============================================================================
-- TASK 3.4: Timetable Overlap & Cross-Campus Travel Warning Helper Function
-- ============================================================================
create or replace function public.check_lecturer_timetable_conflicts(
  p_lecturer_id uuid,
  p_day_of_week_num smallint,
  p_start_time time,
  p_end_time time,
  p_campus_id text,
  p_exclude_slot_id uuid default null
)
returns table (
  conflict_type text,
  conflicting_slot_id uuid,
  module_code text,
  campus_id text,
  start_time time,
  end_time time,
  message text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when (p_start_time < s.end_time and p_end_time > s.start_time) then 'OVERLAP'
      when coalesce(s.campus_id, 'goderich') <> coalesce(p_campus_id, 'goderich')
           and (
             abs(extract(epoch from (p_start_time - s.end_time)) / 60) < 45
             or abs(extract(epoch from (s.start_time - p_end_time)) / 60) < 45
           ) then 'CROSS_CAMPUS_BACK_TO_BACK'
      else 'NONE'
    end as conflict_type,
    s.id as conflicting_slot_id,
    m.code as module_code,
    coalesce(s.campus_id, 'goderich') as campus_id,
    s.start_time,
    s.end_time,
    case
      when (p_start_time < s.end_time and p_end_time > s.start_time)
        then format('Time overlap with %s (%s - %s) at %s', m.code, s.start_time::text, s.end_time::text, coalesce(s.campus_id, 'goderich'))
      else format('Back-to-back cross-campus warning: %s (%s - %s) is at %s with less than 45 min travel buffer', m.code, s.start_time::text, s.end_time::text, coalesce(s.campus_id, 'goderich'))
    end as message
  from public.schedules s
  left join public.modules m on m.id = s.module_id
  where s.lecturer_id = p_lecturer_id
    and s.day_of_week_num = p_day_of_week_num
    and (p_exclude_slot_id is null or s.id <> p_exclude_slot_id)
    and (
      (p_start_time < s.end_time and p_end_time > s.start_time)
      or (
        coalesce(s.campus_id, 'goderich') <> coalesce(p_campus_id, 'goderich')
        and (
          abs(extract(epoch from (p_start_time - s.end_time)) / 60) < 45
          or abs(extract(epoch from (s.start_time - p_end_time)) / 60) < 45
        )
      )
    );
$$;

grant execute on function public.check_lecturer_timetable_conflicts(uuid, smallint, time, time, text, uuid) to authenticated;

-- ============================================================================
-- TASK 4: Notifications Schema, Preferences, & DB Webhook Triggers
-- ============================================================================

-- Ensure notifications table has (user_id, type, title, body, url, read, created_at)
-- while keeping compatibility with (recipient_user_id, category, link_url, read_at)
alter table if exists public.notifications
  add column if not exists user_id uuid,
  add column if not exists type text default 'general',
  add column if not exists url text,
  add column if not exists read boolean default false;

update public.notifications
set user_id = coalesce(user_id, recipient_user_id),
    type = coalesce(type, category, 'general'),
    url = coalesce(url, link_url),
    read = (read_at is not null or coalesce(read, false));

create or replace function public.sync_notification_columns()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(new.user_id, new.recipient_user_id);
  new.recipient_user_id := coalesce(new.recipient_user_id, new.user_id);
  new.type := coalesce(new.type, new.category, 'general');
  new.category := case
    when coalesce(new.category, new.type) in ('general', 'grade', 'assignment', 'attendance', 'message', 'dissertation', 'payment', 'security')
      then coalesce(new.category, new.type)
    else 'general'
  end;
  new.url := coalesce(new.url, new.link_url);
  new.link_url := coalesce(new.link_url, new.url);
  if new.read_at is not null then
    new.read := true;
  elsif new.read = true and new.read_at is null then
    new.read_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_notification_columns on public.notifications;
create trigger trg_sync_notification_columns
before insert or update on public.notifications
for each row execute function public.sync_notification_columns();

-- Ensure notification_preferences has class_reminders_notify alongside grades_notify & assignments_notify
alter table if exists public.notification_preferences
  add column if not exists class_reminders_notify boolean default true;

-- 4a. Grade Posted Trigger: Notify student without exposing score on lock screen
--     ("Your grade for <module> is available")
create or replace function public.handle_grade_posted_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_auth_id uuid;
  v_module_code text;
  v_grades_notify boolean := true;
begin
  if (tg_op = 'INSERT' and new.published = true)
     or (tg_op = 'UPDATE' and new.published = true and coalesce(old.published, false) = false) then

    select s.auth_user_id into v_student_auth_id
    from public.students s
    where s.id = new.student_id;

    if v_student_auth_id is null then
      return new;
    end if;

    select coalesce(np.grades_notify, true) into v_grades_notify
    from public.notification_preferences np
    where np.user_id = v_student_auth_id;

    select coalesce(m.code, 'your module') into v_module_code
    from public.modules m
    where m.id = new.module_id;

    if coalesce(v_grades_notify, true) then
      insert into public.notifications (
        user_id, recipient_user_id, type, category, title, body, url, link_url, read
      ) values (
        v_student_auth_id,
        v_student_auth_id,
        'grade',
        'grade',
        format('Grade Available: %s', v_module_code),
        format('Your grade for %s is available', v_module_code),
        '/student?page=grades',
        'grades',
        false
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grade_posted_notification on public.grades;
create trigger trg_grade_posted_notification
after insert or update of published on public.grades
for each row execute function public.handle_grade_posted_notification();

-- 4b. Assignment Posted Trigger (with 1-hour batching support):
--     Notifies all enrolled students in that offering
create or replace function public.handle_assignment_posted_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_code text;
  v_recent_count integer := 0;
  v_title text;
  v_body text;
  v_due_str text;
begin
  select coalesce(m.code, 'Module') into v_module_code
  from public.modules m
  where m.id = new.module_id;

  -- Check how many assignments were posted in the same hour for this module/offering (Task 4.7)
  select count(*) into v_recent_count
  from public.assignments a
  where a.module_id = new.module_id
    and coalesce(a.campus_id, 'goderich') = coalesce(new.campus_id, 'goderich')
    and a.created_at >= (now() - interval '1 hour');

  v_due_str := to_char(new.due_at at time zone 'Africa/Freetown', 'Mon DD, HH12:MI AM');

  if v_recent_count > 1 then
    v_title := format('%s: %s New Assignments', v_module_code, v_recent_count);
    v_body := format('%s assignments posted this hour (latest: %s, due %s)', v_recent_count, new.title, v_due_str);
  else
    v_title := format('New Assignment: %s', v_module_code);
    v_body := format('%s — Due %s', new.title, v_due_str);
  end if;

  insert into public.notifications (
    user_id, recipient_user_id, type, category, title, body, url, link_url, read
  )
  select distinct
    s.auth_user_id,
    s.auth_user_id,
    'assignment',
    'assignment',
    v_title,
    v_body,
    '/student?page=assignments',
    'assignments',
    false
  from public.students s
  left join public.enrollments e on e.student_id = s.id
  left join public.student_modules sm on sm.student_id = s.id
  left join public.notification_preferences np on np.user_id = s.auth_user_id
  where s.auth_user_id is not null
    and coalesce(np.assignments_notify, true) = true
    and (
      (new.offering_id is not null and e.offering_id = new.offering_id)
      or (sm.module_id = new.module_id and coalesce(s.campus_id, 'goderich') = coalesce(new.campus_id, 'goderich'))
    );

  return new;
end;
$$;

drop trigger if exists trg_assignment_posted_notification on public.assignments;
create trigger trg_assignment_posted_notification
after insert on public.assignments
for each row execute function public.handle_assignment_posted_notification();

-- ============================================================================
-- TASK 5: Weekly Class-Start Reminders (Africa/Freetown Timezone)
-- ============================================================================

-- 5.1 Reminder Log, Class Cancellations, Semesters, and Public Holidays Tables
create table if not exists public.class_reminders_sent (
  timetable_id uuid not null references public.schedules(id) on delete cascade,
  class_date date not null,
  sent_at timestamptz not null default now(),
  primary key (timetable_id, class_date)
);

create table if not exists public.class_cancellations (
  timetable_id uuid not null references public.schedules(id) on delete cascade,
  class_date date not null,
  reason text,
  cancelled_by uuid,
  created_at timestamptz not null default now(),
  primary key (timetable_id, class_date)
);

create table if not exists public.post_class_attendance_prompts_sent (
  timetable_id uuid not null references public.schedules(id) on delete cascade,
  class_date date not null,
  sent_at timestamptz not null default now(),
  primary key (timetable_id, class_date)
);

create table if not exists public.academic_semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  semester text not null,
  start_date date not null,
  end_date date not null,
  active boolean default true,
  unique (academic_year, semester)
);

insert into public.academic_semesters (academic_year, semester, start_date, end_date, active)
values
  ('2026/2027', 'First Semester', '2026-09-01', '2027-02-28', true),
  ('2026/2027', 'Second Semester', '2027-03-01', '2027-07-31', true)
on conflict (academic_year, semester) do nothing;

create table if not exists public.public_holidays (
  holiday_date date primary key,
  name text not null
);

insert into public.public_holidays (holiday_date, name)
values
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Boxing Day'),
  ('2027-01-01', 'New Year''s Day'),
  ('2027-04-27', 'Sierra Leone Independence Day')
on conflict (holiday_date) do nothing;

-- 5.2 SQL Function: classes_due_for_reminder() in Africa/Freetown Timezone
-- Verified: day_of_week_num uses ISO DOW (Monday = 1 .. Sunday = 7), matching extract(isodow from today)::int.
create or replace function public.classes_due_for_reminder()
returns table (
  timetable_id uuid,
  offering_id uuid,
  module_id uuid,
  module_code text,
  module_title text,
  room text,
  campus_id text,
  campus_name text,
  lecturer_id uuid,
  lecturer_auth_id uuid,
  class_date date,
  day_of_week int,
  start_time time,
  end_time time
)
language sql
stable
security definer
set search_path = public
as $$
  with freetown_clock as (
    select
      (now() at time zone 'Africa/Freetown')::date as today_date,
      (now() at time zone 'Africa/Freetown')::time as now_time,
      extract(isodow from (now() at time zone 'Africa/Freetown'))::int as today_isodow
  )
  select
    s.id as timetable_id,
    s.offering_id,
    s.module_id,
    coalesce(m.code, 'MODULE') as module_code,
    coalesce(m.title, 'Lecture') as module_title,
    coalesce(s.room, s.room_code, s.location_name, 'Main Hall') as room,
    coalesce(s.campus_id, 'goderich') as campus_id,
    coalesce(c.name, 'Goderich Campus') as campus_name,
    s.lecturer_id,
    l.auth_user_id as lecturer_auth_id,
    fc.today_date as class_date,
    coalesce(
      s.day_of_week_num::int,
      case lower(trim(s.day_of_week))
        when '1' then 1 when 'monday' then 1
        when '2' then 2 when 'tuesday' then 2
        when '3' then 3 when 'wednesday' then 3
        when '4' then 4 when 'thursday' then 4
        when '5' then 5 when 'friday' then 5
        when '6' then 6 when 'saturday' then 6
        when '7' then 7 when 'sunday' then 7
        else 1
      end
    ) as day_of_week,
    s.start_time,
    s.end_time
  from public.schedules s
  cross join freetown_clock fc
  left join public.modules m on m.id = s.module_id
  left join public.campuses c on c.id = coalesce(s.campus_id, 'goderich')
  left join public.lecturers l on l.id = s.lecturer_id
  where
    -- 1. Must be within active semester dates (Task 5.5)
    exists (
      select 1 from public.academic_semesters sem
      where sem.active = true
        and fc.today_date between sem.start_date and sem.end_date
    )
    -- 2. Skip public holidays (Task 5.5)
    and not exists (
      select 1 from public.public_holidays ph
      where ph.holiday_date = fc.today_date
    )
    -- 3. Match today's ISO day of week (Monday = 1 .. Sunday = 7)
    and coalesce(
      s.day_of_week_num::int,
      case lower(trim(s.day_of_week))
        when '1' then 1 when 'monday' then 1
        when '2' then 2 when 'tuesday' then 2
        when '3' then 3 when 'wednesday' then 3
        when '4' then 4 when 'thursday' then 4
        when '5' then 5 when 'friday' then 5
        when '6' then 6 when 'saturday' then 6
        when '7' then 7 when 'sunday' then 7
        else 1
      end
    ) = fc.today_isodow
    -- 4. start_time is 25 to 35 minutes from now in Africa/Freetown time
    and s.start_time between (fc.now_time + interval '25 minutes') and (fc.now_time + interval '35 minutes')
    -- 5. Not already sent today
    and not exists (
      select 1 from public.class_reminders_sent crs
      where crs.timetable_id = s.id
        and crs.class_date = fc.today_date
    )
    -- 6. Not cancelled today
    and not exists (
      select 1 from public.class_cancellations cc
      where cc.timetable_id = s.id
        and cc.class_date = fc.today_date
    );
$$;

grant execute on function public.classes_due_for_reminder() to authenticated, service_role;

-- 5.7 SQL Function: classes_ended_due_for_attendance_prompt()
--     After a class ends (end_time), optionally prompt the lecturer: "Take attendance for <module>?"
create or replace function public.classes_ended_due_for_attendance_prompt()
returns table (
  timetable_id uuid,
  module_id uuid,
  module_code text,
  lecturer_id uuid,
  lecturer_auth_id uuid,
  class_date date,
  end_time time
)
language sql
stable
security definer
set search_path = public
as $$
  with freetown_clock as (
    select
      (now() at time zone 'Africa/Freetown')::date as today_date,
      (now() at time zone 'Africa/Freetown')::time as now_time,
      extract(isodow from (now() at time zone 'Africa/Freetown'))::int as today_isodow
  )
  select
    s.id as timetable_id,
    s.module_id,
    coalesce(m.code, 'MODULE') as module_code,
    s.lecturer_id,
    l.auth_user_id as lecturer_auth_id,
    fc.today_date as class_date,
    s.end_time
  from public.schedules s
  cross join freetown_clock fc
  left join public.modules m on m.id = s.module_id
  left join public.lecturers l on l.id = s.lecturer_id
  where
    l.auth_user_id is not null
    and exists (
      select 1 from public.academic_semesters sem
      where sem.active = true
        and fc.today_date between sem.start_date and sem.end_date
    )
    and not exists (
      select 1 from public.public_holidays ph
      where ph.holiday_date = fc.today_date
    )
    and coalesce(s.day_of_week_num::int, 1) = fc.today_isodow
    and fc.now_time between s.end_time and (s.end_time + interval '15 minutes')
    and not exists (
      select 1 from public.post_class_attendance_prompts_sent p
      where p.timetable_id = s.id
        and p.class_date = fc.today_date
    )
    and not exists (
      select 1 from public.class_cancellations cc
      where cc.timetable_id = s.id
        and cc.class_date = fc.today_date
    );
$$;

grant execute on function public.classes_ended_due_for_attendance_prompt() to authenticated, service_role;

-- 5.6 Trigger on Class Cancellation: Immediately notify enrolled students "<module> at <time> is cancelled"
create or replace function public.handle_class_cancellation_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_code text;
  v_module_id uuid;
  v_offering_id uuid;
  v_campus_id text;
  v_start_time text;
begin
  select
    coalesce(m.code, 'Class'),
    s.module_id,
    s.offering_id,
    coalesce(s.campus_id, 'goderich'),
    to_char(s.start_time, 'HH24:MI')
  into v_module_code, v_module_id, v_offering_id, v_campus_id, v_start_time
  from public.schedules s
  left join public.modules m on m.id = s.module_id
  where s.id = new.timetable_id;

  insert into public.notifications (
    user_id, recipient_user_id, type, category, title, body, url, link_url, read
  )
  select distinct
    st.auth_user_id,
    st.auth_user_id,
    'attendance',
    'attendance',
    format('%s at %s is cancelled', v_module_code, v_start_time),
    case
      when new.reason is not null and length(trim(new.reason)) > 0
        then format('%s at %s (%s) is cancelled. Reason: %s', v_module_code, v_start_time, new.class_date::text, new.reason)
      else format('%s at %s (%s) is cancelled.', v_module_code, v_start_time, new.class_date::text)
    end,
    '/student?page=timetable',
    'timetable',
    false
  from public.students st
  left join public.enrollments e on e.student_id = st.id
  left join public.student_modules sm on sm.student_id = st.id
  where st.auth_user_id is not null
    and (
      (v_offering_id is not null and e.offering_id = v_offering_id)
      or (sm.module_id = v_module_id and coalesce(st.campus_id, 'goderich') = v_campus_id)
    );

  return new;
end;
$$;

drop trigger if exists trg_class_cancellation_notification on public.class_cancellations;
create trigger trg_class_cancellation_notification
after insert on public.class_cancellations
for each row execute function public.handle_class_cancellation_notification();

-- 5.4 Schedule send-class-reminders with pg_cron + pg_net every 5 minutes (06:00-20:00 Mon-Sat)
--     Reads the secret from Supabase Vault (vault.decrypted_secrets) — never stored in plain SQL.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.schedule(
      'edulink-send-class-reminders',
      '*/5 6-20 * * 1-6',
      $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_functions_url' limit 1) || '/send-class-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  end if;
exception
  when others then null;
end $$;

-- ============================================================================
-- TASK 2.4 & 3.6: Complete Row Level Security (RLS) for All New & Existing Tables
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.campuses enable row level security;
alter table public.profiles enable row level security;
alter table public.lecturer_campuses enable row level security;
alter table public.module_offerings enable row level security;
alter table public.enrollments enable row level security;
alter table public.materials enable row level security;
alter table public.class_reminders_sent enable row level security;
alter table public.class_cancellations enable row level security;
alter table public.post_class_attendance_prompts_sent enable row level security;
alter table public.academic_semesters enable row level security;
alter table public.public_holidays enable row level security;

-- Campuses, Semesters, Holidays: readable by all authenticated users
drop policy if exists "allow read campuses" on public.campuses;
create policy "allow read campuses" on public.campuses for select to authenticated using (true);

drop policy if exists "allow read academic semesters" on public.academic_semesters;
create policy "allow read academic semesters" on public.academic_semesters for select to authenticated using (true);

drop policy if exists "allow read public holidays" on public.public_holidays;
create policy "allow read public holidays" on public.public_holidays for select to authenticated using (true);

-- Profiles: users read own profile; admins read all
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Lecturer Campuses: lecturers/students can read; ONLY admins can link a lecturer to a campus (Task 3.6)
drop policy if exists "read lecturer campuses" on public.lecturer_campuses;
create policy "read lecturer campuses" on public.lecturer_campuses for select to authenticated using (true);

drop policy if exists "only admins manage lecturer campuses" on public.lecturer_campuses;
create policy "only admins manage lecturer campuses" on public.lecturer_campuses for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Module Offerings: Lecturer accesses offering only if assigned; students only through enrollment or own campus (Task 3.5 & 3.6)
drop policy if exists "lecturers access own offerings" on public.module_offerings;
create policy "lecturers access own offerings" on public.module_offerings for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

drop policy if exists "students read own campus offerings" on public.module_offerings;
create policy "students read own campus offerings" on public.module_offerings for select to authenticated
using (
  public.is_student()
  and (
    id in (
      select e.offering_id from public.enrollments e
      join public.students s on s.id = e.student_id
      where s.auth_user_id = auth.uid()
    )
    or campus_id in (
      select coalesce(s.campus_id, 'goderich') from public.students s
      where s.auth_user_id = auth.uid()
    )
  )
);

-- Enrollments: Students read/manage own enrollments; Lecturers read enrollments for their offerings
drop policy if exists "students access own enrollments" on public.enrollments;
create policy "students access own enrollments" on public.enrollments for all to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
)
with check (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists "lecturers read offering enrollments" on public.enrollments;
create policy "lecturers read offering enrollments" on public.enrollments for select to authenticated
using (
  public.is_lecturer()
  and offering_id in (
    select mo.id from public.module_offerings mo
    join public.lecturers l on l.id = mo.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

-- Materials: Lecturer manages own offering materials; Students read materials ONLY for their enrolled offering & campus (Task 3.5 & 3.6)
drop policy if exists "lecturers manage offering materials" on public.materials;
create policy "lecturers manage offering materials" on public.materials for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

drop policy if exists "students read enrolled offering materials" on public.materials;
create policy "students read enrolled offering materials" on public.materials for select to authenticated
using (
  public.is_student()
  and (
    offering_id in (
      select e.offering_id from public.enrollments e
      join public.students s on s.id = e.student_id
      where s.auth_user_id = auth.uid()
    )
    or (
      module_id in (
        select sm.module_id from public.student_modules sm
        join public.students s on s.id = sm.student_id
        where s.auth_user_id = auth.uid()
      )
      and coalesce(campus_id, 'goderich') in (
        select coalesce(s.campus_id, 'goderich') from public.students s
        where s.auth_user_id = auth.uid()
      )
    )
  )
);

-- Class Cancellations & Reminders Sent RLS
drop policy if exists "lecturers manage class cancellations" on public.class_cancellations;
create policy "lecturers manage class cancellations" on public.class_cancellations for all to authenticated
using (
  public.is_lecturer()
  and timetable_id in (
    select s.id from public.schedules s
    join public.lecturers l on l.id = s.lecturer_id
    where l.auth_user_id = auth.uid()
  )
)
with check (
  public.is_lecturer()
  and timetable_id in (
    select s.id from public.schedules s
    join public.lecturers l on l.id = s.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

drop policy if exists "students read class cancellations" on public.class_cancellations;
create policy "students read class cancellations" on public.class_cancellations for select to authenticated
using (public.is_student());

drop policy if exists "lecturers read class reminders sent" on public.class_reminders_sent;
create policy "lecturers read class reminders sent" on public.class_reminders_sent for select to authenticated
using (public.is_lecturer());

-- Notifications RLS (Users read/update their own notifications)
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated
using (user_id = auth.uid() or recipient_user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications for update to authenticated
using (user_id = auth.uid() or recipient_user_id = auth.uid())
with check (user_id = auth.uid() or recipient_user_id = auth.uid());

drop policy if exists "lecturers insert student notifications" on public.notifications;
create policy "lecturers insert student notifications" on public.notifications for insert to authenticated
with check (public.is_lecturer() or user_id = auth.uid() or recipient_user_id = auth.uid());
