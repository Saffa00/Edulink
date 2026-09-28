-- V19 grade security
alter table grades enable row level security;

drop policy if exists "students read published own grades" on grades;
create policy "students read published own grades" on grades for select to authenticated
using (
 published=true and exists (
   select 1 from students s where s.id=grades.student_id and s.auth_user_id=auth.uid()
 )
);

drop policy if exists "lecturers read own module grades" on grades;
create policy "lecturers read own module grades" on grades for select to authenticated
using (
 exists (
   select 1 from modules m join lecturers l on l.id=m.lecturer_id
   where m.id=grades.module_id and l.auth_user_id=auth.uid()
 )
);

drop policy if exists "lecturers insert own module grades" on grades;
create policy "lecturers insert own module grades" on grades for insert to authenticated
with check (
 exists (
   select 1 from modules m join lecturers l on l.id=m.lecturer_id
   where m.id=grades.module_id and l.id=grades.lecturer_id and l.auth_user_id=auth.uid()
 )
);

drop policy if exists "lecturers update own module grades" on grades;
create policy "lecturers update own module grades" on grades for update to authenticated
using (
 exists (
   select 1 from modules m join lecturers l on l.id=m.lecturer_id
   where m.id=grades.module_id and l.auth_user_id=auth.uid()
 )
)
with check (
 exists (
   select 1 from modules m join lecturers l on l.id=m.lecturer_id
   where m.id=grades.module_id and l.auth_user_id=auth.uid()
 )
);
