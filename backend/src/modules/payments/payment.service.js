import * as paymentRepository from './payment.repository.js';
import { query } from '../../database/db.js';

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

function normalizePaymentPayload(payload = {}) {
  const errors = [];

  const invoiceId = payload.invoice_id;
  const amount = Number(payload.amount);
  const paymentMethod = payload.payment_method?.trim();
  const paymentDate =
    payload.payment_date || new Date().toISOString().slice(0, 10);

  if (!invoiceId) {
    errors.push('La facture est obligatoire.');
  }

  if (!amount || Number.isNaN(amount) || amount <= 0) {
    errors.push('Le montant du paiement doit être supérieur à zéro.');
  }

  if (!paymentMethod) {
    errors.push('Le mode de paiement est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      invoice_id: invoiceId,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference: payload.reference?.trim() || null,
      notes: payload.notes?.trim() || null
    }
  };
}

function calculateInvoiceStatus(totalAmount, paidAmount, balanceDue) {
  if (balanceDue <= 0) {
    return 'payee';
  }

  if (paidAmount > 0 && paidAmount < totalAmount) {
    return 'partiellement_payee';
  }

  return 'non_payee';
}

async function writeAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null
}) {
  await query(
    `
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      userId || null,
      action,
      entityType,
      entityId || null,
      oldValues,
      newValues
    ]
  );
}

export async function listPayments(queryParams = {}, companyId) {
  requireCompanyId(companyId);

  return paymentRepository.findPayments(queryParams, companyId);
}

export async function getPaymentById(id, companyId) {
  requireCompanyId(companyId);

  const payment = await paymentRepository.findPaymentById(id, companyId);

  if (!payment) {
    throw createHttpError('Paiement introuvable.', 404);
  }

  return payment;
}

export async function createPayment(payload, userId, companyId) {
  requireCompanyId(companyId);

  const validation = normalizePaymentPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const data = validation.data;

  const invoice = await paymentRepository.findInvoiceForPayment(
    data.invoice_id,
    companyId
  );

  if (!invoice) {
    throw createHttpError(
      'Facture introuvable pour cette entreprise.',
      404
    );
  }

  if (invoice.cancelled_at || invoice.status === 'annulee') {
    throw createHttpError(
      'Impossible d’enregistrer un paiement sur une facture annulée.',
      409
    );
  }

  if (invoice.status === 'brouillon') {
    throw createHttpError(
      'Impossible d’enregistrer un paiement sur une facture brouillon.',
      409
    );
  }

  const totalAmount = Number(invoice.total_amount || 0);
  const currentPaidAmount = Number(invoice.paid_amount || 0);
  const currentBalanceDue = Number(invoice.balance_due || 0);

  if (currentBalanceDue <= 0 || invoice.status === 'payee') {
    throw createHttpError(
      'Cette facture est déjà totalement payée.',
      409
    );
  }

  if (data.amount > currentBalanceDue) {
    throw createHttpError(
      `Le montant du paiement ne peut pas dépasser le solde restant (${currentBalanceDue.toFixed(2)}).`,
      422
    );
  }

  const newPaidAmount = currentPaidAmount + data.amount;
  const newBalanceDue = Math.max(totalAmount - newPaidAmount, 0);

  const newStatus = calculateInvoiceStatus(
    totalAmount,
    newPaidAmount,
    newBalanceDue
  );

  const payment = await paymentRepository.createPayment({
    company_id: companyId,
    invoice_id: invoice.id,
    client_id: invoice.client_id,
    amount: data.amount,
    payment_date: data.payment_date,
    payment_method: data.payment_method,
    reference: data.reference,
    notes: data.notes,
    created_by: userId
  });

  const updatedInvoice =
    await paymentRepository.updateInvoicePaymentSummary(
      invoice.id,
      companyId,
      {
        paid_amount: newPaidAmount,
        balance_due: newBalanceDue,
        status: newStatus
      }
    );

  await writeAuditLog({
    userId,
    action: 'payment_created',
    entityType: 'payment',
    entityId: payment.id,
    newValues: {
      payment,
      invoice_before: invoice,
      invoice_after: updatedInvoice
    }
  });

  return {
    payment,
    invoice: updatedInvoice,
    summary: {
      invoice_id: invoice.id,
      paid_amount: updatedInvoice.paid_amount,
      balance_due: updatedInvoice.balance_due,
      invoice_status: updatedInvoice.status
    }
  };
}

export async function listPaymentsByInvoice(invoiceId, companyId) {
  requireCompanyId(companyId);

  const invoice = await paymentRepository.findInvoiceForPayment(
    invoiceId,
    companyId
  );

  if (!invoice) {
    throw createHttpError(
      'Facture introuvable pour cette entreprise.',
      404
    );
  }

  return paymentRepository.findPaymentsByInvoice(invoiceId, companyId);
}

export async function listPaymentsByClient(clientId, companyId) {
  requireCompanyId(companyId);

  return paymentRepository.findPaymentsByClient(clientId, companyId);
}