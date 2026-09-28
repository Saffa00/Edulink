-- V18 assignment submission storage
insert into storage.buckets (id,name,public) values ('assignment-submissions','assignment-submissions',false)
on conflict (id) do nothing;

-- Storage policies use the authenticated student's folder: student UUID is the first path segment.
drop policy if exists "students upload own assignment files" on storage.objects;
create policy "students upload own assignment files" on storage.objects for insert to authenticated
with check (bucket_id='assignment-submissions' and (storage.foldername(name))[1] in (select id::text from students where auth_user_id=auth.uid()));

drop policy if exists "students read own assignment files" on storage.objects;
create policy "students read own assignment files" on storage.objects for select to authenticated
using (bucket_id='assignment-submissions' and (storage.foldername(name))[1] in (select id::text from students where auth_user_id=auth.uid()));

drop policy if exists "lecturers read assignment files" on storage.objects;
create policy "lecturers read assignment files" on storage.objects for select to authenticated
using (bucket_id='assignment-submissions' and exists (
 select 1 from submissions s join assignments a on a.id=s.assignment_id
 join lecturers l on l.id=a.lecturer_id
 where l.auth_user_id=auth.uid() and s.file_url=name
));
