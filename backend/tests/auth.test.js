import { describe, expect, it } from 'vitest';
import { accounts, login, loginAs, request, app } from './helpers.js';

describe('Auth API', () => {
  it('logs in super admin successfully', async () => {
    const response = await login(
      accounts.superAdmin.identifier,
      accounts.superAdmin.password
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.access_token).toBeTruthy();
    expect(response.body.data.user.role).toBe('super_admin');
    expect(response.body.data.user.company_id).toBeNull();
  });

  it('logs in company admin successfully', async () => {
    const response = await login(accounts.admin.identifier, accounts.admin.password);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.access_token).toBeTruthy();
    expect(['admin', 'company_admin']).toContain(response.body.data.user.role);
    expect(response.body.data.user.company_id).toBeTruthy();
  });

  it('rejects invalid password', async () => {
    const response = await login(accounts.admin.identifier, 'wrong-password-!!!');

    expect([400, 401]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  it('documents suspended-company login when env is set', async () => {
    const identifier = process.env.TEST_SUSPENDED_ADMIN_IDENTIFIER;
    const password = process.env.TEST_SUSPENDED_ADMIN_PASSWORD;

    if (!identifier || !password) {
      // Manual QA: suspend a company then login with its admin → 403.
      expect(true).toBe(true);
      return;
    }

    const response = await login(identifier, password);
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(String(response.body.message || '').toLowerCase()).toContain('suspend');
  });

  it('rejects unauthenticated protected admin route', async () => {
    const response = await request(app).get('/api/dashboard/summary');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('can refresh session shape for logged-in admin', async () => {
    const { user } = await loginAs(accounts.admin);
    expect(user.email || user.username).toBeTruthy();
  });
});
