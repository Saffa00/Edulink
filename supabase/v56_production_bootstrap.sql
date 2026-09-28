-- ============================================================================
-- V56 — Master Production Database Bootstrap
-- Idempotent setup for Supabase: Tables, Constraints, Indexes, Storage, RLS, and Realtime
-- Covers All Features from V1 through V55
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Academic Organizational Hierarchy
create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(faculty_id, name)
);

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(department_id, name)
);

-- 2. User Profiles (Lecturers & Students)
create table if not exists public.lecturers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  lecturer_id text unique not null,
  full_name text not null,
  email text unique not null,
  phone text,
  faculty_id uuid references public.faculties(id),
  department_id uuid references public.departments(id),
  teaching_area text,
  photo_url text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  student_id text unique not null,
  full_name text not null,
  email text unique not null,
  phone text,
  faculty_id uuid references public.faculties(id),
  department_id uuid references public.departments(id),
  programme_id uuid references public.programmes(id),
  programme text,
  level smallint default 1,
  academic_year text default '2026/2027',
  semester text default 'First Semester',
  registration_type text not null default 'normal' check (registration_type in ('normal', 'dissertation')),
  account_status text not null default 'pending_payment' check (account_status in ('pending_payment', 'active', 'suspended')),
  photo_url text,
  created_at timestamptz default now()
);

-- 3. Device Security & Hardware Binding
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  lecturer_id uuid references public.lecturers(id) on delete cascade,
  device_token_hash text not null,
  device_label text,
  first_registered_at timestamptz default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  check ((student_id is not null) <> (lecturer_id is not null))
);

create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ip_address text,
  user_agent text,
  status text default 'success',
  created_at timestamptz default now()
);

-- 4. Modules & Student Enrollments
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  faculty_id uuid references public.faculties(id),
  department_id uuid references public.departments(id),
  programme_id uuid references public.programmes(id),
  level smallint default 1,
  semester text default 'First Semester',
  lecturer_id uuid references public.lecturers(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.student_modules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  registered_at timestamptz default now(),
  unique(student_id, module_id)
);

-- 5. Classes & GPS Geofenced Attendance
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  class_date date not null,
  start_time time not null,
  end_time time not null,
  location_name text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  radius_meters integer default 100,
  attendance_status text default 'scheduled' check (attendance_status in ('scheduled', 'open', 'closed')),
  opened_at timestamptz,
  closed_at timestamptz,
  late_threshold_minutes integer default 15,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  device_id uuid references public.devices(id),
  marked_at timestamptz default now(),
  latitude numeric(10,7),
  longitude numeric(10,7),
  distance_meters numeric(10,2),
  status text default 'present' check (status in ('present', 'late', 'absent', 'rejected', 'excused')),
  verified boolean default true,
  verification_method text default 'gps_device',
  lecturer_notes text,
  unique(class_id, student_id)
);

-- 6. Coursework Assignments & Submissions
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  max_mark numeric(6,2) default 100,
  attachment_url text,
  brief_file_path text,
  allow_late boolean default true,
  grace_period_hours integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  file_url text,
  submitted_at timestamptz default now(),
  mark numeric(6,2),
  lecturer_comment text,
  status text default 'submitted' check (status in ('submitted', 'late', 'graded', 'needs_revision')),
  version_number integer default 1,
  is_late boolean default false,
  late_duration_minutes integer default 0,
  student_notes text,
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

create table if not exists public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  version_number integer not null,
  file_url text not null,
  student_notes text,
  submitted_at timestamptz default now(),
  unique(submission_id, version_number)
);

-- 7. Individual Grades & Audits (No GPA / CGPA)
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  score numeric(6,2),
  grade text,
  published boolean default false,
  published_at timestamptz,
  remarks text,
  updated_at timestamptz default now(),
  unique(module_id, student_id)
);

