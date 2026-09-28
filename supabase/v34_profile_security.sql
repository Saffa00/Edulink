-- V34: Profile/security RLS hardening.
-- Users may read/update only their own Student/Lecturer profile.

alter table public.students enable row level security;
alter table public.lecturers enable row level security;

drop policy if exists "students read own profile v34" on public.students;
create policy "students read own profile v34"
on public.students for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "students update own profile v34" on public.students;
create policy "students update own profile v34"
on public.students for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

drop policy if exists "lecturers read own profile v34" on public.lecturers;
create policy "lecturers read own profile v34"
on public.lecturers for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "lecturers update own profile v34" on public.lecturers;
create policy "lecturers update own profile v34"
on public.lecturers for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create index if not exists students_auth_user_id_v34 on public.students(auth_user_id);
create index if not exists lecturers_auth_user_id_v34 on public.lecturers(auth_user_id);

-- Device reads/revokes should be limited to the account owner.
-- Existing V9/V10 server endpoints remain preferred for production device operations.
