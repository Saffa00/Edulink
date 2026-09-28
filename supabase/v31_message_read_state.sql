-- V31: Unread/read message state.
-- Run after V25-V30.

create index if not exists messages_unread_by_conversation_v31
  on public.messages(conversation_id, created_at desc)
  where read_at is null;

create index if not exists messages_unread_by_sender_v31
  on public.messages(sender_user_id, created_at desc)
  where read_at is null;

-- Participants may update read_at on messages they received.
-- Existing V25/V26 RLS should be reviewed so updates cannot alter body/sender.
drop policy if exists "participants can mark read" on public.messages;

create policy "participants can mark read v31"
on public.messages
for update
to authenticated
using (
  sender_user_id <> auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (c.student_user_id = auth.uid() or c.lecturer_user_id = auth.uid())
  )
)
with check (
  sender_user_id <> auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (c.student_user_id = auth.uid() or c.lecturer_user_id = auth.uid())
  )
);