create table if not exists public.grade_audits (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  old_score numeric(6,2),
  new_score numeric(6,2),
  old_grade text,
  new_grade text,
  action text not null check (action in ('create', 'update', 'publish', 'unpublish')),
  reason text,
  created_at timestamptz default now()
);

-- 8. Dissertation Supervision & Chapters 1 to 5
create table if not exists public.dissertations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique not null references public.students(id) on delete cascade,
  supervisor_id uuid references public.lecturers(id) on delete set null,
  title text,
  status text default 'proposal' check (status in ('proposal', 'chapter_review', 'corrections_required', 'approved', 'rejected')),
  current_chapter integer default 1 check (current_chapter between 1 and 5),
  progress_percentage integer default 20,
  supervisor_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.dissertation_versions (
  id uuid primary key default gen_random_uuid(),
  dissertation_id uuid not null references public.dissertations(id) on delete cascade,
  chapter text not null,
  version_number integer not null,
  file_url text not null,
  lecturer_comment text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'corrections_needed')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(dissertation_id, chapter, version_number)
);

-- 9. Weekly Schedules / Timetable
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  start_time time not null,
  end_time time not null,
  location_name text not null,
  room_code text,
  semester text,
  academic_year text,
  created_at timestamptz default now()
);

-- 10. Realtime Conversations & Messages
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lecturer_id uuid not null references public.lecturers(id) on delete cascade,
  student_user_id uuid,
  lecturer_user_id uuid,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(module_id, student_id, lecturer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 11. Notifications Hub
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null,
  title text not null,
  body text not null,
  category text default 'general' check (category in ('general', 'grade', 'assignment', 'attendance', 'message', 'dissertation', 'payment', 'security')),
  link_url text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  grades_notify boolean default true,
  assignments_notify boolean default true,
  attendance_notify boolean default true,
  messages_notify boolean default true,
  dissertation_notify boolean default true,
  payments_notify boolean default true,
  updated_at timestamptz default now()
);

-- 12. Monime Payments & Webhook Idempotency
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text default 'SLE',
  payment_type text not null check (payment_type in ('registration', 'dissertation')),
  status text default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  provider text default 'monime',
  provider_reference text unique,
  receipt_number text unique,
  failure_reason text,
  metadata jsonb,
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  provider text not null default 'monime',
  provider_reference text not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'processed' check (status in ('received', 'processed', 'failed', 'duplicate')),
  processed_at timestamptz default now()
);

-- 13. System Administration & Security Logs
create table if not exists public.system_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  event_name text not null,
  target_entity text not null,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- 14. Performance Indexes
create index if not exists idx_modules_lecturer on public.modules(lecturer_id);
create index if not exists idx_student_modules_student on public.student_modules(student_id);
create index if not exists idx_student_modules_module on public.student_modules(module_id);
create index if not exists idx_attendance_student on public.attendance(student_id);
create index if not exists idx_attendance_class on public.attendance(class_id);
create index if not exists idx_assignments_module on public.assignments(module_id);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_grades_student on public.grades(student_id);
create index if not exists idx_grades_module on public.grades(module_id);
create index if not exists idx_dissertations_student on public.dissertations(student_id);
create index if not exists idx_dissertations_supervisor on public.dissertations(supervisor_id);
create index if not exists idx_schedules_module on public.schedules(module_id);
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id);

-- 15. Storage Buckets
insert into storage.buckets (id, name, public) values
  ('assignment-briefs', 'assignment-briefs', false),
  ('assignment-submissions', 'assignment-submissions', false),
  ('dissertation-documents', 'dissertation-documents', false),
  ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- 16. Enable Row Level Security (RLS) On All Tables
