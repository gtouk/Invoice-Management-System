import { query } from '../database/db.js';

export async function createAuditLog({
  companyId = null,
  userId = null,
  actorRole = null,
  action,
  entityType = null,
  entityId = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
  oldValues = null,
  newValues = null
} = {}) {
  if (!action) {
    return null;
  }

  try {
    const result = await query(
      `
        INSERT INTO audit_logs (
          company_id,
          user_id,
          actor_role,
          action,
          entity_type,
          entity_id,
          ip_address,
          user_agent,
          metadata,
          old_values,
          new_values,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb,
          $10::jsonb,
          $11::jsonb,
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `,
      [
        companyId,
        userId,
        actorRole,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        JSON.stringify(metadata || {}),
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null
      ]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[audit] failed to write audit log:', error.message);
    return null;
  }
}

export function getRequestAuditContext(req) {
  return {
    ipAddress:
      req?.headers?.['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
      req?.ip ||
      null,
    userAgent: req?.headers?.['user-agent'] || null,
    userId: req?.user?.id || null,
    actorRole: req?.user?.role || null,
    companyId: req?.user?.company_id || null
  };
}
