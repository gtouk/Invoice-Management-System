import * as invoiceRepository from './invoice.repository.js';
import fs from 'fs';
import path from 'path';
import { sendEmailWithAttachment } from '../../services/email.service.js';
import * as companySettingsRepository from '../company-settings/companySettings.repository.js';
import { generateInvoicePdf as generateInvoicePdfFile } from '../../services/pdf.service.js';
import {
  validateCreateInvoicePayload,
  validateInvoiceFilters
} from './invoice.validation.js';

function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function requireCompanyId(companyId) {
  if (!companyId) {
    throw createHttpError(
      'Aucune entreprise associée à cet utilisateur.',
      403
    );
  }
}

function calculateInvoiceTotals(items) {
  let subtotalAmount = 0;

  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const lineTotal = roundMoney(quantity * unitPrice);

    subtotalAmount += lineTotal;

    return {
      ...item,
      quantity: roundMoney(quantity),
      unit_price: roundMoney(unitPrice),
      line_total: lineTotal
    };
  });

  return {
    items: normalizedItems,
    subtotal_amount: roundMoney(subtotalAmount)
  };
}

function calculateTaxes(subtotalAmount, payload) {
  const taxesEnabled = Boolean(payload.taxes_enabled);

  if (!taxesEnabled) {
    return {
      taxes_enabled: false,
      gst_hst_rate: 0,
      gst_hst_amount: 0,
      qst_rate: 0,
      qst_amount: 0,
      custom_tax_label: null,
      custom_tax_rate: 0,
      custom_tax_amount: 0,
      tax_amount: 0,
      total_amount: roundMoney(subtotalAmount)
    };
  }

  const gstHstRate = Number(payload.gst_hst_rate || 0);
  const qstRate = Number(payload.qst_rate || 0);
  const customTaxRate = Number(payload.custom_tax_rate || 0);

  if (gstHstRate < 0 || qstRate < 0 || customTaxRate < 0) {
    throw createHttpError(
      'Les taux de taxes ne peuvent pas être négatifs.',
      422
    );
  }

  const gstHstAmount = roundMoney(subtotalAmount * (gstHstRate / 100));
  const qstAmount = roundMoney(subtotalAmount * (qstRate / 100));
  const customTaxAmount = roundMoney(subtotalAmount * (customTaxRate / 100));

  const taxAmount = roundMoney(gstHstAmount + qstAmount + customTaxAmount);
  const totalAmount = roundMoney(subtotalAmount + taxAmount);

  return {
    taxes_enabled: true,
    gst_hst_rate: roundRate(gstHstRate),
    gst_hst_amount: gstHstAmount,
    qst_rate: roundRate(qstRate),
    qst_amount: qstAmount,
    custom_tax_label: payload.custom_tax_label || null,
    custom_tax_rate: roundRate(customTaxRate),
    custom_tax_amount: customTaxAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount
  };
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function roundRate(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

export async function listInvoices(queryParams = {}, companyId) {
  requireCompanyId(companyId);

  const filters = validateInvoiceFilters(queryParams);

  return invoiceRepository.findInvoices(filters, companyId);
}

export async function getInvoiceById(id, companyId) {
  requireCompanyId(companyId);

  const invoice = await invoiceRepository.findInvoiceById(id, companyId);

  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }

  return invoice;
}

export async function createDraftInvoice(payload, userId, companyId) {
  requireCompanyId(companyId);

  const validation = validateCreateInvoicePayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const data = validation.data;

  const client = await invoiceRepository.findClientById(
    data.client_id,
    companyId
  );

  if (!client) {
    throw createHttpError(
      'Client introuvable pour cette entreprise.',
      404
    );
  }

  if (client.status !== 'actif') {
    throw createHttpError(
      'Impossible de créer une facture pour un client archivé.',
      409
    );
  }

  const invoiceItems = [];

  for (const item of data.items) {
    const dbItem = await invoiceRepository.findItemById(
      item.item_id,
      companyId
    );

    if (!dbItem) {
      throw createHttpError(
        'Un article ou service est introuvable pour cette entreprise.',
        404
      );
    }

    if (dbItem.status !== 'actif') {
      throw createHttpError(
        `L’article ou service "${dbItem.name}" est désactivé.`,
        409
      );
    }

    const isMemberClient = client.membership_status === 'membre';

    const catalogPrice = isMemberClient
      ? dbItem.member_price || dbItem.non_member_price || dbItem.default_price
      : dbItem.non_member_price || dbItem.default_price;

    const unitPrice =
      item.unit_price !== undefined &&
      item.unit_price !== null &&
      item.unit_price !== ''
        ? item.unit_price
        : catalogPrice;

    invoiceItems.push({
      item_id: dbItem.id,
      item_name: dbItem.name,
      description: item.description || dbItem.description || null,
      quantity: item.quantity,
      unit_price: unitPrice
    });
  }

  const totals = calculateInvoiceTotals(invoiceItems);
  const taxSummary = calculateTaxes(totals.subtotal_amount, data);

  return invoiceRepository.createInvoice({
    company_id: companyId,
    client_id: data.client_id,
    issue_date: data.issue_date || null,
    due_date: data.due_date || null,
    notes: data.notes || null,

    subtotal_amount: totals.subtotal_amount,
    total_amount: taxSummary.total_amount,
    paid_amount: 0,
    balance_due: taxSummary.total_amount,

    taxes_enabled: taxSummary.taxes_enabled,
    gst_hst_rate: taxSummary.gst_hst_rate,
    gst_hst_amount: taxSummary.gst_hst_amount,
    qst_rate: taxSummary.qst_rate,
    qst_amount: taxSummary.qst_amount,
    custom_tax_label: taxSummary.custom_tax_label,
    custom_tax_rate: taxSummary.custom_tax_rate,
    custom_tax_amount: taxSummary.custom_tax_amount,
    tax_amount: taxSummary.tax_amount,

    items: totals.items,
    created_by: userId
  });
}

export async function generateInvoice(id, userId, companyId) {
  requireCompanyId(companyId);

  const existing = await invoiceRepository.findInvoiceById(id, companyId);

  if (!existing) {
    throw createHttpError('Facture introuvable.', 404);
  }

  if (existing.status !== 'brouillon') {
    throw createHttpError(
      'Seule une facture brouillon peut être générée.',
      409
    );
  }

  const issueDate = existing.issue_date
    ? new Date(existing.issue_date)
    : new Date();

  const year = issueDate.getFullYear();

  const invoiceNumber = await invoiceRepository.getNextInvoiceNumber(
    companyId,
    year
  );

  const generated = await invoiceRepository.generateInvoice(
    id,
    companyId,
    invoiceNumber
  );

  if (!generated) {
    throw createHttpError(
      'Impossible de générer cette facture.',
      409
    );
  }

  return generated;
}

export async function generateInvoicePdf(id, companyId) {
  requireCompanyId(companyId);

  const invoice = await invoiceRepository.findInvoiceById(id, companyId);

  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }

  if (invoice.status === 'brouillon') {
    throw createHttpError(
      'La facture doit être générée officiellement avant de créer le PDF.',
      409
    );
  }

  if (!invoice.invoice_number) {
    throw createHttpError(
      'La facture doit avoir un numéro avant de créer le PDF.',
      409
    );
  }

  const pdfResult = await generateInvoicePdfFile(invoice);

  const updatedInvoice = await invoiceRepository.updateInvoicePdfUrl(
    id,
    companyId,
    pdfResult.pdfUrl
  );

  return {
    invoice: updatedInvoice,
    pdf_url: pdfResult.pdfUrl
  };
}

