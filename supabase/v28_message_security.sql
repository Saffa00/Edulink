-- V28: Messaging authorization, audit and anti-abuse database hardening.
-- Run after V27.

alter table public.messages
  drop constraint if exists messages_body_length_v28;

alter table public.messages
  add constraint messages_body_length_v28
  check (char_length(trim(body)) between 1 and 5000);

create index if not exists conversations_student_module_v28
  on public.conversations(student_id, module_id);

create index if not exists conversations_lecturer_module_v28
  on public.conversations(lecturer_id, module_id);

create index if not exists student_modules_student_module_v28
  on public.student_modules(student_id, module_id);

create index if not exists modules_lecturer_active_v28
  on public.modules(lecturer_id, active);

create index if not exists message_send_audit_conversation_time_v28
  on public.message_send_audit(conversation_id, created_at desc);

-- Keep notifications deduplicated.
create unique index if not exists notifications_source_key_unique_v28
  on public.notifications(source_key)
  where source_key is not null;
