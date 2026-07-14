import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../database/db.js';

const TENANT_ROLES = ['admin', 'company_admin', 'employee', 'client'];

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Utilisateur non connecte'
    });
  }

  let payload;

  try {
    const token = authHeader.split(' ')[1];
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expire'
    });
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    company_id: payload.company_id,
    company_name: payload.company_name
  };

  if (req.user.role === 'super_admin') {
    return next();
  }

  if (TENANT_ROLES.includes(req.user.role) && !req.user.company_id) {
    return res.status(403).json({
      success: false,
      message: 'Aucune entreprise associée à cet utilisateur.',
      errors: []
    });
  }

  if (!req.user.company_id) {
    return next();
  }

  try {
    const companyResult = await query(
      `
        SELECT status
        FROM companies
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.company_id]
    );

    const company = companyResult.rows[0];

    if (!company || company.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Votre entreprise est suspendue. Contactez le support.',
        errors: []
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
