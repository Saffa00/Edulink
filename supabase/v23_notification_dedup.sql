-- Optional V23 production hardening: allow grade notifications to carry a source key.
alter table notifications add column if not exists source_key text;

create unique index if not exists v23_notification_source_key_unique
on notifications(source_key)
where source_key is not null;
