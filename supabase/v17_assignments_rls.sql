alter table if exists assignments enable row level security;
alter table if exists submissions enable row level security;

drop policy if exists "lecturers manage own assignments" on assignments;
create policy "lecturers manage own assignments" on assignments for all to authenticated
using (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()))
with check (lecturer_id in (select id from lecturers where auth_user_id=auth.uid()));

drop policy if exists "students read registered assignments" on assignments;
create policy "students read registered assignments" on assignments for select to authenticated
using (module_id in (select module_id from student_modules where student_id in (select id from students where auth_user_id=auth.uid())));

drop policy if exists "students manage own submissions" on submissions;
create policy "students manage own submissions" on submissions for all to authenticated
using (student_id in (select id from students where auth_user_id=auth.uid()))
with check (student_id in (select id from students where auth_user_id=auth.uid()));

drop policy if exists "lecturers read submissions for own assignments" on submissions;
create policy "lecturers read submissions for own assignments" on submissions for select to authenticated
using (assignment_id in (select id from assignments where lecturer_id in (select id from lecturers where auth_user_id=auth.uid())));
