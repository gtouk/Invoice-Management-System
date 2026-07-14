import api from './api';

export async function getPlatformStats() {
  const response = await api.get('/super-admin/stats');
  return response.data;
}

export async function getCompanies(params = {}) {
  const response = await api.get('/super-admin/companies', { params });
  return response.data;
}

export async function getCompanyById(id) {
  const response = await api.get(`/super-admin/companies/${id}`);
  return response.data;
}

export async function getCompanySummary(id) {
  const response = await api.get(`/super-admin/companies/${id}/summary`);
  return response.data;
}

export async function getCompanyUsers(id) {
  const response = await api.get(`/super-admin/companies/${id}/users`);
  return response.data;
}

export async function suspendCompany(id) {
  const response = await api.patch(`/super-admin/companies/${id}/suspend`);
  return response.data;
}

export async function activateCompany(id) {
  const response = await api.patch(`/super-admin/companies/${id}/activate`);
  return response.data;
}

export async function getSuperAdminAuditLogs(params = {}) {
  const response = await api.get('/super-admin/audit-logs', { params });
  return response.data;
}

export async function getSuperAdminAuditLogFilterOptions() {
  const response = await api.get('/super-admin/audit-logs/filter-options');
  return response.data;
}
