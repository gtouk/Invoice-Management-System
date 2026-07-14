import api from './api';

export async function getItems(params = {}) {
  const response = await api.get('/items', { params });
  return response.data;
}

export async function getItemById(id) {
  const response = await api.get(`/items/${id}`);
  return response.data;
}

export async function createItem(payload) {
  const response = await api.post('/items', payload);
  return response.data;
}

export async function updateItem(id, payload) {
  const response = await api.put(`/items/${id}`, payload);
  return response.data;
}

export async function disableItem(id) {
  const response = await api.patch(`/items/${id}/disable`);
  return response.data;
}

export async function reactivateItem(id) {
  const response = await api.patch(`/items/${id}/reactivate`);
  return response.data;
}

export async function deleteItem(id) {
  const response = await api.delete(`/items/${id}`);
  return response.data;
}