-- V26: Real-time messaging and message notifications
-- Run this after V25 messaging + V24 notifications SQL.

-- Enable Supabase Realtime for messages.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is not available; enable Realtime in Supabase Dashboard.';
end $$;

-- Prevent duplicate notification source keys when this column exists.
create unique index if not exists notifications_source_key_unique_v26
  on public.notifications(source_key)
  where source_key is not null;

-- Useful indexes for live chat.
create index if not exists messages_conversation_created_v26
  on public.messages(conversation_id, created_at);

create index if not exists notifications_recipient_type_created_v26
  on public.notifications(recipient_user_id, notification_type, created_at desc);
