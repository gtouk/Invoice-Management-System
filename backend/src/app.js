import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import clientRoutes from './modules/clients/client.routes.js';
import clientPortalRoutes from './modules/client-portal/clientPortal.routes.js';
import { notFoundMiddleware, errorMiddleware } from './middlewares/error.middleware.js';
import itemRoutes from './modules/items/item.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRoutes from './modules/payments/payment.routes.js';
import bankStatementRoutes from './modules/bank-statements/bankStatement.routes.js';
import companySettingsRoutes from './modules/company-settings/companySettings.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import commissionRoutes from './modules/commissions/commission.routes.js';
import invoiceReminderRoutes from './modules/invoice-reminders/invoiceReminder.routes.js';
import superAdminRoutes from './modules/super-admin/superAdmin.routes.js';
import auditLogRoutes from './modules/audit-logs/auditLog.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import { startInvoiceReminderJob } from './jobs/invoiceReminder.job.js';

const app = express();

app.use(
  '/storage/company',
  express.static(path.resolve(process.cwd(), 'storage', 'company'))
);
app.use(
  '/storage/public',
  express.static(path.resolve(process.cwd(), 'storage', 'public'))
);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
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

startInvoiceReminderJob();
export default app;
