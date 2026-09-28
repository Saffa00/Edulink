-- V22: enforce private individual module grades.
alter table grades enable row level security;

drop policy if exists "v22 student own published grades" on grades;
create policy "v22 student own published grades" on grades for select to authenticated
using(published=true and exists(
  select 1 from students s where s.id=grades.student_id and s.auth_user_id=auth.uid()
));

drop policy if exists "v22 lecturer reads own module grades" on grades;
create policy "v22 lecturer reads own module grades" on grades for select to authenticated
using(exists(
  select 1 from modules m join lecturers l on l.id=m.lecturer_id
  where m.id=grades.module_id and l.auth_user_id=auth.uid()
));

drop policy if exists "v22 lecturer inserts own grades" on grades;
create policy "v22 lecturer inserts own grades" on grades for insert to authenticated
with check(exists(
  select 1 from modules m join lecturers l on l.id=m.lecturer_id
  where m.id=grades.module_id and l.id=grades.lecturer_id and l.auth_user_id=auth.uid()
));

drop policy if exists "v22 lecturer updates own grades" on grades;
create policy "v22 lecturer updates own grades" on grades for update to authenticated
using(exists(
  select 1 from modules m join lecturers l on l.id=m.lecturer_id
  where m.id=grades.module_id and l.auth_user_id=auth.uid()
))
with check(exists(
  select 1 from modules m join lecturers l on l.id=m.lecturer_id
  where m.id=grades.module_id and l.auth_user_id=auth.uid()
));

-- One grade record per registered student/module.
create unique index if not exists v22_grades_student_module_unique
on grades(student_id,module_id);
