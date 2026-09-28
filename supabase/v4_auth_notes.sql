-- V4 AUTH NOTES
-- Run after schema.sql in Supabase SQL Editor.
-- Supabase Auth creates auth.users automatically.
-- These policies are a starting point; tighten them further before production.

alter table public.students enable row level security;
alter table public.lecturers enable row level security;

create policy "students read own profile"
on public.students for select to authenticated
using (auth.uid() = auth_user_id);

create policy "students update own profile"
on public.students for update to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "lecturers read own profile"
on public.lecturers for select to authenticated
using (auth.uid() = auth_user_id);

create policy "lecturers update own profile"
on public.lecturers for update to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

-- Registration inserts are normally better handled by a trusted server/Edge Function.
-- Do NOT expose service_role credentials in the PWA.
