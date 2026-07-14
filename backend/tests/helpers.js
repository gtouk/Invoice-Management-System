import request from 'supertest';
import app from '../src/app.js';

export { request, app };

export const accounts = {
  superAdmin: {
    identifier: process.env.TEST_SUPERADMIN_IDENTIFIER || 'superadmin@invoice.com',
    password: process.env.TEST_SUPERADMIN_PASSWORD || 'SuperAdmin123!'
  },
  admin: {
    identifier: process.env.TEST_ADMIN_IDENTIFIER || 'admin@invoice.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  otherAdmin: {
    identifier: process.env.TEST_OTHER_ADMIN_IDENTIFIER || 'admin@beautydemo.test',
    password: process.env.TEST_OTHER_ADMIN_PASSWORD || 'admin123'
  },
  client: {
    identifier:
      process.env.TEST_CLIENT_IDENTIFIER || 'portal.client.test@invoice.local',
    password: process.env.TEST_CLIENT_PASSWORD || 'ClientTest123!'
  }
};

export async function login(identifier, password) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ identifier, password });

  return response;
}

export async function loginAs(account) {
  const response = await login(account.identifier, account.password);

  if (response.status !== 200 || !response.body?.data?.access_token) {
    const message =
      response.body?.message ||
      `Login failed for ${account.identifier} (HTTP ${response.status})`;
    const error = new Error(message);
    error.response = response;
    throw error;
  }

  return {
    token: response.body.data.access_token,
    user: response.body.data.user,
    response
  };
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function getFirstInvoiceId(token) {
  const response = await request(app)
    .get('/api/invoices')
    .query({ page: 1, limit: 1 })
    .set(authHeader(token));

  if (response.status !== 200) {
    return null;
  }

  const items = Array.isArray(response.body?.data)
    ? response.body.data
    : response.body?.data?.items || [];

  return items[0]?.id || null;
}
