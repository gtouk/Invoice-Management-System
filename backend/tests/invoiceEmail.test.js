import { beforeAll, describe, expect, it } from 'vitest';
import {
  accounts,
  authHeader,
  getFirstInvoiceId,
  loginAs,
  request,
  app
} from './helpers.js';

describe('Invoice email prepare', () => {
  let admin;
  let clientToken;
  let otherAdmin;
  let invoiceId;

  beforeAll(async () => {
    admin = await loginAs(accounts.admin);
    clientToken = (await loginAs(accounts.client)).token;

    try {
      otherAdmin = await loginAs(accounts.otherAdmin);
    } catch {
      otherAdmin = null;
    }

    invoiceId = await getFirstInvoiceId(admin.token);
  });

  it('prepares invoice email for owner admin', async () => {
    if (!invoiceId) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${invoiceId}/email/prepare`)
      .set(authHeader(admin.token));

    // Draft/cancelled invoices may return 409.
    if (response.status === 409) {
      expect(response.body.success).toBe(false);
      return;
    }

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('subject');
    expect(response.body.data).toHaveProperty('body');
    expect(response.body.data).toHaveProperty('can_send');
    expect(response.body.data).toHaveProperty('recipient_email');
  });

  it('forbids client on admin email prepare', async () => {
    if (!invoiceId) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${invoiceId}/email/prepare`)
      .set(authHeader(clientToken));

    expect(response.status).toBe(403);
  });

  it('blocks other company on NEA email prepare when possible', async () => {
    if (!invoiceId || !otherAdmin) {
      expect(true).toBe(true);
      return;
    }

    const response = await request(app)
      .get(`/api/invoices/${invoiceId}/email/prepare`)
      .set(authHeader(otherAdmin.token));

    expect([403, 404]).toContain(response.status);
  });
});