alter table public.faculties enable row level security;
alter table public.departments enable row level security;
alter table public.programmes enable row level security;
alter table public.lecturers enable row level security;
alter table public.students enable row level security;
alter table public.devices enable row level security;
alter table public.login_history enable row level security;
alter table public.modules enable row level security;
alter table public.student_modules enable row level security;
alter table public.classes enable row level security;
alter table public.attendance enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_versions enable row level security;
alter table public.grades enable row level security;
alter table public.grade_audits enable row level security;
alter table public.dissertations enable row level security;
alter table public.dissertation_versions enable row level security;
alter table public.schedules enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.system_audit_logs enable row level security;

-- 17. Authenticated RLS Policies

-- Public / Authenticated Read for Catalogues
drop policy if exists "allow read faculties" on public.faculties;
create policy "allow read faculties" on public.faculties for select to authenticated using (true);

drop policy if exists "allow read departments" on public.departments;
create policy "allow read departments" on public.departments for select to authenticated using (true);

drop policy if exists "allow read programmes" on public.programmes;
create policy "allow read programmes" on public.programmes for select to authenticated using (true);

drop policy if exists "allow read modules" on public.modules;
create policy "allow read modules" on public.modules for select to authenticated using (true);

-- Lecturers manage own modules
drop policy if exists "lecturers manage own modules" on public.modules;
create policy "lecturers manage own modules" on public.modules for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

-- Profiles
drop policy if exists "lecturers read own profile" on public.lecturers;
create policy "lecturers read own profile" on public.lecturers for all to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "students read own profile" on public.students;
create policy "students read own profile" on public.students for all to authenticated
using (auth_user_id = auth.uid());

-- Classes & Attendance
drop policy if exists "lecturers manage classes" on public.classes;
create policy "lecturers manage classes" on public.classes for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

drop policy if exists "students read classes" on public.classes;
create policy "students read classes" on public.classes for select to authenticated
using (
  module_id in (select module_id from public.student_modules sm join public.students s on s.id=sm.student_id where s.auth_user_id=auth.uid())
);

drop policy if exists "lecturers manage attendance" on public.attendance;
create policy "lecturers manage attendance" on public.attendance for all to authenticated
using (class_id in (select id from public.classes where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())))
with check (class_id in (select id from public.classes where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())));

drop policy if exists "students read attendance" on public.attendance;
create policy "students read attendance" on public.attendance for select to authenticated
using (student_id in (select id from public.students where auth_user_id = auth.uid()));

-- Assignments & Submissions
drop policy if exists "lecturers manage assignments" on public.assignments;
create policy "lecturers manage assignments" on public.assignments for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

drop policy if exists "students read assignments" on public.assignments;
create policy "students read assignments" on public.assignments for select to authenticated
using (module_id in (select module_id from public.student_modules sm join public.students s on s.id=sm.student_id where s.auth_user_id=auth.uid()));

drop policy if exists "students manage submissions" on public.submissions;
create policy "students manage submissions" on public.submissions for all to authenticated
using (student_id in (select id from public.students where auth_user_id = auth.uid()))
with check (student_id in (select id from public.students where auth_user_id = auth.uid()));

drop policy if exists "lecturers manage submissions" on public.submissions;
create policy "lecturers manage submissions" on public.submissions for all to authenticated
using (assignment_id in (select id from public.assignments where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())))
with check (assignment_id in (select id from public.assignments where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())));

-- Grades & Audits
drop policy if exists "lecturers manage grades" on public.grades;
create policy "lecturers manage grades" on public.grades for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

drop policy if exists "students read published grades" on public.grades;
create policy "students read published grades" on public.grades for select to authenticated
using (student_id in (select id from public.students where auth_user_id = auth.uid()) and published = true);

-- Realtime Publications
do $$
begin
  alter publication supabase_realtime add table public.attendance;
  alter publication supabase_realtime add table public.classes;
  alter publication supabase_realtime add table public.submissions;
  alter publication supabase_realtime add table public.assignments;
  alter publication supabase_realtime add table public.grades;
  alter publication supabase_realtime add table public.dissertations;
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
exception
  when others then null;
end $$;
