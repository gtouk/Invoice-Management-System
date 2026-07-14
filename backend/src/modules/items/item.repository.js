import { query } from '../../database/db.js';

const itemSelectFields = `
  id,
  company_id,
  name,
  description,
  item_type,
  default_price,
  member_price,
  non_member_price,
  status,
  created_by,
  created_at,
  updated_at,
  disabled_at
`;

export async function findAllItems(filters = {}, companyId) {
  const values = [companyId];
  const conditions = ['company_id = $1'];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`
      (
        name ILIKE $${values.length}
        OR description ILIKE $${values.length}
      )
    `);
  }

  if (filters.item_type) {
    values.push(filters.item_type);
    conditions.push(`item_type = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  } else {
    conditions.push(`status = 'actif'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await query(
    `
      SELECT
        ${itemSelectFields}
      FROM items
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values
  );

  return result.rows;
}

export async function findItemById(id, companyId) {
  const result = await query(
    `
      SELECT
        ${itemSelectFields}
      FROM items
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function findActiveItemByName(name, companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        name
      FROM items
      WHERE LOWER(name) = LOWER($1)
        AND company_id = $2
        AND status = 'actif'
      LIMIT 1
    `,
    [name, companyId]
  );

  return result.rows[0] || null;
}

export async function createItem(data) {
  const result = await query(
    `
      INSERT INTO items (
        company_id,
        name,
        description,
        item_type,
        default_price,
        member_price,
        non_member_price,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'actif', $8)
      RETURNING
        ${itemSelectFields}
    `,
    [
      data.company_id,
      data.name,
      data.description || null,
      data.item_type,
      data.default_price,
      data.member_price,
      data.non_member_price,
      data.created_by || null
    ]
  );

  return result.rows[0];
}

export async function updateItem(id, data, companyId) {
  const result = await query(
    `
      UPDATE items
      SET
        name = $1,
        description = $2,
        item_type = $3,
        default_price = $4,
        member_price = $5,
        non_member_price = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
        AND company_id = $8
      RETURNING
        ${itemSelectFields}
    `,
    [
      data.name,
      data.description || null,
      data.item_type,
      data.default_price,
      data.member_price,
      data.non_member_price,
      id,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function disableItem(id, companyId) {
  const result = await query(
    `
      UPDATE items
      SET
        status = 'desactive',
        disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND company_id = $2
      RETURNING
        ${itemSelectFields}
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function reactivateItem(id, companyId) {
  const result = await query(
    `
      UPDATE items
      SET
        status = 'actif',
        disabled_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND company_id = $2
      RETURNING
        ${itemSelectFields}
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}

export async function isItemUsedInInvoice(id, companyId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM invoice_items ii
      INNER JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.item_id = $1
        AND i.company_id = $2
    `,
    [id, companyId]
  );

  return result.rows[0].count > 0;
}

export async function deleteItem(id, companyId) {
  const result = await query(
    `
      DELETE FROM items
      WHERE id = $1
        AND company_id = $2
      RETURNING id
    `,
    [id, companyId]
  );

  return result.rows[0] || null;
}