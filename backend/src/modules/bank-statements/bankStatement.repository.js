import { query } from '../../database/db.js';

export async function findBankStatements(filters = {}) {
  const values = [];
  const conditions = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`bs.status = $${values.length}`);
  }

  if (filters.source_type) {
    values.push(filters.source_type);
    conditions.push(`bs.source_type = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`bs.file_name ILIKE $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT
        bs.id,
        bs.file_name,
        bs.file_url,
        bs.source_type,
        bs.status,
        bs.imported_by,
        u.full_name AS imported_by_name,
        bs.imported_at,
        bs.processed_at,
        bs.notes,
        COUNT(bt.id)::int AS transactions_count
      FROM bank_statements bs
      LEFT JOIN users u ON u.id = bs.imported_by
      LEFT JOIN bank_transactions bt ON bt.bank_statement_id = bs.id
      ${whereClause}
      GROUP BY bs.id, u.full_name
      ORDER BY bs.imported_at DESC
    `,
    values
  );

  return result.rows;
}

export async function findBankStatementById(id, companyId = null) {
  const values = [id];
  const conditions = ['bs.id = $1'];

  if (companyId) {
    values.push(companyId);
    conditions.push(`bs.company_id = $${values.length}`);
  }

  const result = await query(
    `
      SELECT
        bs.id,
        bs.company_id,
        bs.file_name,
        bs.file_url,
        bs.source_type,
        bs.status,
        bs.imported_by,
        u.full_name AS imported_by_name,
        bs.imported_at,
        bs.processed_at,
        bs.notes
      FROM bank_statements bs
      LEFT JOIN users u ON u.id = bs.imported_by
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
    `,
    values
  );

  return result.rows[0] || null;
}

function normalizeBankTransactionData(data) {
  const withdrawalAmount = Number(data.withdrawal_amount || 0);
  const depositAmount = Number(data.deposit_amount || 0);
  const amount = Number(data.amount || depositAmount || withdrawalAmount || 0);

  let transactionType = data.transaction_type;

  if (!transactionType) {
    transactionType = withdrawalAmount > 0 ? 'retrait' : 'depot';
  }

  if (!['depot', 'retrait', 'frais'].includes(transactionType)) {
    transactionType = 'depot';
  }

  return {
    ...data,
    transaction_type: transactionType,
    description: data.description || data.raw_text || data.extracted_client_name || null,
    amount,
    withdrawal_amount:
      transactionType === 'depot' ? 0 : withdrawalAmount || amount,
    deposit_amount:
      transactionType === 'depot' ? depositAmount || amount : 0,
    balance_after:
      data.balance_after === undefined || data.balance_after === null || data.balance_after === ''
        ? null
        : Number(data.balance_after)
  };
}

export async function createBankTransaction(data) {
  const result = await query(
    `
      INSERT INTO bank_transactions (
        company_id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        transaction_type,
        description,
        amount,
        withdrawal_amount,
        deposit_amount,
        balance_after,
        reference,
        raw_text,
        status,
        correction_notes
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        'extrait',
        $14
      )
      RETURNING
        id,
        company_id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        transaction_type,
        description,
        amount,
        withdrawal_amount,
        deposit_amount,
        balance_after,
        reference,
        raw_text,
        status,
        correction_notes,
        validated_by,
        validated_at,
        created_invoice_id,
        invoice_id,
        reconciliation_status,
        reconciliation_difference,
        reconciliation_notes,
        created_at,
        updated_at
    `,
    [
      data.company_id,
      data.bank_statement_id,
      data.extracted_client_name || null,
      data.matched_client_id || null,
      data.transaction_date || null,
      data.transaction_type || 'depot',
      data.description || null,
      data.amount,
      data.withdrawal_amount || 0,
      data.deposit_amount || 0,
      data.balance_after || null,
      data.reference || null,
      data.raw_text || null,
      data.correction_notes || null
    ]
  );

  return result.rows[0];
}

export async function updateBankStatementStatus(id, status) {
  const result = await query(
    `
      UPDATE bank_statements
      SET
        status = $1::varchar,
        processed_at = CASE
          WHEN $1::varchar = 'traite' THEN CURRENT_TIMESTAMP
          ELSE processed_at
        END
      WHERE id = $2
      RETURNING
        id,
        file_name,
        file_url,
        source_type,
        status,
        imported_by,
        imported_at,
        processed_at,
        notes
    `,
    [status, id]
  );

  return result.rows[0] || null;
}

export async function countUsedTransactionsByStatementId(bankStatementId) {
  const result = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM bank_transactions
      WHERE bank_statement_id = $1
        AND status = 'utilise'
    `,
    [bankStatementId]
  );

  return result.rows[0].total;
}

