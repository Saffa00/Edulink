# V8 — Secure Monime Webhook + Payment Activation

V8 completes the payment state transition:

Student registration
→ pending payment
→ Monime hosted checkout
→ Monime webhook
→ HMAC verification
→ server reconciles checkout with Monime
→ verifies amount/currency
→ payment becomes `paid`
→ student becomes `active`
→ existing `student_modules` links determine lecturer allocation.

## 1. Install backend dependencies

```bash
cd server
npm install
```

## 2. Configure server environment

Copy `server/.env.example` to `server/.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MONIME_SECRET_KEY`
- `MONIME_SPACE_ID`
- `MONIME_WEBHOOK_SECRET`
- `APP_BASE_URL`

Never put the Supabase service-role key or Monime secret in the React frontend.

## 3. Run the V8 SQL migration

Open Supabase SQL Editor and run:

`supabase/v8_payment_reconciliation.sql`

This adds the payment reference/session fields and creates the
`student_lecturer_allocations` view.

## 4. Configure the Monime webhook

Create a webhook in the Monime dashboard/API with:

- URL: `https://YOUR-BACKEND-DOMAIN/api/payments/webhook`
- API release: `caph`
- verification method: `HS256`
- secret: the same value as `MONIME_WEBHOOK_SECRET`
- enabled: true
- event(s): the payment/checkout completion event used by your Monime account

The V8 server expects the signature in the header named by
`MONIME_WEBHOOK_SIGNATURE_HEADER` (default `x-monime-signature`).

Before production, confirm the exact signature header name shown by your
Monime webhook delivery configuration and set that environment variable if it
differs.

## 5. Start the backend

```bash
npm run dev
```

Health check:

`GET /api/health`

## 6. Payment security behavior

The initialize endpoint now requires the student's Supabase access token.
It verifies that the supplied Student ID belongs to the authenticated user.

The webhook is public because Monime must reach it, but it does NOT trust the
incoming event by itself. It:

1. verifies the HMAC signature;
2. extracts the checkout session ID;
3. retrieves the checkout session directly from Monime;
4. requires Monime status `completed`;
5. verifies the local expected amount/currency against the checkout line items;
6. marks the local payment `paid`;
7. activates the student;
8. keeps lecturer allocation module-driven through `student_modules → modules.lecturer_id`.

## 7. Important testing note

Do not manually change a student's `account_status` to `active` to simulate
payment in production. Use Monime Test mode and a real webhook delivery so the
complete verification path is exercised.

## 8. Current flow

Normal student: SLE 100

Dissertation student: SLE 500

Both use the same secure payment architecture.
