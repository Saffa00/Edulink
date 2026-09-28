-- V12 dashboard read policies.
alter table if exists modules enable row level security;
alter table if exists student_modules enable row level security;
alter table if exists assignments enable row level security;
alter table if exists grades enable row level security;
alter table if exists attendance enable row level security;

drop policy if exists "students read own module registrations" on student_modules;
create policy "students read own module registrations" on student_modules for select to authenticated
using (student_id in (select id from students where auth_user_id=auth.uid()));

drop policy if exists "students read registered modules" on modules;
create policy "students read registered modules" on modules for select to authenticated
using (id in (select sm.module_id from student_modules sm join students s on s.id=sm.student_id where s.auth_user_id=auth.uid()));

drop policy if exists "lecturers read own modules" on modules;
create policy "lecturers read own modules" on modules for select to authenticated
using (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "students read own grades" on grades;
create policy "students read own grades" on grades for select to authenticated
using (student_id in (select id from students where auth_user_id=auth.uid()) and published=true);

drop policy if exists "lecturers read own assignments" on assignments;
create policy "lecturers read own assignments" on assignments for select to authenticated
using (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "students read own attendance" on attendance;
create policy "students read own attendance" on attendance for select to authenticated
using (student_id in (select id from students where auth_user_id=auth.uid()));