export async function getInvoicePdf(id, companyId) {
  requireCompanyId(companyId);

  const invoice = await invoiceRepository.findInvoiceById(id, companyId);

  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }

  if (!invoice.pdf_url) {
    throw createHttpError(
      'PDF non disponible pour cette facture.',
      404
    );
  }

  return {
    invoice_number: invoice.invoice_number,
    pdf_url: invoice.pdf_url
  };
}

function buildBackendStoragePath(publicUrl) {
  if (!publicUrl) {
    return null;
  }

  return path.resolve(process.cwd(), publicUrl.replace(/^\/+/, ''));
}

function getClientDisplayNameForEmail(invoice) {
  if (invoice.client_type === 'entreprise') {
    return invoice.company_name || invoice.client_name || 'client';
  }

  return invoice.client_name || 'client';
}

function getClientEmailForInvoice(invoice) {
  return invoice.billing_email || invoice.client_email || null;
}

function normalizeEmailField(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function buildDefaultInvoiceEmailBody({ invoice, settings }) {
  const clientName = getClientDisplayNameForEmail(invoice);
  const companyName = settings?.company_name || 'Votre fournisseur';
  const totalAmount = Number(invoice.total_amount || 0).toFixed(2);
  const balanceDue = Number(invoice.balance_due || 0).toFixed(2);

  return `Hello ${clientName},

Please find attached invoice ${invoice.invoice_number} from ${companyName}.

Invoice amount: ${totalAmount} CAD
Balance due: ${balanceDue} CAD

If you have any questions, you can reply directly to this email.

Thank you for your business.

${companyName}`;
}

export async function prepareInvoiceEmail(invoiceId, companyId) {
  requireCompanyId(companyId);

  const invoice = await invoiceRepository.findInvoiceById(invoiceId, companyId);

  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }

  if (!invoice.invoice_number) {
    throw createHttpError(
      'La facture doit être générée avant l’envoi par email.',
      409
    );
  }

  let pdfUrl = invoice.pdf_url;

  if (!pdfUrl) {
    const generatedPdf = await generateInvoicePdf(invoice.id, companyId);
    pdfUrl = generatedPdf.pdf_url;
  }

  const settings = await companySettingsRepository.getCompanySettings(companyId);

  if (!settings) {
    throw createHttpError(
      'Paramètres entreprise introuvables.',
      404
    );
  }

  const senderEmail = settings.company_email || null;
  const senderName = settings.company_name || null;
  const recipientEmail = getClientEmailForInvoice(invoice);

  const subject = `Invoice ${invoice.invoice_number} - ${senderName || 'Invoice'}`;

  const body = buildDefaultInvoiceEmailBody({
    invoice,
    settings
  });

  return {
    invoice: {
      id: invoice.id,
      company_id: invoice.company_id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      total_amount: invoice.total_amount,
      paid_amount: invoice.paid_amount,
      balance_due: invoice.balance_due,
      pdf_url: pdfUrl
    },
    client: {
      id: invoice.client_id,
      name: getClientDisplayNameForEmail(invoice),
      email: recipientEmail
    },
    email: {
      from: senderEmail,
      from_name: senderName,
      to: recipientEmail,
      cc: '',
      bcc: '',
      subject,
      body,
      attachment: {
        name: `${invoice.invoice_number}.pdf`,
        url: pdfUrl
      }
    }
  };
}

