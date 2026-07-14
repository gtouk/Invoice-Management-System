import api from './api';

export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return response.data;
}

export async function updateUser(id, payload) {
  const response = await api.put(`/users/${id}`, payload);
  return response.data;
}

export async function updateUserPassword(id, payload) {
  const response = await api.patch(`/users/${id}/password`, payload);
  return response.data;
}

export async function disableUser(id) {
  const response = await api.patch(`/users/${id}/disable`);
  return response.data;
}

export async function reactivateUser(id) {
  const response = await api.patch(`/users/${id}/reactivate`);
  return response.data;
}