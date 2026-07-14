import api from './api';

export async function getClients(params = {}) {
  const response = await api.get('/clients', { params });
  return response.data;
}

export async function getClientById(id) {
  const response = await api.get(`/clients/${id}`);
  return response.data;
}

export async function createClient(payload) {
  const response = await api.post('/clients', payload);
  return response.data;
}

export async function updateClient(id, payload) {
  const response = await api.put(`/clients/${id}`, payload);
  return response.data;
}

export async function archiveClient(id) {
  const response = await api.patch(`/clients/${id}/archive`);
  return response.data;
}

export async function reactivateClient(id) {
  const response = await api.patch(`/clients/${id}/reactivate`);
  return response.data;
}

export async function deleteClient(id) {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
}

export async function getClientHistory(id) {
  const response = await api.get(`/clients/${id}/history`);
  return response.data;
}
