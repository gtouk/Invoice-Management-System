import { successResponse } from '../../utils/response.util.js';
import * as authService from './auth.service.js';

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    const result = await authService.login(identifier, password);

    return successResponse(res, 'Connexion reussie', result);
  } catch (error) {
    next(error);
  }
}

export async function registerCompany(req, res, next) {
  try {
    const result = await authService.registerCompany(req.body);

    return successResponse(
      res,
      'Espace entreprise créé avec succès',
      result,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return successResponse(res, 'Utilisateur connecte', user);
  } catch (error) {
    next(error);
  }
}