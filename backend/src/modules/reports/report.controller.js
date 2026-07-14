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