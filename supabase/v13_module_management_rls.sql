-- V13 lecturer module management policies
alter table if exists modules enable row level security;
alter table if exists student_modules enable row level security;

drop policy if exists "lecturers create own modules" on modules;
create policy "lecturers create own modules" on modules for insert to authenticated
with check (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "lecturers update own modules" on modules;
create policy "lecturers update own modules" on modules for update to authenticated
using (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()))
with check (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "lecturers read students in own modules" on student_modules;
create policy "lecturers read students in own modules" on student_modules for select to authenticated
using (module_id in (select id from modules where lecturer_id in (select id from lecturers where auth_user_id=auth.uid())));
