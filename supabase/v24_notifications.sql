alter table notifications add column if not exists notification_type text not null default 'system';
alter table notifications enable row level security;
drop policy if exists "v24 read own notifications" on notifications;
create policy "v24 read own notifications" on notifications for select to authenticated using(recipient_user_id=auth.uid());
drop policy if exists "v24 update own notifications" on notifications;
create policy "v24 update own notifications" on notifications for update to authenticated using(recipient_user_id=auth.uid()) with check(recipient_user_id=auth.uid());
create index if not exists v24_notifications_recipient_created_idx on notifications(recipient_user_id,created_at desc);
create index if not exists v24_notifications_unread_idx on notifications(recipient_user_id,read_at) where read_at is null;
