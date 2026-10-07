import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import paymentRouter from './routes/payments.js';
import deviceRouter from './routes/devices.js';
import loginHistoryRouter from './routes/login-history.js';
import recoveryRouter from './routes/recovery.js';
import registrationRouter from './routes/registration.js';
import messageRouter from './routes/messages.js';
import callRouter from './routes/calls.js';
import pushRouter from './routes/push.js';
import { registerAttendanceRoutes } from './routes/attendance.js';
import { getAdminSupabase } from './services/supabase.js';

const app = express();

if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({
  limit: '25mb',
  verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); }
}));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'Edulink Academic Portal Backend API is running.',
    version: 'v57',
    healthCheck: '/api/health',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy', version: 'v57', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'academic-pwa-production-server', version: 'v57' });
});

// Fallback redirects when Monime redirects to API host
app.get('/payment-success', (req, res) => {
  const clientOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`${clientOrigin}/payment-success${query}`);
});

app.get('/payment-cancelled', (_req, res) => {
  const clientOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  res.redirect(`${clientOrigin}/payment-cancelled`);
});

// Authoritative Attendance Route
registerAttendanceRoutes(app, { supabaseAdmin: getAdminSupabase() });

// Domain routers
app.use('/api/payments', paymentRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/login-history', loginHistoryRouter);
app.use('/api/recovery', recoveryRouter);
app.use('/api/registration', registrationRouter);
app.use('/api/messages', messageRouter);
app.use('/api/calls', callRouter);
app.use('/api/push', pushRouter);

import { startClassReminderWorker } from './services/classReminder.js';

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Academic PWA production server running on port ${port}`);
  startClassReminderWorker();
});
