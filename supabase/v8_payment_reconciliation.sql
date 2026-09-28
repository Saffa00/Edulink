-- V8 payment reconciliation migration
-- Run this after the original supabase/schema.sql.

alter table public.payments
  add column if not exists reference text unique;

alter table public.payments
  add column if not exists checkout_session_id text unique;

create index if not exists payments_student_status_idx
  on public.payments(student_id, status);

create index if not exists payments_checkout_session_idx
  on public.payments(checkout_session_id);

-- Module-driven lecturer allocation view.
-- A student is connected to every lecturer who owns one of the student's
-- registered modules. No manual student-to-lecturer join is required.
create or replace view public.student_lecturer_allocations as
select
  sm.student_id,
  s.student_id as student_code,
  s.full_name as student_name,
  sm.module_id,
  m.code as module_code,
  m.title as module_title,
  m.lecturer_id,
  l.lecturer_id as lecturer_code,
  l.full_name as lecturer_name
from public.student_modules sm
join public.students s on s.id = sm.student_id
join public.modules m on m.id = sm.module_id
left join public.lecturers l on l.id = m.lecturer_id;