export async function deleteTransactionsByStatementId(bankStatementId) {
  await query(
    `
      DELETE FROM bank_transactions
      WHERE bank_statement_id = $1
        AND status <> 'utilise'
    `,
    [bankStatementId]
  );
}

export async function deleteBankStatementById(id) {
  const result = await query(
    `
      DELETE FROM bank_statements
      WHERE id = $1
      RETURNING
        id,
        file_name,
        file_url,
        source_type,
        status,
        imported_by,
        imported_at,
        processed_at,
        notes
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function bulkCreateBankTransactions(
  bankStatementId,
  companyId,
  transactions
) {
  const createdTransactions = [];

  for (const transaction of transactions) {
    const created = await createBankTransaction({
      ...transaction,
      company_id: companyId,
      bank_statement_id: bankStatementId
    });

    createdTransactions.push(created);
  }

  return createdTransactions;
}

export async function findTransactionsByStatementId(bankStatementId) {
  const result = await query(
    `
      SELECT
        bt.id,
        bt.bank_statement_id,
        bt.extracted_client_name,
        bt.matched_client_id,
        c.full_name AS matched_client_name,
        bt.transaction_date,
        bt.amount,
        bt.reference,
        bt.raw_text,
        bt.status,
        bt.correction_notes,
        bt.validated_by,
        bt.transaction_type,
bt.description,
bt.withdrawal_amount,
bt.deposit_amount,
bt.balance_after,
bt.invoice_id,
bt.reconciliation_status,
bt.reconciliation_difference,
bt.reconciliation_notes,
        u.full_name AS validated_by_name,
        bt.validated_at,
        bt.created_invoice_id,
        i.invoice_number AS created_invoice_number,
        bt.created_at,
        bt.updated_at
      FROM bank_transactions bt
      LEFT JOIN clients c ON c.id = bt.matched_client_id
      LEFT JOIN users u ON u.id = bt.validated_by
      LEFT JOIN invoices i ON i.id = bt.created_invoice_id
      WHERE bt.bank_statement_id = $1
      ORDER BY bt.created_at DESC
    `,
    [bankStatementId]
  );

  return result.rows;
}

export async function findBankTransactionById(id) {
  const result = await query(
    `
      SELECT
        bt.id,
        bt.bank_statement_id,
        bt.extracted_client_name,
        bt.matched_client_id,
        c.full_name AS matched_client_name,
        bt.transaction_date,
        bt.amount,
        bt.reference,
        bt.raw_text,
        bt.status,
        bt.correction_notes,
        bt.validated_by,
        u.full_name AS validated_by_name,
        bt.validated_at,
        bt.created_invoice_id,
        bt.transaction_type,
bt.description,
bt.withdrawal_amount,
bt.deposit_amount,
bt.balance_after,
bt.invoice_id,
bt.reconciliation_status,
bt.reconciliation_difference,
bt.reconciliation_notes,
        i.invoice_number AS created_invoice_number,
        bt.created_at,
        bt.updated_at
      FROM bank_transactions bt
      LEFT JOIN clients c ON c.id = bt.matched_client_id
      LEFT JOIN users u ON u.id = bt.validated_by
      LEFT JOIN invoices i ON i.id = bt.created_invoice_id
      WHERE bt.id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function updateBankTransaction(id, companyId, data) {
  const result = await query(
    `
      UPDATE bank_transactions
      SET
        extracted_client_name = $1,
        matched_client_id = $2,
        transaction_date = $3,
        transaction_type = $4,
        description = $5,
        amount = $6,
        withdrawal_amount = $7,
        deposit_amount = $8,
        balance_after = $9,
        reference = $10,
        raw_text = $11,
        correction_notes = $12,
        status = CASE
          WHEN status = 'extrait' THEN 'corrige'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
        AND company_id = $14
      RETURNING
        id,
        company_id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        transaction_type,
        description,
        amount,
        withdrawal_amount,
        deposit_amount,
        balance_after,
        reference,
        raw_text,
        status,
        correction_notes,
        validated_by,
        validated_at,
        created_invoice_id,
        invoice_id,
        reconciliation_status,
        reconciliation_difference,
        reconciliation_notes,
        created_at,
        updated_at
    `,
    [
      data.extracted_client_name || null,
      data.matched_client_id || null,
      data.transaction_date || null,
      data.transaction_type,
      data.description || null,
      data.amount,
      data.withdrawal_amount || 0,
      data.deposit_amount || 0,
      data.balance_after || null,
      data.reference || null,
      data.raw_text || null,
      data.correction_notes || null,
      id,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function matchTransactionClient(transactionId, clientId) {
  const result = await query(
    `
      UPDATE bank_transactions
      SET
        matched_client_id = $1,
        status = CASE
          WHEN status = 'extrait' THEN 'corrige'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        amount,
        reference,
        raw_text,
        status,
        correction_notes,
        validated_by,
        validated_at,
        created_invoice_id,
        created_at,
        updated_at
    `,
    [clientId, transactionId]
  );

  return result.rows[0] || null;
}

export async function createClientFromTransaction(data) {
  const result = await query(
    `
      INSERT INTO clients (
        full_name,
        phone,
        email,
        address,
        client_type,
        status,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'actif', $6, $7)
      RETURNING
        id,
        user_id,
        client_code,
        full_name,
        phone,
        email,
        address,
        client_type,
        status,
        notes,
        created_by,
        created_at,
        updated_at,
        archived_at
    `,
    [
      data.full_name,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.client_type || 'particulier',
      data.notes || null,
      data.created_by || null
    ]
  );

  return result.rows[0];
}

export async function validateBankTransaction(id, userId) {
  const result = await query(
    `
      UPDATE bank_transactions
      SET
        status = 'valide',
        validated_by = $1,
        validated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        amount,
        reference,
        raw_text,
        status,
        correction_notes,
        validated_by,
        validated_at,
        created_invoice_id,
        created_at,
        updated_at
    `,
    [userId || null, id]
  );

  return result.rows[0] || null;
}

export async function markTransactionUsedForInvoice(
  transactionId,
  companyId,
  invoiceId,
  reconciliationDifference = 0,
  reconciliationNotes = null
) {
  const result = await query(
    `
      UPDATE bank_transactions
      SET
        status = 'utilise',
        created_invoice_id = $1,
        invoice_id = $1,
        reconciliation_status = CASE
          WHEN ABS($2::numeric) = 0 THEN 'rapprochee'
          ELSE 'ajustee'
        END,
        reconciliation_difference = $2,
        reconciliation_notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
        AND company_id = $5
        AND status = 'valide'
      RETURNING
        id,
        company_id,
        bank_statement_id,
        extracted_client_name,
        matched_client_id,
        transaction_date,
        transaction_type,
        description,
        amount,
        withdrawal_amount,
        deposit_amount,
        balance_after,
        reference,
        raw_text,
        status,
        correction_notes,
        validated_by,
        validated_at,
        created_invoice_id,
        invoice_id,
        reconciliation_status,
        reconciliation_difference,
        reconciliation_notes,
        created_at,
        updated_at
    `,
    [
      invoiceId,
      reconciliationDifference,
      reconciliationNotes,
      transactionId,
      companyId
    ]
  );

  return result.rows[0] || null;
}

export async function createBankStatement(data) {
  const result = await query(
    `
      INSERT INTO bank_statements (
        company_id,
        file_name,
        file_url,
        source_type,
        status,
        imported_by,
        notes
      )
      VALUES ($1, $2, $3, $4, 'importe', $5, $6)
      RETURNING
        id,
        company_id,
        file_name,
        file_url,
        source_type,
        status,
        imported_by,
        imported_at,
        processed_at,
        notes
    `,
    [
      data.company_id || null,
      data.file_name,
      data.file_url || null,
      data.source_type,
      data.imported_by || null,
      data.notes || null
    ]
  );

  return result.rows[0];
}