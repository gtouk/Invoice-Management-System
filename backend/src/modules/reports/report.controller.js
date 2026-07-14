import { successResponse } from '../../utils/response.util.js';
import * as reportService from './report.service.js';

export async function getDashboard(req, res, next) {
  try {
    const dashboard = await reportService.getDashboard(req.user?.company_id);

    return successResponse(
      res,
      'Tableau de bord entreprise',
      dashboard
    );
  } catch (error) {
    next(error);
  }
}

export async function getReports(req, res, next) {
  try {
    const reports = await reportService.getReports(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Rapports entreprise',
      reports
    );
  } catch (error) {
    next(error);
  }
}

export async function getReportsSummary(req, res, next) {
  try {
    const data = await reportService.getReportsSummary(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Résumé rapports récupéré avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}

export async function getRevenueByMonth(req, res, next) {
  try {
    const data = await reportService.getRevenueByMonth(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Revenus par mois récupérés avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}

export async function getInvoicesByStatus(req, res, next) {
  try {
    const data = await reportService.getInvoicesByStatusReport(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Factures par statut récupérées avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}

export async function getTopClients(req, res, next) {
  try {
    const data = await reportService.getTopClientsReport(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Top clients récupérés avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}

export async function getPaymentsByMethod(req, res, next) {
  try {
    const data = await reportService.getPaymentsByMethodReport(
      req.user?.company_id,
      req.query
    );

    return successResponse(
      res,
      'Paiements par méthode récupérés avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}
