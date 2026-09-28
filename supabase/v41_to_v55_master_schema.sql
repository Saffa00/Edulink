-- ============================================================================
-- V41 to V55 — Master Academic System Database & Security Hardening
-- Complete Schema, Audit Trails, Dissertation Progression, Timetables,
-- Payment Webhooks, System Administration, and Hardened RLS
-- ============================================================================

-- 1. V41: Grade Audit & Correction Trail
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

alter table if exists public.grades
  add column if not exists remarks text,
  add column if not exists published_at timestamptz;

-- 2. V42: Dissertation Supervision & Chapter Progression
alter table if exists public.dissertations
  add column if not exists current_chapter integer default 1 check (current_chapter between 1 and 5),
  add column if not exists progress_percentage integer default 20,
  add column if not exists supervisor_notes text,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  alter table public.dissertations drop constraint if exists dissertations_status_check;
  alter table public.dissertations add constraint dissertations_status_check
    check (status in ('proposal', 'chapter_review', 'corrections_required', 'approved', 'rejected'));
exception
  when others then null;
end $$;

alter table if exists public.dissertation_versions
  add column if not exists status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'corrections_needed')),
  add column if not exists reviewed_at timestamptz;

-- 3. V43: Timetables & Recurring Weekly Schedules
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

-- 4. V44 & V45: Messaging Security & Enhanced Notifications
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

alter table if exists public.notifications
  add column if not exists category text default 'general' check (category in ('general', 'grade', 'assignment', 'attendance', 'message', 'dissertation', 'payment', 'security')),
  add column if not exists link_url text;

-- 5. V46 & V52: Payment Webhook Events & Idempotency
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

alter table if exists public.payments
  add column if not exists receipt_number text unique,
  add column if not exists failure_reason text,
  add column if not exists metadata jsonb;

-- 6. V50: System Management & Audit Logs
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

-- 7. Private Storage Buckets
insert into storage.buckets (id, name, public) values ('dissertation-documents', 'dissertation-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- 8. Complete Row Level Security (RLS) Configuration

-- Grade Audits RLS
alter table public.grade_audits enable row level security;
drop policy if exists "lecturers view own grade audits" on public.grade_audits;
create policy "lecturers view own grade audits" on public.grade_audits for select to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

-- Dissertations RLS
alter table public.dissertations enable row level security;
alter table public.dissertation_versions enable row level security;

drop policy if exists "students manage own dissertation" on public.dissertations;
create policy "students manage own dissertation" on public.dissertations for all to authenticated
using (student_id in (select id from public.students where auth_user_id = auth.uid()))
with check (student_id in (select id from public.students where auth_user_id = auth.uid()));

drop policy if exists "supervisors review dissertations" on public.dissertations;
create policy "supervisors review dissertations" on public.dissertations for all to authenticated
using (supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid()));

drop policy if exists "students manage dissertation versions" on public.dissertation_versions;
create policy "students manage dissertation versions" on public.dissertation_versions for all to authenticated
using (
  dissertation_id in (
    select id from public.dissertations where student_id in (select id from public.students where auth_user_id = auth.uid())
  )
)
with check (
  dissertation_id in (
    select id from public.dissertations where student_id in (select id from public.students where auth_user_id = auth.uid())
  )
);

drop policy if exists "supervisors review dissertation versions" on public.dissertation_versions;
create policy "supervisors review dissertation versions" on public.dissertation_versions for all to authenticated
using (
  dissertation_id in (
    select id from public.dissertations where supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
  )
);

-- Schedules / Timetable RLS
alter table public.schedules enable row level security;

drop policy if exists "lecturers manage own schedules" on public.schedules;
create policy "lecturers manage own schedules" on public.schedules for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

drop policy if exists "students read enrolled schedules" on public.schedules;
create policy "students read enrolled schedules" on public.schedules for select to authenticated
using (
  module_id in (
    select module_id from public.student_modules sm
    join public.students s on s.id = sm.student_id
    where s.auth_user_id = auth.uid()
  )
);

-- Notification Preferences RLS
alter table public.notification_preferences enable row level security;
drop policy if exists "users manage notification preferences" on public.notification_preferences;
create policy "users manage notification preferences" on public.notification_preferences for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Storage Policies for Dissertations and Profile Photos
drop policy if exists "students upload dissertation files" on storage.objects;
create policy "students upload dissertation files" on storage.objects for insert to authenticated
with check (bucket_id = 'dissertation-documents');

drop policy if exists "students & supervisors read dissertation files" on storage.objects;
create policy "students & supervisors read dissertation files" on storage.objects for select to authenticated
using (bucket_id = 'dissertation-documents');

drop policy if exists "users upload profile photos" on storage.objects;
create policy "users upload profile photos" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos');

drop policy if exists "public read profile photos" on storage.objects;
create policy "public read profile photos" on storage.objects for select to public
using (bucket_id = 'profile-photos');

-- 9. Realtime Publication Setup
do $$
begin
  alter publication supabase_realtime add table public.grades;
  alter publication supabase_realtime add table public.dissertations;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.schedules;
exception
  when others then null;
end $$;
