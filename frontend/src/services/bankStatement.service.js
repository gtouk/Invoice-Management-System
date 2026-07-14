import api from './api';

export async function getBankStatements(params = {}) {
  const response = await api.get('/bank-statements', { params });
  return response.data;
}

export async function getBankStatementById(id) {
  const response = await api.get(`/bank-statements/${id}`);
  return response.data;
}

export async function createBankStatement(payload) {
  const response = await api.post('/bank-statements', payload);
  return response.data;
}

export async function importBankStatementFile(formData) {
  const response = await api.post('/bank-statements/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

export async function processBankStatement(id) {
  const response = await api.post(`/bank-statements/${id}/process`);
  return response.data;
}

export async function deleteBankStatement(id) {
  const response = await api.delete(`/bank-statements/${id}`);
  return response.data;
}

export async function addBankTransaction(bankStatementId, payload) {
  const response = await api.post(
    `/bank-statements/${bankStatementId}/transactions`,
    payload
  );

  return response.data;
}

export async function getBankTransactions(bankStatementId) {
  const response = await api.get(
    `/bank-statements/${bankStatementId}/transactions`
  );

  return response.data;
}

export async function correctBankTransaction(transactionId, payload) {
  const response = await api.put(
    `/bank-statements/transactions/${transactionId}/correct`,
    payload
  );

  return response.data;
}

export async function matchBankTransactionClient(transactionId, payload) {
  const response = await api.patch(
    `/bank-statements/transactions/${transactionId}/match-client`,
    payload
  );

  return response.data;
}

export async function createClientFromBankTransaction(transactionId, payload) {
  const response = await api.post(
    `/bank-statements/transactions/${transactionId}/create-client`,
    payload
  );

  return response.data;
}

export async function validateBankTransaction(transactionId) {
  const response = await api.patch(
    `/bank-statements/transactions/${transactionId}/validate`
  );

  return response.data;
}

export async function createInvoiceFromBankTransaction(transactionId, payload) {
  const response = await api.post(
    `/bank-statements/transactions/${transactionId}/create-invoice`,
    payload
  );

  return response.data;
}

export async function downloadBankStatementFile(id) {
  const response = await api.get(`/bank-statements/${id}/file`, {
    responseType: 'blob'
  });

  return response;
}