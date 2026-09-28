-- V23: audit grade publication batches.
create table if not exists grade_publish_batches (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  lecturer_id uuid not null references lecturers(id) on delete cascade,
  published_count integer not null default 0 check (published_count >= 0),
  published_at timestamptz not null default now()
);

create index if not exists grade_publish_batches_module_idx
  on grade_publish_batches(module_id,published_at desc);

alter table grade_publish_batches enable row level security;

drop policy if exists "v23 lecturer reads own publish history" on grade_publish_batches;
create policy "v23 lecturer reads own publish history"
on grade_publish_batches for select to authenticated
using (exists (
  select 1 from lecturers l
  where l.id=grade_publish_batches.lecturer_id
    and l.auth_user_id=auth.uid()
));

drop policy if exists "v23 lecturer creates own publish history" on grade_publish_batches;
create policy "v23 lecturer creates own publish history"
on grade_publish_batches for insert to authenticated
with check (exists (
  select 1 from lecturers l
  where l.id=grade_publish_batches.lecturer_id
    and l.auth_user_id=auth.uid()
));
