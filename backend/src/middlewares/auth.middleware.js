import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non connecte'
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.jwtAccessSecret);

    req.user = {
      id: payload.sub,
      role: payload.role,
      company_id: payload.company_id,
      company_name: payload.company_name
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expire'
    });
  }
}