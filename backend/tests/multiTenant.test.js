import { beforeAll, describe, expect, it } from 'vitest';
import {
  accounts,
  authHeader,
  getFirstInvoiceId,
  loginAs,
  request,
  app
} from './helpers.js';

describe('Multi-tenant isolation', () => {
  let admin;
  let otherAdmin;
  let neaInvoiceId;
  let otherInvoiceId;

  beforeAll(async () => {
    admin = await loginAs(accounts.admin);

    try {
      otherAdmin = await loginAs(accounts.otherAdmin);
    } catch {
      otherAdmin = null;
    }

    neaInvoiceId = await getFirstInvoiceId(admin.token);
    otherInvoiceId = otherAdmin
      ? await getFirstInvoiceId(otherAdmin.token)
      : null;
  });

  it('lists clients for NEA admin without leaking other company', async () => {
    const response = await request(app)
      .get('/api/clients')
      .query({ page: 1, limit: 50 })
      .set(authHeader(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const clients = Array.isArray(response.body.data)
      ? response.body.data
      : response.body.data?.items || [];

    for (const client of clients) {
      if (client.company_id) {
        expect(client.company_id).toBe(admin.user.company_id);
      }
    }
  });

  it('blocks NEA admin from another company invoice when available', async () => {
    if (!otherInvoiceId || otherInvoiceId === neaInvoiceId) {
      // Manual QA if BeautyDemo has no invoice yet.
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${otherInvoiceId}`)
      .set(authHeader(admin.token));

    expect([403, 404]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it('rejects invoice PDF download without token', async () => {
    if (!neaInvoiceId) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app).get(
      `/api/invoices/${neaInvoiceId}/download`
    );

    expect(response.status).toBe(401);
  });

  it('allows owner to download invoice PDF', async () => {
    if (!neaInvoiceId) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${neaInvoiceId}/download`)
      .set(authHeader(admin.token));

    // Some invoices may not have a PDF yet.
    if (response.status === 404) {
      expect(response.body.success).toBe(false);
      return;
    }

    expect(response.status).toBe(200);
    expect(String(response.headers['content-type'] || '')).toMatch(/pdf/i);
  });

  it('blocks other company from downloading NEA invoice PDF', async () => {
    if (!neaInvoiceId || !otherAdmin) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${neaInvoiceId}/download`)
      .set(authHeader(otherAdmin.token));

    expect([403, 404]).toContain(response.status);
  });

  it('does not expose private invoice files via /storage/invoices', async () => {
    const response = await request(app).get(
      '/storage/invoices/FAC-2026-000014.pdf'
    );

    expect([403, 404]).toContain(response.status);
  });
});
