import * as clientPortalRepository from './clientPortal.repository.js';

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
  if (!invoice.pdf_url) {
    throw createHttpError('PDF non disponible pour cette facture.', 404);
  }

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    pdf_url: invoice.pdf_url
  };
}

export async function listPayments(userId) {
  const client = await getCurrentClientOrFail(userId);
  return clientPortalRepository.listPaymentsByClientId(client.id);
}
