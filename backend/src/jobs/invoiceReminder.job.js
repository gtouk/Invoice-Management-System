import cron from 'node-cron';
import { processAutomaticReminders } from '../modules/invoice-reminders/invoiceReminder.service.js';

let reminderTask = null;

export function startInvoiceReminderJob() {
  if (process.env.DISABLE_CRON === 'true') {
    console.log('[Invoice Reminder Job] Disabled by DISABLE_CRON=true');
    return;
  }

  if (reminderTask) {
    console.log('[Invoice Reminder Job] Already started.');
    return;
  }

  const schedule = process.env.INVOICE_REMINDER_CRON || '0 * * * *';

  reminderTask = cron.schedule(schedule, async () => {
    try {
      console.log('[Invoice Reminder Job] Checking due invoice reminders...');

      const result = await processAutomaticReminders();

      console.log(
        `[Invoice Reminder Job] Done. Candidates: ${result.total}`
      );
    } catch (error) {
      console.error('[Invoice Reminder Job] Failed:', error.message);
    }
  });

  console.log(`[Invoice Reminder Job] Started with schedule: ${schedule}`);
}