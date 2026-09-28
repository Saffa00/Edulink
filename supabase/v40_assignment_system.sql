-- ============================================================================
-- V40 — Complete Assignment System
-- Schema Enhancements, Submission Versions, Grading Controls, and Storage
-- ============================================================================

-- 1. Enhance assignments table for late policies and brief file attachments
alter table if exists public.assignments
  add column if not exists allow_late boolean default true,
  add column if not exists grace_period_hours integer default 0,
  add column if not exists brief_file_path text;

-- 2. Enhance submissions table for versioning, late duration, and grading timestamps
alter table if exists public.submissions
  add column if not exists version_number integer default 1,
  add column if not exists is_late boolean default false,
  add column if not exists late_duration_minutes integer default 0,
  add column if not exists student_notes text,
  add column if not exists graded_at timestamptz;

-- Update status constraint on submissions
do $$
begin
  alter table public.submissions drop constraint if exists submissions_status_check;
  alter table public.submissions add constraint submissions_status_check
    check (status in ('submitted', 'late', 'graded', 'needs_revision'));
exception
  when others then null;
end $$;

-- 3. Create submission_versions table for complete resubmission audit history
create table if not exists public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  version_number integer not null,
  file_url text not null,
  student_notes text,
  submitted_at timestamptz default now(),
  unique(submission_id, version_number)
);

-- Enable RLS on submission_versions
alter table if exists public.submission_versions enable row level security;

-- 4. RLS Policies for Submissions & Submission Versions

-- Lecturers can select and update submissions for their own assignments (for grading/feedback)
drop policy if exists "lecturers manage submissions for own assignments" on public.submissions;
create policy "lecturers manage submissions for own assignments" on public.submissions for all to authenticated
using (
  assignment_id in (
    select id from public.assignments
    where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
  )
)
with check (
  assignment_id in (
    select id from public.assignments
    where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
  )
);

-- Students can read and insert versions for their own submissions
drop policy if exists "students manage own submission versions" on public.submission_versions;
create policy "students manage own submission versions" on public.submission_versions for all to authenticated
using (
  submission_id in (
    select id from public.submissions
    where student_id in (select id from public.students where auth_user_id = auth.uid())
  )
)
with check (
  submission_id in (
    select id from public.submissions
    where student_id in (select id from public.students where auth_user_id = auth.uid())
  )
);

-- Lecturers can read submission versions for their assignments
drop policy if exists "lecturers read submission versions" on public.submission_versions;
create policy "lecturers read submission versions" on public.submission_versions for select to authenticated
using (
  submission_id in (
    select s.id from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.lecturers l on l.id = a.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

-- 5. Storage Buckets & Policies
insert into storage.buckets (id, name, public) values ('assignment-briefs', 'assignment-briefs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('assignment-submissions', 'assignment-submissions', false)
on conflict (id) do nothing;

-- Storage policies for assignment-briefs (lecturer upload, students read)
drop policy if exists "lecturers upload briefs" on storage.objects;
create policy "lecturers upload briefs" on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignment-briefs' and
  exists (select 1 from public.lecturers where auth_user_id = auth.uid())
);

drop policy if exists "authenticated read briefs" on storage.objects;
create policy "authenticated read briefs" on storage.objects for select to authenticated
using (bucket_id = 'assignment-briefs');

-- Enable Realtime publications for submissions and assignments
do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
  when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.assignments;
exception
  when duplicate_object then null;
  when others then null;
end $$;
