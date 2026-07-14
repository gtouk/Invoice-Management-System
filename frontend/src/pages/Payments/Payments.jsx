import { useEffect, useMemo, useState } from 'react';
import { getClients } from '../../services/client.service';
import { getInvoices, getInvoiceById } from '../../services/invoice.service';
import {
  createPayment,
  getPayments,
  getPaymentsByInvoice
} from '../../services/payment.service';
import { formatDate, formatMoney } from '../../utils/formatters';
import './Payments.css';

const initialPaymentForm = {
  invoice_id: '',
  amount: '',
  payment_method: 'cash',
  payment_date: getTodayDate(),
  reference: '',
  notes: ''
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'virement_bancaire', label: 'Virement bancaire' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'carte_bancaire', label: 'Carte bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
  { value: 'bank_transfer', label: 'Virement bancaire' }
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatStatus(status) {
  const labels = {
    brouillon: 'Brouillon',
    non_payee: 'Non payée',
    partiellement_payee: 'Partiellement payée',
    payee: 'Payée',
    annulee: 'Annulée'
  };

  return labels[status] || status || '—';
}

function formatPaymentMethod(method) {
  const found = paymentMethods.find((item) => item.value === method);
  return found?.label || method || '—';
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);

  const [form, setForm] = useState(initialPaymentForm);

  const [filters, setFilters] = useState({
    client_id: '',
    invoice_id: '',
    payment_method: '',
    date_from: '',
    date_to: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const payableInvoices = useMemo(() => {
    return invoices.filter((invoice) =>
      ['non_payee', 'partiellement_payee'].includes(invoice.status)
    );
  }, [invoices]);

  const selectedInvoiceBalance = selectedInvoice
    ? Number(selectedInvoice.balance_due || 0)
    : 0;

  const paymentAmount = Number(form.amount || 0);

  const remainingAfterPayment =
    selectedInvoiceBalance > 0 && paymentAmount > 0
      ? selectedInvoiceBalance - paymentAmount
      : selectedInvoiceBalance;

  async function loadInitialData() {
    try {
      setLoading(true);
      setError('');

      const [clientsResponse, invoicesResponse, paymentsResponse] =
        await Promise.all([
          getClients({ status: 'actif' }),
          getInvoices(),
          getPayments()
        ]);

      setClients(clientsResponse.data || []);
      setInvoices(invoicesResponse.data || []);
      setPayments(paymentsResponse.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les données des paiements.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments(customFilters = filters) {
    try {
      setLoading(true);
      setError('');

      const cleanFilters = {};

      if (customFilters.client_id) cleanFilters.client_id = customFilters.client_id;
      if (customFilters.invoice_id) cleanFilters.invoice_id = customFilters.invoice_id;
      if (customFilters.payment_method) {
        cleanFilters.payment_method = customFilters.payment_method;
      }
      if (customFilters.date_from) cleanFilters.date_from = customFilters.date_from;
      if (customFilters.date_to) cleanFilters.date_to = customFilters.date_to;

      const response = await getPayments(cleanFilters);
      setPayments(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les paiements.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshInvoices() {
    const response = await getInvoices();
    setInvoices(response.data || []);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value
    }));
  }

  async function handleApplyFilters(event) {
    event.preventDefault();
    await loadPayments(filters);
  }

  async function handleResetFilters() {
    const resetFilters = {
      client_id: '',
      invoice_id: '',
      payment_method: '',
      date_from: '',
      date_to: ''
    };

    setFilters(resetFilters);
    await loadPayments(resetFilters);
  }

  async function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    if (name === 'invoice_id') {
      await handleSelectInvoice(value);
    }
  }

  async function handleSelectInvoice(invoiceId) {
    if (!invoiceId) {
      setSelectedInvoice(null);
      setInvoicePayments([]);
      return;
    }

    try {
      setError('');
      setMessage('');

      const [invoiceResponse, paymentsResponse] = await Promise.all([
        getInvoiceById(invoiceId),
        getPaymentsByInvoice(invoiceId)
      ]);

      const invoice = invoiceResponse.data;
      setSelectedInvoice(invoice);
      setInvoicePayments(paymentsResponse.data || []);

      setForm((currentForm) => ({
        ...currentForm,
        invoice_id: invoiceId,
        amount: invoice?.balance_due || ''
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger la facture sélectionnée.'
      );
    }
  }

  function resetForm() {
    setForm({
      ...initialPaymentForm,
      payment_date: getTodayDate()
    });
    setSelectedInvoice(null);
    setInvoicePayments([]);
  }

  async function handleCreatePayment(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        invoice_id: form.invoice_id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference: form.reference,
        notes: form.notes
      };

      const response = await createPayment(payload);

      setMessage('Paiement enregistré avec succès.');

      await Promise.all([
        loadPayments(),
        refreshInvoices()
      ]);

      if (response.data?.invoice?.id) {
        await handleSelectInvoice(response.data.invoice.id);
      } else {
        resetForm();
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’enregistrer le paiement.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1>Paiements</h1>
          <p>Enregistrez les paiements et suivez l’historique des factures.</p>
        </div>
      </div>

      {message && <div className="payment-alert payment-alert-success">{message}</div>}
      {error && <div className="payment-alert payment-alert-error">{error}</div>}

      <div className="payments-grid">
        <section className="payment-card payment-form-card">
          <h2>Enregistrer un paiement</h2>

          <form className="payment-form" onSubmit={handleCreatePayment}>
            <div className="form-group">
              <label htmlFor="invoice_id">Facture à payer *</label>
              <select
                id="invoice_id"
                name="invoice_id"
                value={form.invoice_id}
                onChange={handleFormChange}
              >
                <option value="">Sélectionner une facture</option>
                {payableInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number || 'Sans numéro'} — {invoice.client_name} — Solde : {formatMoney(invoice.balance_due)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="selected-invoice-box">
                <div>
                  <span>Facture</span>
                  <strong>{selectedInvoice.invoice_number}</strong>
                </div>
                <div>
                  <span>Client</span>
                  <strong>{selectedInvoice.client_name}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(selectedInvoice.total_amount)}</strong>
                </div>
                <div>
                  <span>Déjà payé</span>
                  <strong>{formatMoney(selectedInvoice.paid_amount)}</strong>
                </div>
                <div>
                  <span>Solde actuel</span>
                  <strong>{formatMoney(selectedInvoice.balance_due)}</strong>
                </div>
                <div>
                  <span>Statut</span>
                  <strong>{formatStatus(selectedInvoice.status)}</strong>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount">Montant payé *</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleFormChange}
                  placeholder="Ex: 50"
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment_date">Date paiement *</label>
                <input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={form.payment_date}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="payment_method">Mode de paiement *</label>
              <select
                id="payment_method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleFormChange}
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reference">Référence</label>
              <input
                id="reference"
                name="reference"
                type="text"
                value={form.reference}
                onChange={handleFormChange}
                placeholder="Ex: PAY-001, transaction, reçu..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={form.notes}
                onChange={handleFormChange}
                placeholder="Informations complémentaires"
              />
            </div>

            {selectedInvoice && (
              <div className="payment-preview">
                <div>
                  <span>Solde avant paiement</span>
                  <strong>{formatMoney(selectedInvoiceBalance)}</strong>
                </div>

                <div>
                  <span>Montant saisi</span>
                  <strong>{formatMoney(paymentAmount)}</strong>
                </div>

                <div>
                  <span>Solde après paiement</span>
                  <strong>{formatMoney(Math.max(remainingAfterPayment, 0))}</strong>
                </div>
              </div>
            )}

            <div className="payment-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer paiement'}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Réinitialiser
              </button>
            </div>
          </form>

          {selectedInvoice && (
            <div className="invoice-payment-history">
              <h3>Historique de cette facture</h3>

              {invoicePayments.length === 0 ? (
                <p className="payment-empty">Aucun paiement enregistré pour cette facture.</p>
              ) : (
                <div className="payment-history-list">
                  {invoicePayments.map((payment) => (
                    <div className="payment-history-item" key={payment.id}>
                      <div>
                        <strong>{formatMoney(payment.amount)}</strong>
                        <span>{formatPaymentMethod(payment.payment_method)}</span>
                      </div>
                      <div>
                        <span>{formatDate(payment.payment_date)}</span>
                        <span>{payment.reference || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="payment-card payment-list-card">
          <div className="payment-list-header">
            <div>
              <h2>Liste des paiements</h2>
              <p>{payments.length} paiement(s)</p>
            </div>
          </div>

          <form className="payment-filters" onSubmit={handleApplyFilters}>
            <select
              name="client_id"
              value={filters.client_id}
              onChange={handleFilterChange}
            >
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>

            <select
              name="invoice_id"
              value={filters.invoice_id}
              onChange={handleFilterChange}
            >
              <option value="">Toutes les factures</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number || 'Brouillon'} — {invoice.client_name}
                </option>
              ))}
            </select>

            <select
              name="payment_method"
              value={filters.payment_method}
              onChange={handleFilterChange}
            >
              <option value="">Tous les modes</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <input
              name="date_from"
              type="date"
              value={filters.date_from}
              onChange={handleFilterChange}
            />

            <input
              name="date_to"
              type="date"
              value={filters.date_to}
              onChange={handleFilterChange}
            />

            <div className="payment-filter-actions">
              <button type="submit">Filtrer</button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleResetFilters}
              >
                Réinitialiser
              </button>
            </div>
          </form>

          {loading ? (
            <p className="payment-empty">Chargement...</p>
          ) : payments.length === 0 ? (
            <p className="payment-empty">Aucun paiement trouvé.</p>
          ) : (
            <div className="payment-table-wrapper">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Facture</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Référence</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.payment_date)}</td>
                      <td>{payment.invoice_number || '-'}</td>
                      <td>{payment.client_name || '-'}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>{formatPaymentMethod(payment.payment_method)}</td>
                      <td>{payment.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
