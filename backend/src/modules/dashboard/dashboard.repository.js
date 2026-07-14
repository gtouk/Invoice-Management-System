import { query } from '../../database/db.js';

export async function getCompanyDashboardSummary(companyId) {
  const result = await query(
    `
      SELECT
        (
          SELECT COUNT(*)::int FROM clients c WHERE c.company_id = $1
        ) AS clients_count,
        (
          SELECT COUNT(*)::int FROM items it WHERE it.company_id = $1
        ) AS items_count,
        COUNT(i.id)::int AS invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'brouillon')::int AS draft_invoices_count,
        COUNT(i.id) FILTER (
          WHERE i.status IN ('non_payee', 'partiellement_payee', 'payee')
        )::int AS sent_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'payee')::int AS paid_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'partiellement_payee')::int AS partial_invoices_count,
        COUNT(i.id) FILTER (
          WHERE i.status IN ('non_payee', 'partiellement_payee')
            AND i.due_date IS NOT NULL
            AND i.due_date < CURRENT_DATE
        )::int AS overdue_invoices_count,
        COUNT(i.id) FILTER (WHERE i.status = 'annulee')::int AS cancelled_invoices_count,
        COALESCE(SUM(i.total_amount) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_invoiced,
        COALESCE(SUM(i.paid_amount) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_paid,
        COALESCE(SUM(i.balance_due) FILTER (WHERE i.status <> 'annulee'), 0)::numeric(12,2)
          AS total_balance_due,
        COALESCE(
          SUM(i.total_amount) FILTER (
            WHERE i.status <> 'annulee'
              AND i.issue_date >= DATE_TRUNC('month', CURRENT_DATE)
              AND i.issue_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ),
          0
        )::numeric(12,2) AS invoiced_this_month
      FROM invoices i
      WHERE i.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0] || {};
}

export async function getCompanyPaymentsDashboardStats(companyId) {
  const result = await query(
    `
      SELECT
        COUNT(p.id)::int AS payments_count,
        COALESCE(
          SUM(p.amount) FILTER (
            WHERE p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
              AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ),
          0
        )::numeric(12,2) AS payments_this_month
      FROM payments p
      WHERE p.company_id = $1
    `,
    [companyId]
  );

  return result.rows[0] || {};
}

export async function getUpcomingDueInvoices(companyId, days = 7, limit = 5) {
  const result = await query(
    `
      SELECT
        i.id,
        i.invoice_number,
        i.status,
        i.issue_date,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.balance_due,
        c.full_name AS client_name,
        c.company_name,
        c.client_type
      FROM invoices i
      INNER JOIN clients c ON c.id = i.client_id
      WHERE i.company_id = $1
        AND i.status IN ('non_payee', 'partiellement_payee')
        AND i.due_date IS NOT NULL
        AND i.due_date >= CURRENT_DATE
        AND i.due_date <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
      ORDER BY i.due_date ASC
      LIMIT $3
    `,
    [companyId, days, limit]
  );

  return result.rows;
}
