import { successResponse } from '../../utils/response.util.js';
import * as itemService from './item.service.js';

export async function listItems(req, res, next) {
  try {
    const items = await itemService.listItems(
      req.query,
      req.user?.company_id
    );

    return successResponse(res, 'Liste des articles ou services', items);
  } catch (error) {
    next(error);
  }
}

export async function getItem(req, res, next) {
  try {
    const item = await itemService.getItem(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail de l’article ou service', item);
  } catch (error) {
    next(error);
  }
}

export async function createItem(req, res, next) {
  try {
    const item = await itemService.createItem(
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Article ou service créé avec succès',
      item,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const item = await itemService.updateItem(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Article ou service modifié avec succès',
      item
    );
  } catch (error) {
    next(error);
  }
}

export async function disableItem(req, res, next) {
  try {
    const item = await itemService.disableItem(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Article ou service désactivé avec succès',
      item
    );
  } catch (error) {
    next(error);
  }
}

export async function reactivateItem(req, res, next) {
  try {
    const item = await itemService.reactivateItem(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Article ou service réactivé avec succès',
      item
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const deleted = await itemService.deleteItem(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Article ou service supprimé avec succès',
      deleted
    );
  } catch (error) {
    next(error);
  }
}