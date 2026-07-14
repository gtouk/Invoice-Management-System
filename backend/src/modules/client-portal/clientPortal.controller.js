import { successResponse } from '../../utils/response.util.js';
import * as clientPortalService from './clientPortal.service.js';
import { sendFileDownload } from '../../services/storage.service.js';

export async function getProfile(req, res, next) {
  try {
    const data = await clientPortalService.getProfile(req.user.id);
    return successResponse(res, 'Profil client', data);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req, res, next) {
  try {
    const data = await clientPortalService.getSummary(req.user.id);
    return successResponse(res, 'Resume client', data);
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await clientPortalService.getDashboard(req.user.id);
    return successResponse(
      res,
      'Tableau de bord client récupéré avec succès.',
      data
    );
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req, res, next) {
  try {
    const data = await clientPortalService.listInvoices(req.user.id);
    return successResponse(res, 'Factures du client', data);
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const data = await clientPortalService.getInvoice(req.user.id, req.params.id);
    return successResponse(res, 'Detail facture client', data);
  } catch (err) {
    next(err);
  }
}

export async function getInvoicePdf(req, res, next) {
  try {
    const data = await clientPortalService.getInvoicePdf(req.user.id, req.params.id);
    return successResponse(res, 'PDF facture client', data);
  } catch (err) {
    next(err);
  }
}

export async function downloadInvoicePdf(req, res, next) {
  try {
    const result = await clientPortalService.downloadInvoicePdf(
      req.user.id,
      req.params.id
    );

    return sendFileDownload(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const data = await clientPortalService.listPayments(req.user.id);
    return successResponse(res, 'Paiements du client', data);
  } catch (err) {
    next(err);
  }
}
