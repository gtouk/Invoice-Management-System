import { successResponse } from '../../utils/response.util.js';
import * as clientService from './client.service.js';

export async function listClients(req, res, next) {
  try {
    const result = await clientService.listClients(
      req.query,
      req.user?.company_id
    );

    return res.status(200).json({
      success: true,
      message: 'Liste des clients',
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

export async function getClient(req, res, next) {
  try {
    const client = await clientService.getClient(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail du client', client);
  } catch (error) {
    next(error);
  }
}

export async function createClient(req, res, next) {
  try {
    const client = await clientService.createClient(
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(res, 'Client cree avec succes', client, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateClient(req, res, next) {
  try {
    const client = await clientService.updateClient(
      req.params.id,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(res, 'Client modifie avec succes', client);
  } catch (error) {
    next(error);
  }
}

export async function archiveClient(req, res, next) {
  try {
    const client = await clientService.archiveClient(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(res, 'Client archive avec succes', client);
  } catch (error) {
    next(error);
  }
}

export async function reactivateClient(req, res, next) {
  try {
    const client = await clientService.reactivateClient(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(res, 'Client reactive avec succes', client);
  } catch (error) {
    next(error);
  }
}

export async function deleteClient(req, res, next) {
  try {
    const deletedClient = await clientService.deleteClient(
      req.params.id,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Client supprime avec succes',
      deletedClient
    );
  } catch (error) {
    next(error);
  }
}

export async function getClientHistory(req, res, next) {
  try {
    const history = await clientService.getClientHistory(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Historique du client', history);
  } catch (error) {
    next(error);
  }
}