-- V21: each student receives a private notification for their own published module grade.
alter table notifications enable row level security;

drop policy if exists "v21 users read own notifications" on notifications;
create policy "v21 users read own notifications" on notifications
for select to authenticated
using (recipient_user_id=auth.uid());

drop policy if exists "v21 users mark own notifications read" on notifications;
create policy "v21 users mark own notifications read" on notifications
for update to authenticated
using (recipient_user_id=auth.uid())
with check (recipient_user_id=auth.uid());

-- The browser should not be allowed to create arbitrary notifications.
-- Grade publishing creates them only after the published grades are validated.
