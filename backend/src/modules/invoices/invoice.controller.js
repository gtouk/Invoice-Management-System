import { successResponse } from '../../utils/response.util.js';
import * as invoiceService from './invoice.service.js';

export async function listInvoices(req, res, next) {
  try {
    const result = await invoiceService.listInvoices(
      req.query,
      req.user?.company_id
    );

    return res.status(200).json({
      success: true,
      message: 'Liste des factures',
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceById(req, res, next) {
  try {
    const invoice = await invoiceService.getInvoiceById(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail de la facture', invoice);
  } catch (error) {
    next(error);
  }
}

export async function createDraftInvoice(req, res, next) {
  try {
    const invoice = await invoiceService.createDraftInvoice(
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Facture brouillon créée avec succès',
      invoice,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function generateInvoice(req, res, next) {
  try {
    const invoice = await invoiceService.generateInvoice(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Facture générée avec succès',
      invoice
    );
  } catch (error) {
    next(error);
  }
}

export async function generateInvoicePdf(req, res, next) {
  try {
    const result = await invoiceService.generateInvoicePdf(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'PDF généré avec succès', result);
  } catch (error) {
    next(error);
  }
}

export async function getInvoicePdf(req, res, next) {
  try {
    const result = await invoiceService.getInvoicePdf(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'PDF de la facture', result);
  } catch (error) {
    next(error);
  }
}

export async function prepareInvoiceEmail(req, res, next) {
  try {
    const result = await invoiceService.prepareInvoiceEmail(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Email de facture préparé',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function sendInvoiceEmail(req, res, next) {
  try {
    const result = await invoiceService.sendInvoiceEmail(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Facture envoyée par email avec succès',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceEmailLogs(req, res, next) {
  try {
    const logs = await invoiceService.listInvoiceEmailLogs(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Historique email de la facture',
      logs
    );
  } catch (error) {
    next(error);
  }
}