-- V20: grades are individually linked to Student ID + Module + Lecturer.
-- Students can only read their own published grades.
-- Lecturers can manage grades only for modules they teach.

alter table grades enable row level security;

drop policy if exists "v20 students read own published grades" on grades;
create policy "v20 students read own published grades" on grades
for select to authenticated
using (
  published=true and exists(
    select 1 from students s
    where s.id=grades.student_id and s.auth_user_id=auth.uid()
  )
);

drop policy if exists "v20 lecturers read grades in own modules" on grades;
create policy "v20 lecturers read grades in own modules" on grades
for select to authenticated
using (
  exists(
    select 1 from modules m
    join lecturers l on l.id=m.lecturer_id
    where m.id=grades.module_id and l.auth_user_id=auth.uid()
  )
);

drop policy if exists "v20 lecturers insert own module grades" on grades;
create policy "v20 lecturers insert own module grades" on grades
for insert to authenticated
with check (
  exists(
    select 1 from modules m
    join lecturers l on l.id=m.lecturer_id
    where m.id=grades.module_id
      and l.id=grades.lecturer_id
      and l.auth_user_id=auth.uid()
  )
);

drop policy if exists "v20 lecturers update own module grades" on grades;
create policy "v20 lecturers update own module grades" on grades
for update to authenticated
using (
  exists(
    select 1 from modules m
    join lecturers l on l.id=m.lecturer_id
    where m.id=grades.module_id and l.auth_user_id=auth.uid()
  )
)
with check (
  exists(
    select 1 from modules m
    join lecturers l on l.id=m.lecturer_id
    where m.id=grades.module_id and l.auth_user_id=auth.uid()
  )
);

-- Prevent duplicate grade records for the same student and module.
create unique index if not exists grades_student_module_unique
on grades(student_id,module_id);
