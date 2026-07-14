import { successResponse } from '../../utils/response.util.js';
import * as superAdminService from './superAdmin.service.js';
import { createAuditLog, getRequestAuditContext } from '../../utils/audit.util.js';

export async function getPlatformStats(req, res, next) {
  try {
    const stats = await superAdminService.getPlatformStats();
    return successResponse(
      res,
      'Statistiques plateforme récupérées avec succès.',
      stats
    );
  } catch (error) {
    next(error);
  }
}

export async function listCompanies(req, res, next) {
  try {
    const result = await superAdminService.listCompanies(req.query);

    return res.status(200).json({
      success: true,
      message: 'Entreprises récupérées avec succès.',
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

export async function getCompanyDetails(req, res, next) {
  try {
    const company = await superAdminService.getCompanyDetails(req.params.id);
    return successResponse(
      res,
      'Détail entreprise récupéré avec succès.',
      company
    );
  } catch (error) {
    next(error);
  }
}

export async function suspendCompany(req, res, next) {
  try {
    const company = await superAdminService.suspendCompany(req.params.id);
    const audit = getRequestAuditContext(req);

    await createAuditLog({
      ...audit,
      companyId: company.id,
      action: 'company_suspended',
      entityType: 'company',
      entityId: company.id,
      metadata: { status: company.status }
    });

    return successResponse(
      res,
      'Entreprise suspendue avec succès.',
      company
    );
  } catch (error) {
    next(error);
  }
}

export async function activateCompany(req, res, next) {
  try {
    const company = await superAdminService.activateCompany(req.params.id);
    const audit = getRequestAuditContext(req);

    await createAuditLog({
      ...audit,
      companyId: company.id,
      action: 'company_activated',
      entityType: 'company',
      entityId: company.id,
      metadata: { status: company.status }
    });

    return successResponse(
      res,
      'Entreprise activée avec succès.',
      company
    );
  } catch (error) {
    next(error);
  }
}

export async function getCompanyUsers(req, res, next) {
  try {
    const users = await superAdminService.getCompanyUsers(req.params.id);
    return successResponse(
      res,
      'Utilisateurs entreprise récupérés avec succès.',
      users
    );
  } catch (error) {
    next(error);
  }
}

export async function getCompanySummary(req, res, next) {
  try {
    const summary = await superAdminService.getCompanySummary(req.params.id);
    return successResponse(
      res,
      'Résumé entreprise récupéré avec succès.',
      summary
    );
  } catch (error) {
    next(error);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const result = await superAdminService.listAuditLogs(req.query);
    return successResponse(
      res,
      'Logs d’audit plateforme récupérés avec succès.',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogFilterOptions(req, res, next) {
  try {
    const options = await superAdminService.getAuditLogFilterOptions();
    return successResponse(
      res,
      'Options de filtres audit récupérées avec succès.',
      options
    );
  } catch (error) {
    next(error);
  }
}
