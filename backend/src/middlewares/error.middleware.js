import { errorResponse } from '../utils/response.util.js';

export function notFoundMiddleware(req, res) {
  return errorResponse(res, 'Route introuvable', 404);
}

export function errorMiddleware(err, req, res, next) {
  console.error(err);
  return errorResponse(res, err.message || 'Erreur serveur', err.statusCode || 500);
}
