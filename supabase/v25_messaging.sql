create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  lecturer_id uuid not null references lecturers(id) on delete cascade,
  student_user_id uuid not null,
  lecturer_user_id uuid not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(module_id,student_id,lecturer_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id uuid not null,
  body text not null check(length(trim(body))>0 and length(body)<=5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists v25_messages_conversation_idx on messages(conversation_id,created_at);
create index if not exists v25_conversations_student_idx on conversations(student_user_id,last_message_at desc);
create index if not exists v25_conversations_lecturer_idx on conversations(lecturer_user_id,last_message_at desc);

alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "v25 conversation members read" on conversations;
create policy "v25 conversation members read" on conversations for select to authenticated
using(student_user_id=auth.uid() or lecturer_user_id=auth.uid());

drop policy if exists "v25 message members read" on messages;
create policy "v25 message members read" on messages for select to authenticated
using(exists(select 1 from conversations c where c.id=messages.conversation_id and (c.student_user_id=auth.uid() or c.lecturer_user_id=auth.uid())));

drop policy if exists "v25 members send messages" on messages;
create policy "v25 members send messages" on messages for insert to authenticated
with check(sender_user_id=auth.uid() and exists(select 1 from conversations c where c.id=messages.conversation_id and (c.student_user_id=auth.uid() or c.lecturer_user_id=auth.uid())));

drop policy if exists "v25 members mark messages read" on messages;
create policy "v25 members mark messages read" on messages for update to authenticated
using(exists(select 1 from conversations c where c.id=messages.conversation_id and (c.student_user_id=auth.uid() or c.lecturer_user_id=auth.uid())))
with check(exists(select 1 from conversations c where c.id=messages.conversation_id and (c.student_user_id=auth.uid() or c.lecturer_user_id=auth.uid())));

drop policy if exists "v25 members update conversations" on conversations;
create policy "v25 members update conversations" on conversations for update to authenticated
using(student_user_id=auth.uid() or lecturer_user_id=auth.uid())
with check(student_user_id=auth.uid() or lecturer_user_id=auth.uid());
