-- ============================================================================
-- V39 — Complete Attendance Management System
-- Schema Enhancements, Constraints, RLS, and Realtime Publications
-- ============================================================================

-- 1. Enhance classes table for on-demand opening/closing and timing
alter table if exists public.classes
  add column if not exists attendance_status text default 'scheduled' check(attendance_status in ('scheduled','open','closed')),
  add column if not exists opened_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists late_threshold_minutes integer default 15;

-- 2. Enhance attendance table for verification metadata and lecturer overrides
alter table if exists public.attendance
  add column if not exists verified boolean default true,
  add column if not exists verification_method text default 'gps_device',
  add column if not exists lecturer_notes text;

-- Update status check constraint on attendance table if needed
do $$
begin
  alter table public.attendance drop constraint if exists attendance_status_check;
  alter table public.attendance add constraint attendance_status_check
    check (status in ('present', 'late', 'absent', 'rejected', 'excused'));
exception
  when others then null;
end $$;

-- 3. Row Level Security for Attendance & Classes
alter table if exists public.classes enable row level security;
alter table if exists public.attendance enable row level security;

-- Ensure lecturers can select and manage their own classes
drop policy if exists "lecturers manage own classes" on public.classes;
create policy "lecturers manage own classes" on public.classes for all to authenticated
using (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()))
with check (lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid()));

-- Students can read classes for their enrolled modules
drop policy if exists "students read enrolled classes" on public.classes;
create policy "students read enrolled classes" on public.classes for select to authenticated
using (
  module_id in (
    select module_id from public.student_modules sm
    join public.students s on s.id = sm.student_id
    where s.auth_user_id = auth.uid()
  )
);

-- Lecturers can select, insert, update and delete attendance for their classes (for manual override/marking)
drop policy if exists "lecturers manage attendance for own classes" on public.attendance;
create policy "lecturers manage attendance for own classes" on public.attendance for all to authenticated
using (
  class_id in (
    select id from public.classes
    where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
  )
)
with check (
  class_id in (
    select id from public.classes
    where lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
  )
);

-- Students can read their own attendance records
drop policy if exists "students read own attendance" on public.attendance;
create policy "students read own attendance" on public.attendance for select to authenticated
using (student_id in (select id from public.students where auth_user_id = auth.uid()));

-- 4. Enable Supabase Realtime for live attendance sync
do $$
begin
  alter publication supabase_realtime add table public.attendance;
exception
  when duplicate_object then null;
  when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.classes;
exception
  when duplicate_object then null;
  when others then null;
end $$;
