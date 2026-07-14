import { sendEmail } from '../../services/email.service.js';
import * as reminderRepository from './invoiceReminder.repository.js';
import { validateReminderSettingsPayload } from './invoiceReminder.validation.js';

function createHttpError(statusCode, message, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (errors) {
    error.errors = errors;
  }

  return error;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(number);
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function getClientDisplayName(invoice) {
  return (
    invoice.client_company_name ||
    invoice.client_name ||
    'Client'
  );
}

function getReminderRecipient(invoice) {
  return invoice.client_billing_email || invoice.client_email || null;
}

function renderTemplate(template, data) {
  return String(template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return data[key] ?? '';
  });
}

function buildTemplateData(invoice) {
  const pdfUrl = invoice.id
    ? `/api/invoices/${invoice.id}/download`
    : '';

  return {
    client_name: getClientDisplayName(invoice),
    invoice_number: invoice.invoice_number || '',
    issue_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    subtotal_amount: formatMoney(invoice.subtotal_amount),
    tax_amount: formatMoney(invoice.tax_amount),
    total_amount: formatMoney(invoice.total_amount),
    paid_amount: formatMoney(invoice.paid_amount),
    balance_due: formatMoney(invoice.balance_due),
    company_name: invoice.company_name || 'Company',
    company_email: invoice.company_email || '',
    company_phone: invoice.company_phone || '',
    invoice_pdf_link: pdfUrl
  };
}

function buildReminderMessage(invoice, settings) {
  const templateData = buildTemplateData(invoice);

  const subject = renderTemplate(settings.email_subject, templateData);
  const message = renderTemplate(settings.email_message, templateData);

  return {
    subject,
    message,
    templateData
  };
}

function buildHtmlMessage(text) {
  return String(text || '')
    .split('\n')
    .map((line) => `<p>${line.trim() || '&nbsp;'}</p>`)
    .join('');
}

function canSendReminder(invoice) {
  if (!invoice) {
    return {
      allowed: false,
      reason: 'Facture introuvable.'
    };
  }

  if (!invoice.reminders_enabled) {
    return {
      allowed: false,
      reason: 'Les rappels sont désactivés pour cette facture.'
    };
  }

  if (!invoice.due_date) {
    return {
      allowed: false,
      reason: "Cette facture n'a pas de date d'échéance."
    };
  }

  if (Number(invoice.balance_due || 0) <= 0) {
    return {
      allowed: false,
      reason: 'Cette facture est déjà complètement payée.'
    };
  }

  if (!['non_payee', 'partiellement_payee'].includes(invoice.status)) {
    return {
      allowed: false,
      reason: "Le statut de cette facture ne permet pas l'envoi d'un rappel."
    };
  }

  const recipient = getReminderRecipient(invoice);

  if (!recipient) {
    return {
      allowed: false,
      reason: "Le client n'a pas d'email de facturation ou d'email principal."
    };
  }

  return {
    allowed: true,
    recipient
  };
}

export async function getSettings(companyId) {
  let settings = await reminderRepository.findSettingsByCompanyId(companyId);

  if (!settings) {
    settings = await reminderRepository.createDefaultSettings(companyId);
  }

  return settings;
}

export async function updateSettings(companyId, payload) {
  const currentSettings = await getSettings(companyId);

  const mergedPayload = {
    enabled: payload.enabled ?? currentSettings.enabled,
    start_after_due_days:
      payload.start_after_due_days ?? currentSettings.start_after_due_days,
    frequency_days:
      payload.frequency_days ?? currentSettings.frequency_days,
    max_reminders:
      payload.max_reminders === undefined
        ? currentSettings.max_reminders
        : payload.max_reminders,
    send_time: payload.send_time ?? currentSettings.send_time,
    email_subject: payload.email_subject ?? currentSettings.email_subject,
    email_message: payload.email_message ?? currentSettings.email_message
  };

  const validation = validateReminderSettingsPayload(mergedPayload);

  if (!validation.isValid) {
    throw createHttpError(400, 'Paramètres de rappel invalides.', validation.errors);
  }

  return reminderRepository.updateSettings(companyId, validation.data);
}

