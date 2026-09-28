-- V29: Secure conversation creation and participant relationship.
-- Run after V28.

create unique index if not exists conversations_student_module_lecturer_v29
  on public.conversations(student_id, module_id, lecturer_id);

create index if not exists conversations_module_v29
  on public.conversations(module_id);

create index if not exists conversations_student_time_v29
  on public.conversations(student_id, last_message_at desc);

create index if not exists conversations_lecturer_time_v29
  on public.conversations(lecturer_id, last_message_at desc);

-- The trusted server should be the only creator of conversations in production.
drop policy if exists "participants can create conversations" on public.conversations;
