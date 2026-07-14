import { successResponse } from '../../utils/response.util.js';
import * as dashboardService from './dashboard.service.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const data = await dashboardService.getDashboardSummary(req.user);

    return successResponse(
      res,
      'Tableau de bord entreprise récupéré avec succès.',
      data
    );
  } catch (error) {
    next(error);
  }
}