export async function sendInvoiceEmail(invoiceId, payload = {}, userId, companyId) {
  requireCompanyId(companyId);

  const prepared = await prepareInvoiceEmail(invoiceId, companyId);

  const fromEmail =
    normalizeEmailField(payload.from) || prepared.email.from;

  const fromName =
    normalizeEmailField(payload.from_name) || prepared.email.from_name;

  const recipientEmail =
    normalizeEmailField(payload.to) || prepared.email.to;

  const ccEmail = normalizeEmailField(payload.cc);
  const bccEmail = normalizeEmailField(payload.bcc);

  const subject =
    normalizeEmailField(payload.subject) || prepared.email.subject;

  const body =
    normalizeEmailField(payload.body) || prepared.email.body;

  if (!fromEmail) {
    throw createHttpError(
      'Email expéditeur manquant. Configurez l’email de l’entreprise dans les paramètres.',
      422
    );
  }

  if (!recipientEmail) {
    throw createHttpError(
      'Email destinataire manquant. Le client doit avoir un email ou un email de facturation.',
      422
    );
  }

  if (!subject) {
    throw createHttpError('L’objet de l’email est obligatoire.', 422);
  }

  if (!body) {
    throw createHttpError('Le contenu de l’email est obligatoire.', 422);
  }

  const attachmentUrl = prepared.email.attachment.url;
  const attachmentName = prepared.email.attachment.name;
  const attachmentPath = buildBackendStoragePath(attachmentUrl);

  if (!attachmentPath || !fs.existsSync(attachmentPath)) {
    throw createHttpError(
      'Fichier PDF introuvable. Veuillez régénérer la facture.',
      404
    );
  }

  try {
    const result = await sendEmailWithAttachment({
      fromName,
      fromEmail,
      replyTo: fromEmail,
      to: recipientEmail,
      cc: ccEmail,
      bcc: bccEmail,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br />'),
      attachments: [
        {
          filename: attachmentName,
          path: attachmentPath
        }
      ]
    });

    const log = await invoiceRepository.createInvoiceEmailLog({
      company_id: companyId,
      invoice_id: invoiceId,
      sender_email: fromEmail,
      sender_name: fromName,
      recipient_email: recipientEmail,
      cc_email: ccEmail,
      bcc_email: bccEmail,
      subject,
      body,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      status: 'sent',
      error_message: null,
      sent_by: userId
    });

    return {
      message_id: result.messageId,
      email: {
        from: fromEmail,
        from_name: fromName,
        to: recipientEmail,
        cc: ccEmail,
        bcc: bccEmail,
        subject,
        attachment: {
          name: attachmentName,
          url: attachmentUrl
        }
      },
      log
    };
  } catch (error) {
    const log = await invoiceRepository.createInvoiceEmailLog({
      company_id: companyId,
      invoice_id: invoiceId,
      sender_email: fromEmail,
      sender_name: fromName,
      recipient_email: recipientEmail,
      cc_email: ccEmail,
      bcc_email: bccEmail,
      subject,
      body,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      status: 'failed',
      error_message: error.message,
      sent_by: userId
    });

    throw createHttpError(
      `Échec de l’envoi email : ${error.message}`,
      500,
      [log]
    );
  }
}

export async function listInvoiceEmailLogs(invoiceId, companyId) {
  requireCompanyId(companyId);

  const invoice = await invoiceRepository.findInvoiceById(invoiceId, companyId);

  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }

  return invoiceRepository.findInvoiceEmailLogs(invoiceId, companyId);
}