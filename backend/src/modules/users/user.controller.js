import { successResponse } from '../../utils/response.util.js';
import * as userService from './user.service.js';

export async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(
      req.query,
      req.user?.company_id
    );

    return res.status(200).json({
      success: true,
      message: 'Liste des utilisateurs',
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await userService.getUser(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail utilisateur', user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(
      req.body,
      req.user?.id,
      req.user?.company_id,
      req.user?.role
    );

    return successResponse(
      res,
      'Utilisateur créé avec succès',
      user,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.company_id,
      req.user?.role
    );

    return successResponse(
      res,
      'Utilisateur mis à jour avec succès',
      user
    );
  } catch (error) {
    next(error);
  }
}

export async function updateUserPassword(req, res, next) {
  try {
    const result = await userService.updateUserPassword(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Mot de passe utilisateur mis à jour avec succès',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function disableUser(req, res, next) {
  try {
    const user = await userService.disableUser(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Utilisateur désactivé avec succès',
      user
    );
  } catch (error) {
    next(error);
  }
}

export async function reactivateUser(req, res, next) {
  try {
    const user = await userService.reactivateUser(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Utilisateur réactivé avec succès',
      user
    );
  } catch (error) {
    next(error);
  }
}