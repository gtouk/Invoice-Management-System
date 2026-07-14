import { successResponse } from '../../utils/response.util.js';
import * as commissionService from './commission.service.js';

export async function getExchangeRate(req, res, next) {
  try {
    const rate = await commissionService.getExchangeRate(req.query);

    return successResponse(
      res,
      'Taux de change récupéré avec succès',
      rate
    );
  } catch (error) {
    next(error);
  }
}

export async function calculateCommission(req, res, next) {
  try {
    const result = await commissionService.calculateCommission(req.body);

    return successResponse(
      res,
      'Calcul de commission effectué avec succès',
      result
    );
  } catch (error) {
    next(error);
  }
}
