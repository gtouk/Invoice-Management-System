import api from './api';

export async function getAuditLogs(params = {}) {
  const response = await api.get('/audit-logs', { params });
  return response.data;
}

export async function getAuditLogFilterOptions() {
  const response = await api.get('/audit-logs/filter-options');
  return response.data;
}
