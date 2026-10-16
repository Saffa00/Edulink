-- ============================================================================
-- V58 — Strict Role-Based Row Level Security (RLS) Enforcement
-- Ensures a student account can NEVER read or mutate lecturer-only data
-- even by typing a lecturer URL, manipulating localStorage, or calling Supabase directly.
-- ============================================================================

-- 1. Security Definer Role Verification Helpers
create or replace function public.is_lecturer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.lecturers l
    where l.auth_user_id = auth.uid()
      and coalesce(l.active, true) = true
  )
  and not exists (
    select 1
    from public.students s
    where s.auth_user_id = auth.uid()
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.is_lecturer() to authenticated;
grant execute on function public.is_student() to authenticated;

-- 2. Enable RLS on all core tables
alter table public.lecturers enable row level security;
alter table public.students enable row level security;
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
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.system_audit_logs enable row level security;

-- 3. Lecturers Table Policies
drop policy if exists "lecturers read own profile" on public.lecturers;
drop policy if exists "lecturers update own profile" on public.lecturers;
drop policy if exists "authenticated read active lecturers for supervision" on public.lecturers;

create policy "lecturers read own profile"
on public.lecturers for select to authenticated
using (
  (public.is_lecturer() and auth_user_id = auth.uid())
  or coalesce(active, true) = true
);

create policy "lecturers update own profile"
on public.lecturers for update to authenticated
using (public.is_lecturer() and auth_user_id = auth.uid())
with check (public.is_lecturer() and auth_user_id = auth.uid());

-- 4. Students Table Policies (Students can ONLY read/update their own record; Lecturers can read enrolled/supervised students)
drop policy if exists "students read own profile" on public.students;
drop policy if exists "students update own profile" on public.students;
drop policy if exists "lecturers read enrolled students" on public.students;

create policy "students read own profile"
on public.students for select to authenticated
using (public.is_student() and auth_user_id = auth.uid());

create policy "students update own profile"
on public.students for update to authenticated
using (public.is_student() and auth_user_id = auth.uid())
with check (public.is_student() and auth_user_id = auth.uid());

create policy "lecturers read enrolled students"
on public.students for select to authenticated
using (
  public.is_lecturer()
  and (
    id in (
      select sm.student_id
      from public.student_modules sm
      join public.modules m on m.id = sm.module_id
      join public.lecturers l on l.id = m.lecturer_id
      where l.auth_user_id = auth.uid()
    )
    or id in (
      select d.student_id
      from public.dissertations d
      left join public.lecturers l on l.id = d.supervisor_id
      where l.auth_user_id = auth.uid() or d.supervisor_id is null
    )
  )
);

-- 5. Modules & Student Enrollments Policies
drop policy if exists "allow read modules" on public.modules;
drop policy if exists "lecturers manage own modules" on public.modules;

create policy "allow read modules"
on public.modules for select to authenticated
using (true);

create policy "lecturers manage own modules"
on public.modules for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

drop policy if exists "students manage own module enrollments" on public.student_modules;
drop policy if exists "lecturers read module enrollments" on public.student_modules;

create policy "students manage own module enrollments"
on public.student_modules for all to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
)
with check (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

create policy "lecturers read module enrollments"
on public.student_modules for select to authenticated
using (
  public.is_lecturer()
  and module_id in (
    select m.id from public.modules m
    join public.lecturers l on l.id = m.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

-- 6. Classes & Attendance Policies
drop policy if exists "lecturers manage classes" on public.classes;
drop policy if exists "students read classes" on public.classes;

create policy "lecturers manage classes"
on public.classes for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

create policy "students read classes"
on public.classes for select to authenticated
using (
  public.is_student()
  and module_id in (
    select sm.module_id
    from public.student_modules sm
    join public.students s on s.id = sm.student_id
    where s.auth_user_id = auth.uid()
  )
);

drop policy if exists "lecturers manage attendance" on public.attendance;
drop policy if exists "students read attendance" on public.attendance;
drop policy if exists "students insert own attendance" on public.attendance;

create policy "lecturers manage attendance"
on public.attendance for all to authenticated
using (
  public.is_lecturer()
  and class_id in (
    select c.id from public.classes c
    join public.lecturers l on l.id = c.lecturer_id
    where l.auth_user_id = auth.uid()
  )
)
with check (
  public.is_lecturer()
  and class_id in (
    select c.id from public.classes c
    join public.lecturers l on l.id = c.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

create policy "students read attendance"
on public.attendance for select to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

create policy "students insert own attendance"
on public.attendance for insert to authenticated
with check (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

-- 7. Assignments & Submissions Policies
drop policy if exists "lecturers manage assignments" on public.assignments;
drop policy if exists "students read assignments" on public.assignments;

create policy "lecturers manage assignments"
on public.assignments for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

create policy "students read assignments"
on public.assignments for select to authenticated
using (
  public.is_student()
  and module_id in (
    select sm.module_id
    from public.student_modules sm
    join public.students s on s.id = sm.student_id
    where s.auth_user_id = auth.uid()
  )
);

drop policy if exists "students manage submissions" on public.submissions;
drop policy if exists "lecturers manage submissions" on public.submissions;

create policy "students manage submissions"
on public.submissions for all to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
)
with check (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

create policy "lecturers manage submissions"
on public.submissions for all to authenticated
using (
  public.is_lecturer()
  and assignment_id in (
    select a.id from public.assignments a
    join public.lecturers l on l.id = a.lecturer_id
    where l.auth_user_id = auth.uid()
  )
)
with check (
  public.is_lecturer()
  and assignment_id in (
    select a.id from public.assignments a
    join public.lecturers l on l.id = a.lecturer_id
    where l.auth_user_id = auth.uid()
  )
);

-- 8. Grades & Grade Audits Policies (Students can ONLY read their own published grades; zero access to grade_audits)
drop policy if exists "lecturers manage grades" on public.grades;
drop policy if exists "students read published grades" on public.grades;
drop policy if exists "lecturers view own grade audits" on public.grade_audits;
drop policy if exists "lecturers insert grade audits" on public.grade_audits;

create policy "lecturers manage grades"
on public.grades for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

create policy "students read published grades"
on public.grades for select to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
  and published = true
);

create policy "lecturers view own grade audits"
on public.grade_audits for select to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

create policy "lecturers insert grade audits"
on public.grade_audits for insert to authenticated
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

-- 9. Dissertations & Schedules Policies
drop policy if exists "students manage own dissertation" on public.dissertations;
drop policy if exists "supervisors review dissertations" on public.dissertations;

create policy "students manage own dissertation"
on public.dissertations for all to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
)
with check (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

create policy "supervisors review dissertations"
on public.dissertations for all to authenticated
using (
  public.is_lecturer()
  and (
    supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
    or supervisor_id is null
  )
)
with check (
  public.is_lecturer()
  and supervisor_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

drop policy if exists "lecturers manage own schedules" on public.schedules;
drop policy if exists "students read enrolled schedules" on public.schedules;

create policy "lecturers manage own schedules"
on public.schedules for all to authenticated
using (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
)
with check (
  public.is_lecturer()
  and lecturer_id in (select id from public.lecturers where auth_user_id = auth.uid())
);

create policy "students read enrolled schedules"
on public.schedules for select to authenticated
using (
  public.is_student()
  and module_id in (
    select sm.module_id
    from public.student_modules sm
    join public.students s on s.id = sm.student_id
    where s.auth_user_id = auth.uid()
  )
);

-- 10. Payments & System Audit Logs Policies
drop policy if exists "students read own payments" on public.payments;
drop policy if exists "lecturers read system audit logs" on public.system_audit_logs;

create policy "students read own payments"
on public.payments for select to authenticated
using (
  public.is_student()
  and student_id in (select id from public.students where auth_user_id = auth.uid())
);

create policy "lecturers read system audit logs"
on public.system_audit_logs for select to authenticated
using (public.is_lecturer());
