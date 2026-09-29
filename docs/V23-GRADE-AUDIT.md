# V23 — Grade Publication Audit

V23 adds an audit trail for module grade publication.

## What it records
- module
- lecturer
- number of student grades published
- exact publication date/time

## Why
The system can now show the lecturer when a module's grades were published and how many individual student grades were released in that publication batch.

## Duplicate-notification protection
The existing V22 publishing flow already publishes only grades that are still unpublished. V23 keeps that transition-based behavior as the source of truth: a later click does not re-publish already-published grade rows.

For production, notification creation should run in a trusted Supabase Edge Function/transaction so grade publication and notification delivery cannot be separated by a browser failure.
