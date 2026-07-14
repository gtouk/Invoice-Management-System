import { beforeAll, describe, expect, it } from 'vitest';
import { accounts, authHeader, loginAs, request, app } from './helpers.js';

describe('Super Admin API', () => {
  let superToken;
  let adminToken;

  beforeAll(async () => {
    const superAdmin = await loginAs(accounts.superAdmin);
    const admin = await loginAs(accounts.admin);
    superToken = superAdmin.token;
    adminToken = admin.token;
  });

  it('returns platform stats for super admin', async () => {
    const response = await request(app)
      .get('/api/super-admin/stats')
      .set(authHeader(superToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeTruthy();
    expect(response.body.data).toHaveProperty('companies_count');
  });

  it('lists companies for super admin', async () => {
    const response = await request(app)
      .get('/api/super-admin/companies')
      .set(authHeader(superToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('lists global audit logs for super admin', async () => {
    const response = await request(app)
      .get('/api/super-admin/audit-logs')
      .query({ page: 1, limit: 5 })
      .set(authHeader(superToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('items');
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });

  it('forbids company admin on super-admin routes', async () => {
    const response = await request(app)
      .get('/api/super-admin/stats')
      .set(authHeader(adminToken));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rejects unauthenticated access', async () => {
    const response = await request(app).get('/api/super-admin/companies');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
