import api from './api';

export async function getCompanySettings() {
  const response = await api.get('/company-settings');
  return response.data;
}

export async function updateCompanySettings(payload) {
  const response = await api.put('/company-settings', payload);
  return response.data;
}

export async function uploadCompanyLogo(formData) {
  const response = await api.post('/company-settings/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
