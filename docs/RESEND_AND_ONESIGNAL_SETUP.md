# EduLink — Resend Email & OneSignal Push Setup Guide

This guide details how to configure **Resend** for high-deliverability emails and **OneSignal** for cross-platform push notifications across iOS PWA, Android, and Desktop.

---

## Part 1: Resend Email Setup (5 Minutes)

### Step 1: Obtain Resend API Key
1. Go to [resend.com](https://resend.com) and create a free account.
2. In the Resend Dashboard, go to **API Keys** → **Create API Key**.
3. Name it `edulink-production`, select full permissions, and copy the key (e.g., `re_abc123...`).

---

### Step 2: Connect Resend to Supabase Auth (Password Reset & Verification)
Supabase handles user confirmation and password reset emails. By default, Supabase applies strict rate limits. Connecting Resend removes all rate limits:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → Select your EduLink project.
2. Navigate to **Project Settings** → **Authentication** → scroll down to **SMTP Settings**.
3. Toggle **Enable Custom SMTP** to `ON`:
   - **Sender email**: `noreply@yourdomain.com` (or `onboarding@resend.dev` for testing)
   - **Sender name**: `EduLink Portal`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Minimum TLS Version**: `TLSv1.2`
   - **User**: `resend`
   - **Password**: *Paste your Resend API Key (`re_...`)*
4. Click **Save Changes**.
5. All password recovery emails sent from EduLink now deliver immediately through Resend with 99.9% deliverability.

---

### Step 3: Backend Transactional Emails (Monime Receipts & Grade Alerts)
Add your Resend API key to your backend hosting environment (e.g., Render, Railway, or VPS):

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=EduLink Academic Portal <onboarding@resend.dev>
```

When a student completes payment or a lecturer publishes grades, the backend automatically dispatches branded HTML receipts using `server/services/emailService.js`.

---

## Part 2: OneSignal Push Notifications Setup (5 Minutes)

OneSignal provides push notifications with full support for Apple iOS (iOS 16.4+ PWA) and Android Chrome.

### Step 1: Create OneSignal App
1. Go to [onesignal.com](https://onesignal.com) and create a free account (free for up to 10,000 subscribers).
2. Click **New App/Platform** → Enter Name: `EduLink` → Select **Web Push** → Click **Next**.
3. Choose Integration: **Typical Site**.
   - **Site Name**: `EduLink Academic Portal`
   - **Site URL**: `https://your-vercel-domain.vercel.app` (or your custom domain)
   - **Auto Resubscribe**: Toggle `ON`
   - Check **My site is not fully HTTPS / Local testing** if you want to test on `http://localhost:5173`.
4. Click **Save** and copy your **OneSignal App ID** and **REST API Key** (found under **Settings → Keys & IDs**).

---

### Step 2: Configure Frontend (Vercel)
In your Vercel Dashboard → Select your EduLink project → **Settings** → **Environment Variables**:

| Variable Name | Value |
|---|---|
| `VITE_ONESIGNAL_APP_ID` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

*Redeploy your Vercel project to activate.*

---

### Step 3: Configure Backend (Render / Node Server)
In your Render Dashboard → Select your backend service → **Environment**:

| Variable Name | Value |
|---|---|
| `ONESIGNAL_APP_ID` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `ONESIGNAL_REST_API_KEY` | `os_v2_app_xxxxxxxxxxxxxxxxxxxxxxxx` |

---

## Part 3: Architecture & Capabilities

### User Tagging & Targeting
Upon login, EduLink automatically tags users in OneSignal:
- `role`: `student` or `lecturer`
- `student_id`: e.g. `8100`
- `campus`: `goderich`, `congo_cross`, or `brookfields`
- `faculty` & `department`

### Push Dispatching Functions (`server/services/oneSignalService.js`)
- `sendPushToUser({ userId, title, message })`: Send a private alert when a student receives a direct message or grade.
- `sendPushToRole({ role: 'student', title, message })`: Send an announcement to all students.
- `sendPushToCampus({ campus: 'goderich', title, message })`: Send emergency or weather alerts to a specific campus.
- `sendPushToAll({ title, message })`: Broadcast urgent university-wide notices.
