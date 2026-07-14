import * as clientPortalRepository from './clientPortal.repository.js';
import fs from 'fs';
import {
  resolveInvoicePdfAbsolutePath,
  getInvoiceDownloadApiPath
} from '../../utils/storage.util.js';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getCurrentClientOrFail(userId) {
  const client = await clientPortalRepository.findClientByUserId(userId);
  if (!client) {
    throw createHttpError('Aucun dossier client n est lie a ce compte.', 404);
  }

  if (client.status !== 'actif') {
    throw createHttpError('Votre dossier client n est pas actif.', 403);
  }

  return client;
}

export async function getProfile(userId) {
  const client = await getCurrentClientOrFail(userId);

  return {
    id: client.id,
    client_code: client.client_code,
    full_name: client.full_name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    client_type: client.client_type,
    status: client.status,
    created_at: client.created_at
  };
}

export async function getSummary(userId) {
  const client = await getCurrentClientOrFail(userId);

  return {
    client_id: client.id,
    full_name: client.full_name,
    total_invoiced: Number(client.total_invoiced || 0),
    total_paid: Number(client.total_paid || 0),
    balance_due: Number(client.balance_due || 0)
  };
}

export async function getDashboard(userId) {
  const client = await getCurrentClientOrFail(userId);

  if (!client.company_id) {
    throw createHttpError('Entreprise client introuvable.', 404);
  }

  const [stats, recentInvoices, recentPayments] = await Promise.all([
    clientPortalRepository.getClientDashboardStats(client.id, client.company_id),
    clientPortalRepository.listRecentInvoicesForClient(
      client.id,
      client.company_id,
      5
    ),
    clientPortalRepository.listRecentPaymentsForClient(
      client.id,
      client.company_id,
      5
    )
  ]);

  return {
    invoices_count: Number(stats.invoices_count || 0),
    paid_invoices_count: Number(stats.paid_invoices_count || 0),
    unpaid_invoices_count: Number(stats.unpaid_invoices_count || 0),
    partial_invoices_count: Number(stats.partial_invoices_count || 0),
    overdue_invoices_count: Number(stats.overdue_invoices_count || 0),
    total_invoiced: Number(stats.total_invoiced || 0),
    total_paid: Number(stats.total_paid || 0),
    total_balance_due: Number(stats.total_balance_due || 0),
    recent_invoices: recentInvoices,
    recent_payments: recentPayments
  };
}

export async function listInvoices(userId) {
  const client = await getCurrentClientOrFail(userId);
  return clientPortalRepository.listInvoicesByClientId(client.id);
}

export async function getInvoice(userId, invoiceId) {
  const client = await getCurrentClientOrFail(userId);
  const invoice = await clientPortalRepository.findInvoiceForClient(invoiceId, client.id);
  if (!invoice) {
    throw createHttpError('Facture introuvable.', 404);
  }
  return invoice;
}

export async function getInvoicePdf(userId, invoiceId) {
  const invoice = await getInvoice(userId, invoiceId);
  const absolutePath = resolveInvoicePdfAbsolutePath(invoice);

  if (!absolutePath) {
    throw createHttpError('PDF non disponible pour cette facture.', 404);
  }

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    download_url: getInvoiceDownloadApiPath(invoice.id)
  };
}

export async function downloadInvoicePdf(userId, invoiceId) {
  const invoice = await getInvoice(userId, invoiceId);
  const absolutePath = resolveInvoicePdfAbsolutePath(invoice);

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw createHttpError('PDF non disponible pour cette facture.', 404);
  }

  return {
    absolutePath,
    fileName: `${invoice.invoice_number || invoice.id}.pdf`
  };
}

export async function listPayments(userId) {
  const client = await getCurrentClientOrFail(userId);
  return clientPortalRepository.listPaymentsByClientId(client.id);
}