export async function sendManualReminder(invoiceId, companyId, userId) {
  const settings = await getSettings(companyId);
  const invoice = await reminderRepository.findInvoiceForReminder(invoiceId, companyId);

  const permission = canSendReminder(invoice);

  if (!permission.allowed) {
    throw createHttpError(400, permission.reason);
  }

  const { subject, message } = buildReminderMessage(invoice, settings);

  try {
    await sendEmail({
      to: permission.recipient,
      subject,
      text: message,
      html: buildHtmlMessage(message),
      fromName: invoice.company_name
    });

    const log = await reminderRepository.createReminderLog({
      company_id: companyId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      recipient_email: permission.recipient,
      subject,
      message,
      reminder_type: 'manual',
      status: 'sent',
      error_message: null,
      sent_by: userId
    });

    await reminderRepository.updateInvoiceReminderAfterSend(
      invoice.id,
      companyId,
      settings.frequency_days
    );

    return {
      sent: true,
      log
    };
  } catch (error) {
    const log = await reminderRepository.createReminderLog({
      company_id: companyId,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      recipient_email: permission.recipient,
      subject,
      message,
      reminder_type: 'manual',
      status: 'failed',
      error_message: error.message,
      sent_by: userId
    });

throw createHttpError(500, "Le rappel n'a pas pu être envoyé.", [
  error.message
]);
  }
}

export async function sendAutomaticReminderForInvoice(invoice) {
  const permission = canSendReminder(invoice);

  if (!permission.allowed) {
    return {
      sent: false,
      skipped: true,
      reason: permission.reason
    };
  }

  const settings = {
    email_subject: invoice.email_subject,
    email_message: invoice.email_message,
    frequency_days: invoice.frequency_days
  };

  const { subject, message } = buildReminderMessage(invoice, settings);

  try {
    await sendEmail({
      to: permission.recipient,
      subject,
      text: message,
      html: buildHtmlMessage(message),
      fromName: invoice.company_name
    });

    const log = await reminderRepository.createReminderLog({
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      recipient_email: permission.recipient,
      subject,
      message,
      reminder_type: 'automatic',
      status: 'sent',
      error_message: null,
      sent_by: null
    });

    await reminderRepository.updateInvoiceReminderAfterSend(
      invoice.id,
      invoice.company_id,
      invoice.frequency_days
    );

    return {
      sent: true,
      log
    };
  } catch (error) {
    const log = await reminderRepository.createReminderLog({
      company_id: invoice.company_id,
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      recipient_email: permission.recipient,
      subject,
      message,
      reminder_type: 'automatic',
      status: 'failed',
      error_message: error.message,
      sent_by: null
    });

    return {
      sent: false,
      failed: true,
      error: error.message,
      log
    };
  }
}

export async function processAutomaticReminders() {
  const invoices = await reminderRepository.findAutomaticReminderCandidates();

  const results = [];

  for (const invoice of invoices) {
    const result = await sendAutomaticReminderForInvoice(invoice);

    results.push({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      result
    });
  }

  return {
    total: invoices.length,
    results
  };
}

export async function getInvoiceReminderLogs(invoiceId, companyId) {
  return reminderRepository.findLogsByInvoiceId(invoiceId, companyId);
}

export async function enableInvoiceReminders(invoiceId, companyId) {
  const invoice = await reminderRepository.setInvoiceRemindersEnabled(
    invoiceId,
    companyId,
    true
  );

  if (!invoice) {
    throw createHttpError(404, 'Facture introuvable.');
  }

  return invoice;
}

export async function disableInvoiceReminders(invoiceId, companyId) {
  const invoice = await reminderRepository.setInvoiceRemindersEnabled(
    invoiceId,
    companyId,
    false
  );

  if (!invoice) {
    throw createHttpError(404, 'Facture introuvable.');
  }

  return invoice;
}

export async function getDueInvoicesPreview(companyId) {
  return reminderRepository.findDueInvoicesPreview(companyId);
}