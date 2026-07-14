import { query } from '../../database/db.js';

const userSelectFields = `
  u.id,
  u.company_id,
  u.full_name,
  u.email,
  u.username,
  u.phone,
  u.status,
  u.role_id,
  r.name AS role,
  u.last_login_at,
  u.created_at,
  u.updated_at
`;

export async function findUsers(filters = {}, companyId) {
  const values = [companyId];
  const conditions = ['u.company_id = $1'];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`
      (
        u.full_name ILIKE $${values.length}
        OR u.email ILIKE $${values.length}
        OR u.username ILIKE $${values.length}
        OR u.phone ILIKE $${values.length}
      )
    `);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`u.status = $${values.length}`);
  }

  if (filters.role) {
    values.push(filters.role);
    conditions.push(`r.name = $${values.length}`);
  }

  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 20);
  const offset = (page - 1) * limit;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      ${whereClause}
    `,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `
      SELECT ${userSelectFields}
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  return {
    data: result.rows,
    meta: {
      page,
      limit,
      total: countResult.rows[0].total
    }
  };
}

export async function findUserById(id, companyId) {
  const result = await query(
    `
      SELECT ${userSelectFields}
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
        AND u.company_id = $2
      LIMIT 1
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function findUserByEmailOrUsername({ email, username }) {
  const result = await query(
    `
      SELECT id, email, username
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(username) = LOWER($2)
      LIMIT 1
    `,
    [email, username]
  );

  return result.rows[0] || null;
}

export async function findRoleByName(roleName) {
  const result = await query(
    `
      SELECT id, name
      FROM roles
      WHERE name = $1
      LIMIT 1
    `,
    [roleName]
  );

  return result.rows[0] || null;
}

export async function createUser(data) {
  const result = await query(
    `
      INSERT INTO users (
        company_id,
        full_name,
        email,
        username,
        password_hash,
        phone,
        role_id,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'actif', CURRENT_TIMESTAMP)
      RETURNING
        id,
        company_id,
        full_name,
        email,
        username,
        phone,
        status,
        role_id,
        created_at,
        updated_at
    `,
    [
      data.company_id,
      data.full_name,
      data.email,
      data.username,
      data.password_hash,
      data.phone || null,
      data.role_id
    ]
  );

  return result.rows[0];
}

export async function updateUser(id, companyId, data) {
  const result = await query(
    `
      UPDATE users
      SET
        full_name = $1,
        email = $2,
        username = $3,
        phone = $4,
        role_id = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
        AND company_id = $7
      RETURNING
        id,
        company_id,
        full_name,
        email,
        username,
        phone,
        status,
        role_id,
        created_at,
        updated_at
    `,
    [
      data.full_name,
      data.email,
      data.username,
      data.phone || null,
      data.role_id,
      id,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function updateUserPassword(id, companyId, passwordHash) {
  const result = await query(
    `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND company_id = $3
      RETURNING id, company_id, updated_at
    `,
    [passwordHash, id, companyId]
  );

  return result.rows[0] || null;
}

export async function updateUserStatus(id, companyId, status) {
  const result = await query(
    `
      UPDATE users
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND company_id = $3
      RETURNING
        id,
        company_id,
        full_name,
        email,
        username,
        phone,
        status,
        role_id,
        created_at,
        updated_at
    `,
    [status, id, companyId]
  );

  return result.rows[0] || null;
}

export async function getUserWithRole(id, companyId) {
  const result = await query(
    `
      SELECT
        u.id,
        u.company_id,
        u.full_name,
        u.email,
        u.username,
        u.phone,
        u.status,
        r.name AS role
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
        AND u.company_id = $2
      LIMIT 1
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}