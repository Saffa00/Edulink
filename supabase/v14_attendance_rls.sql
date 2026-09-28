-- V14 attendance security foundation
alter table if exists classes enable row level security;
alter table if exists attendance enable row level security;

drop policy if exists "lecturers manage own classes" on classes;
create policy "lecturers manage own classes" on classes for all to authenticated
using (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()))
with check (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "students read own attendance" on attendance;
create policy "students read own attendance" on attendance for select to authenticated
using (student_id in (select id from students where auth_user_id=auth.uid()));

drop policy if exists "lecturers read attendance for own classes" on attendance;
create policy "lecturers read attendance for own classes" on attendance for select to authenticated
using (class_id in (select id from classes where lecturer_id in (select id from lecturers where auth_user_id=auth.uid())));
