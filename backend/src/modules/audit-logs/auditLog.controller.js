import { successResponse } from '../../utils/response.util.js';
import * as auditLogService from './auditLog.service.js';

export async function listAuditLogs(req, res, next) {
  try {
    const result = await auditLogService.listCompanyAuditLogs(
      req.user,
      req.query
    );

    return successResponse(
      res,
      'Logs d’audit récupérés avec succès.',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogFilterOptions(req, res, next) {
  try {
    const options = await auditLogService.getCompanyFilterOptions(req.user);

    return successResponse(
      res,
      'Options de filtres audit récupérées avec succès.',
      options
    );
  } catch (error) {
    next(error);
  }
}
