import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import clientRoutes from './modules/clients/client.routes.js';
import clientPortalRoutes from './modules/client-portal/clientPortal.routes.js';
import { notFoundMiddleware, errorMiddleware } from './middlewares/error.middleware.js';
import itemRoutes from './modules/items/item.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import bankStatementRoutes from './modules/bank-statements/bankStatement.routes.js';
import companySettingsRoutes from './modules/company-settings/companySettings.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import commissionRoutes from './modules/commissions/commission.routes.js';
import invoiceReminderRoutes from './modules/invoice-reminders/invoiceReminder.routes.js';
import superAdminRoutes from './modules/super-admin/superAdmin.routes.js';
import auditLogRoutes from './modules/audit-logs/auditLog.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import { startInvoiceReminderJob } from './jobs/invoiceReminder.job.js';
import { env } from './config/env.js';
import { query } from './database/db.js';

const app = express();
const isProduction = env.nodeEnv === 'production';
const isTest = env.nodeEnv === 'test';

app.disable('x-powered-by');

// Needed so express-rate-limit sees the real client IP behind nginx.
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(
  '/storage/company',
  express.static(path.resolve(process.cwd(), 'storage', 'company'))
);
app.use(
  '/storage/public',
  express.static(path.resolve(process.cwd(), 'storage', 'public'))
);

app.use(helmet());

const allowedOrigins = [
  ...env.corsOrigins,
  ...(isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Mobile apps, curl, Supertest and same-origin proxies often omit Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (!isProduction) {
        try {
          const { hostname } = new URL(origin);
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return callback(null, true);
          }
        } catch {
          // Invalid origin → reject below.
        }
      }

      return callback(null, false);
    },
    credentials: true
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

if (!isTest) {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_API_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de requêtes. Réessayez plus tard.'
    }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de tentatives d’authentification. Réessayez plus tard.'
    }
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register-company', authLimiter);
}

async function healthHandler(req, res) {
  let database = 'ok';

  try {
    await query('SELECT 1');
  } catch {
    database = 'error';
  }

  const ok = database === 'ok';

  return res.status(ok ? 200 : 503).json({
    success: ok,
    status: ok ? 'ok' : 'degraded',
    service: 'invoice-backend',
    database,
    timestamp: new Date().toISOString()
  });
}

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client', clientPortalRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/invoice-reminders', invoiceReminderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bank-statements', bankStatementRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

if (!isTest) {
  startInvoiceReminderJob();
}

export default app;
