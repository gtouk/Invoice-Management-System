import { beforeAll, describe, expect, it } from 'vitest';
import { accounts, authHeader, loginAs, request, app } from './helpers.js';

const reportPaths = [
  '/api/dashboard/summary',
  '/api/reports/summary',
  '/api/reports/revenue-by-month',
  '/api/reports/invoices-by-status',
  '/api/reports/top-clients',
  '/api/reports/payments-by-method'
];

describe('Dashboard and reports', () => {
  let adminToken;
  let clientToken;
  let superToken;

  beforeAll(async () => {
    adminToken = (await loginAs(accounts.admin)).token;
    clientToken = (await loginAs(accounts.client)).token;
    superToken = (await loginAs(accounts.superAdmin)).token;
  });

  it.each(reportPaths)('allows company admin on %s', async (path) => {
    const response = await request(app).get(path).set(authHeader(adminToken));
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('forbids client on company dashboard', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set(authHeader(clientToken));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('forbids super admin on company dashboard', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set(authHeader(superToken));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects unauthenticated dashboard access', async () => {
    const response = await request(app).get('/api/dashboard/summary');
    expect(response.status).toBe(401);
  });
});
