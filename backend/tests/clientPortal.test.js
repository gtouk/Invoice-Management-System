import { beforeAll, describe, expect, it } from 'vitest';
import { accounts, authHeader, loginAs, request, app } from './helpers.js';

describe('Client portal', () => {
  let clientToken;
  let adminToken;
  let superToken;

  beforeAll(async () => {
    clientToken = (await loginAs(accounts.client)).token;
    adminToken = (await loginAs(accounts.admin)).token;
    superToken = (await loginAs(accounts.superAdmin)).token;
  });

  it('allows client on portal dashboard', async () => {
    const response = await request(app)
      .get('/api/client/dashboard')
      .set(authHeader(clientToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('invoices_count');
  });

  it('allows client on invoices and payments', async () => {
    const invoices = await request(app)
      .get('/api/client/invoices')
      .set(authHeader(clientToken));
    const payments = await request(app)
      .get('/api/client/payments')
      .set(authHeader(clientToken));

    expect(invoices.status).toBe(200);
    expect(payments.status).toBe(200);
    expect(invoices.body.success).toBe(true);
    expect(payments.body.success).toBe(true);
  });

  it('forbids company admin on client portal', async () => {
    const response = await request(app)
      .get('/api/client/dashboard')
      .set(authHeader(adminToken));

    expect(response.status).toBe(403);
  });

  it('forbids super admin on client portal', async () => {
    const response = await request(app)
      .get('/api/client/dashboard')
      .set(authHeader(superToken));

    expect(response.status).toBe(403);
  });

  it('rejects unauthenticated client portal access', async () => {
    const response = await request(app).get('/api/client/dashboard');
    expect(response.status).toBe(401);
  });
});
