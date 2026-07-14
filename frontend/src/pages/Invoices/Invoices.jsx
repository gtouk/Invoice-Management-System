import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  cancelInvoice,
  createInvoice,
  createPayment,
  downloadInvoicePdf,
  generateInvoice,
  generateInvoicePdf,
  getClients,
  getInvoices,
  getItems
} from '../../services/invoice.service';
import {
  disableInvoiceReminders,
  enableInvoiceReminders,
  getInvoiceReminderLogs,
  sendInvoiceReminder
} from '../../services/invoiceReminder.service';
import InvoiceEmailModal from '../../components/InvoiceEmailModal/InvoiceEmailModal';
import {
  formatDate,
  formatDateTime,
  formatMoney
} from '../../utils/formatters';
import './Invoices.css';

const emptyLine = {
  item_id: '',
  description: '',
  quantity: 1,
  unit_price: '',
  price_source: 'catalog'
};

const emptyForm = {
  client_id: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  notes: '',
  taxes_enabled: false,
  tax_preset: 'none',
  gst_hst_rate: 0,
  qst_rate: 0,
  custom_tax_label: '',
  custom_tax_rate: 0,
  items: [{ ...emptyLine }]
};

const statusLabels = {
  brouillon: 'Brouillon',
  non_payee: 'Non payée',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  annulee: 'Annulée'
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'card', label: 'Carte' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'other', label: 'Autre' }
];

function unwrapApiData(response) {
  return response?.data || response?.message?.data || null;
}

function getSelectedClient(clients, clientId) {
  return clients.find((c) => c.id === clientId) || null;
}

function getCatalogPriceForClient(item, client) {
  if (!item) return '';
  const isMember = client?.membership_status === 'membre';
  if (isMember) return item.member_price || item.non_member_price || item.default_price || '';
  return item.non_member_price || item.default_price || '';
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildFileUrl(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http')) return fileUrl;
  if (fileUrl.startsWith('private/')) return null;
  if (fileUrl.startsWith('/api/')) {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');
    return `${backendBaseUrl}${fileUrl}`;
  }
  // Legacy public URLs only (logos). Invoice PDF private paths must use download API.
  if (fileUrl.startsWith('/storage/invoices') || fileUrl.startsWith('storage/invoices')) {
    return null;
  }
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');
  return `${backendBaseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}

async function triggerInvoicePdfDownload(invoice) {
  const response = await downloadInvoicePdf(invoice.id);
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getClientDisplayName(client) {
  if (!client) return '—';
  if (client.client_type === 'entreprise') return client.company_name || client.full_name || '—';
  return client.full_name || '—';
}

function getInvoiceClientName(invoice) {
  if (!invoice) return '—';
  if (invoice.client_type === 'entreprise') return invoice.company_name || invoice.client_name || '—';
  return invoice.client_name || '—';
}

function getStatusLabel(status) {
  return statusLabels[status] || status || '—';
}

function isInvoiceOverdue(invoice) {
  if (!invoice?.due_date) return false;
  if (!['non_payee', 'partiellement_payee'].includes(invoice.status)) return false;
  const due = new Date(invoice.due_date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function canEmailInvoice(invoice) {
  return Boolean(
    invoice?.invoice_number &&
      invoice.status !== 'brouillon' &&
      invoice.status !== 'annulee'
  );
}

function canDownloadInvoicePdf(invoice) {
  return Boolean(
    invoice &&
      invoice.status !== 'brouillon' &&
      invoice.status !== 'annulee'
  );
}

function getPaymentMethodLabel(method) {
  return paymentMethods.find((m) => m.value === method)?.label || method;
}

function formatReminderType(type) {
  return { automatic: 'Automatique', manual: 'Manuel' }[type] || type || '—';
}

function formatReminderStatus(status) {
  return { sent: 'Envoyé', failed: 'Échec' }[status] || status || '—';
}

function calculatePreview(form) {
  const subtotal = form.items.reduce((sum, line) => {
    return sum + Number(line.quantity || 0) * Number(line.unit_price || 0);
  }, 0);
  const subtotalAmount = roundMoney(subtotal);
  if (!form.taxes_enabled) {
    return { subtotal_amount: subtotalAmount, gst_hst_amount: 0, qst_amount: 0, custom_tax_amount: 0, tax_amount: 0, total_amount: subtotalAmount };
  }
  const gstHstAmount = roundMoney(subtotalAmount * (Number(form.gst_hst_rate || 0) / 100));
  const qstAmount = roundMoney(subtotalAmount * (Number(form.qst_rate || 0) / 100));
  const customTaxAmount = roundMoney(subtotalAmount * (Number(form.custom_tax_rate || 0) / 100));
  const taxAmount = roundMoney(gstHstAmount + qstAmount + customTaxAmount);
  return {
    subtotal_amount: subtotalAmount,
    gst_hst_amount: gstHstAmount,
    qst_amount: qstAmount,
    custom_tax_amount: customTaxAmount,
    tax_amount: taxAmount,
    total_amount: roundMoney(subtotalAmount + taxAmount)
  };
}

function canSendReminderForInvoice(invoice) {
  return (
    invoice &&
    invoice.status !== 'brouillon' &&
    invoice.status !== 'annulee' &&
    invoice.status !== 'payee' &&
    Number(invoice.balance_due || 0) > 0
  );
}

function computeMetrics(invoices) {
  let totalAmount = 0;
  let unpaidAmount = 0;
  let partialAmount = 0;
  let paidAmount = 0;

  for (const inv of invoices) {
    const total = Number(inv.total_amount || 0);
    const balance = Number(inv.balance_due || 0);
    const paid = Number(inv.paid_amount || 0);

    if (inv.status === 'non_payee') unpaidAmount += balance;
    if (inv.status === 'partiellement_payee') partialAmount += balance;
    if (inv.status === 'payee') paidAmount += paid;
    if (inv.status !== 'brouillon' && inv.status !== 'annulee') totalAmount += total;
  }

  return { totalAmount, unpaidAmount, partialAmount, paidAmount };
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);

  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client_id: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 20
  });

  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: null,
    invoice_number: '',
    balance_due: 0,
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: ''
  });

  const [emailInvoiceId, setEmailInvoiceId] = useState(null);

  const [reminderLogsByInvoiceId, setReminderLogsByInvoiceId] = useState({});
  const [expandedReminderInvoiceId, setExpandedReminderInvoiceId] = useState(null);
  const [reminderLoadingInvoiceId, setReminderLoadingInvoiceId] = useState(null);
  const [reminderSendingInvoiceId, setReminderSendingInvoiceId] = useState(null);
  const [reminderUpdatingInvoiceId, setReminderUpdatingInvoiceId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [busyInvoiceId, setBusyInvoiceId] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const preview = useMemo(() => calculatePreview(form), [form]);
  const metrics = useMemo(() => computeMetrics(invoices), [invoices]);

  const totalPages = Math.max(Math.ceil((meta.total || 0) / (meta.limit || 20)), 1);

  async function loadInvoices(nextFilters = filters) {
    setIsLoading(true);
    setError('');
    try {
      const response = await getInvoices(nextFilters);
      setInvoices(response.data || []);
      setMeta(response.meta || { page: 1, limit: 20, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les factures.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFormData() {
    try {
      const [clientsRes, itemsRes] = await Promise.all([
        getClients({ status: 'actif', limit: 100 }),
        getItems({ status: 'actif', limit: 100 })
      ]);
      setClients(clientsRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les clients ou articles.');
    }
  }

  async function loadReminderLogs(invoiceId) {
    if (!invoiceId) return;
    try {
      setReminderLoadingInvoiceId(invoiceId);
      const response = await getInvoiceReminderLogs(invoiceId);
      const logs = unwrapApiData(response) || [];
      setReminderLogsByInvoiceId((curr) => ({ ...curr, [invoiceId]: logs }));
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger l'historique des rappels.");
    } finally {
      setReminderLoadingInvoiceId(null);
    }
  }

  useEffect(() => {
    loadInvoices();
    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openForm() {
    setForm({ ...emptyForm, issue_date: new Date().toISOString().slice(0, 10), items: [{ ...emptyLine }] });
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function closeForm() {
    setIsFormOpen(false);
    setForm({ ...emptyForm, items: [{ ...emptyLine }] });
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((curr) => ({ ...curr, [name]: value, page: 1 }));
  }

  function handleFilterSubmit(e) {
    e.preventDefault();
    const nextFilters = { ...filters, page: 1 };
    setFilters(nextFilters);
    loadInvoices(nextFilters);
  }

  function resetFilters() {
    const reset = { search: '', status: '', client_id: '', date_from: '', date_to: '', page: 1, limit: 20 };
    setFilters(reset);
    loadInvoices(reset);
  }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === 'client_id') {
      const nextClient = getSelectedClient(clients, value);
      setForm((curr) => ({
        ...curr,
        client_id: value,
        items: curr.items.map((line) => {
          if (!line.item_id || line.price_source === 'manual') return line;
          const selectedItem = items.find((it) => it.id === line.item_id);
          return { ...line, unit_price: getCatalogPriceForClient(selectedItem, nextClient), price_source: 'catalog' };
        })
      }));
      return;
    }
    setForm((curr) => ({ ...curr, [name]: type === 'checkbox' ? checked : value }));
  }

  function applyTaxPreset(value) {
    setForm((curr) => {
      if (value === 'none') return { ...curr, tax_preset: value, taxes_enabled: false, gst_hst_rate: 0, qst_rate: 0, custom_tax_label: '', custom_tax_rate: 0 };
      if (value === 'quebec') return { ...curr, tax_preset: value, taxes_enabled: true, gst_hst_rate: 5, qst_rate: 9.975, custom_tax_label: '', custom_tax_rate: 0 };
      if (value === 'ontario') return { ...curr, tax_preset: value, taxes_enabled: true, gst_hst_rate: 13, qst_rate: 0, custom_tax_label: '', custom_tax_rate: 0 };
      if (value === 'alberta') return { ...curr, tax_preset: value, taxes_enabled: true, gst_hst_rate: 5, qst_rate: 0, custom_tax_label: '', custom_tax_rate: 0 };
      return { ...curr, tax_preset: value, taxes_enabled: true };
    });
  }

  function handleLineChange(index, field, value) {
    setForm((curr) => {
      const selectedClient = getSelectedClient(clients, curr.client_id);
      const nextItems = curr.items.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'item_id') {
          const selectedItem = items.find((it) => it.id === value);
          if (selectedItem) {
            updated.description = selectedItem.description || '';
            updated.unit_price = getCatalogPriceForClient(selectedItem, selectedClient);
            updated.price_source = 'catalog';
          }
        }
        if (field === 'unit_price') updated.price_source = 'manual';
        return updated;
      });
      return { ...curr, items: nextItems };
    });
  }

  function addLine() {
    setForm((curr) => ({ ...curr, items: [...curr.items, { ...emptyLine }] }));
  }

  function removeLine(index) {
    setForm((curr) => {
      if (curr.items.length === 1) return curr;
      return { ...curr, items: curr.items.filter((_, i) => i !== index) };
    });
  }

  function buildInvoicePayload() {
    return {
      client_id: form.client_id,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
      taxes_enabled: Boolean(form.taxes_enabled),
      gst_hst_rate: Number(form.gst_hst_rate || 0),
      qst_rate: Number(form.qst_rate || 0),
      custom_tax_label: form.custom_tax_label || null,
      custom_tax_rate: Number(form.custom_tax_rate || 0),
      items: form.items.map((line) => ({
        item_id: line.item_id,
        description: line.description || null,
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0)
      }))
    };
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    setIsSavingInvoice(true);
    setError('');
    setMessage('');
    try {
      await createInvoice(buildInvoicePayload());
      setMessage('Facture brouillon créée avec succès.');
      closeForm();
      await loadInvoices();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) setError(apiErrors.join(' '));
      else setError(err.response?.data?.message || 'Impossible de créer la facture.');
    } finally {
      setIsSavingInvoice(false);
    }
  }

  async function handleGenerate(invoice) {
    setBusyInvoiceId(invoice.id);
    setMessage('');
    setError('');
    try {
      await generateInvoice(invoice.id);
      setMessage('Facture générée avec succès.');
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de générer la facture.');
    } finally {
      setBusyInvoiceId(null);
    }
  }

  async function handleGeneratePdf(invoice) {
    setBusyInvoiceId(invoice.id);
    setMessage('');
    setError('');
    try {
      await generateInvoicePdf(invoice.id);
      setMessage('PDF généré avec succès.');
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de générer le PDF.');
    } finally {
      setBusyInvoiceId(null);
    }
  }

  async function handleCancel(invoice) {
    const reason = window.prompt(`Pourquoi annuler la facture ${invoice.invoice_number || ''} ?`);
    if (reason === null) return;
    setBusyInvoiceId(invoice.id);
    setMessage('');
    setError('');
    try {
      await cancelInvoice(invoice.id, { cancellation_reason: reason });
      setMessage('Facture annulée avec succès.');
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'annuler la facture.");
    } finally {
      setBusyInvoiceId(null);
    }
  }

  async function handleSendReminder(invoice) {
    if (!invoice?.id) return;
    const confirmed = window.confirm(`Envoyer un rappel de paiement pour la facture ${invoice.invoice_number || 'sélectionnée'} ?`);
    if (!confirmed) return;
    try {
      setReminderSendingInvoiceId(invoice.id);
      setError('');
      setMessage('');
      await sendInvoiceReminder(invoice.id);
      setMessage('Rappel envoyé avec succès.');
      await loadReminderLogs(invoice.id);
      await loadInvoices();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      setError(Array.isArray(apiErrors) && apiErrors.length > 0 ? apiErrors.join(' ') : err?.response?.data?.message || "Impossible d'envoyer le rappel.");
      await loadReminderLogs(invoice.id);
    } finally {
      setReminderSendingInvoiceId(null);
    }
  }

async function handleToggleInvoiceReminders(invoice) {
  if (!invoice?.id) return;

  const currentlyEnabled = invoice.reminders_enabled !== false;

  const confirmed = window.confirm(
    currentlyEnabled
      ? 'Désactiver les rappels automatiques ?'
      : 'Activer les rappels automatiques ?'
  );

  if (!confirmed) return;

  try {
    setReminderUpdatingInvoiceId(invoice.id);
    setError('');
    setMessage('');

    if (currentlyEnabled) {
      await disableInvoiceReminders(invoice.id);

      setInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id
            ? {
                ...item,
                reminders_enabled: false
              }
            : item
        )
      );

      setMessage('Rappels désactivés.');
    } else {
      await enableInvoiceReminders(invoice.id);

      setInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id
            ? {
                ...item,
                reminders_enabled: true
              }
            : item
        )
      );

      setMessage('Rappels activés.');
    }

    await loadInvoices();
  } catch (err) {
    setError(
      err?.response?.data?.message ||
        'Impossible de modifier les rappels.'
    );
  } finally {
    setReminderUpdatingInvoiceId(null);
  }
}

  async function toggleReminderLogs(invoice) {
    if (!invoice?.id) return;
    if (expandedReminderInvoiceId === invoice.id) {
      setExpandedReminderInvoiceId(null);
      return;
    }
    setExpandedReminderInvoiceId(invoice.id);
    if (!reminderLogsByInvoiceId[invoice.id]) await loadReminderLogs(invoice.id);
  }

  function openPaymentForm(invoice) {
    setPaymentForm({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number || '',
      balance_due: Number(invoice.balance_due || 0),
      amount: Number(invoice.balance_due || 0).toFixed(2),
      payment_method: 'cash',
      payment_date: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: ''
    });
    setMessage('');
    setError('');
  }

  function closePaymentForm() {
    setPaymentForm({
      invoice_id: null,
      invoice_number: '',
      balance_due: 0,
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().slice(0, 10),
      reference: '',
      notes: ''
    });
  }

  function handlePaymentChange(e) {
    const { name, value } = e.target;
    setPaymentForm((curr) => ({ ...curr, [name]: value }));
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    setIsSavingPayment(true);
    setMessage('');
    setError('');
    try {
      await createPayment({
        invoice_id: paymentForm.invoice_id,
        amount: Number(paymentForm.amount || 0),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null
      });
      setMessage('Paiement enregistré avec succès.');
      closePaymentForm();
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'enregistrer le paiement.");
    } finally {
      setIsSavingPayment(false);
    }
  }

  function goToPage(page) {
    const nextFilters = { ...filters, page };
    setFilters(nextFilters);
    loadInvoices(nextFilters);
  }

  return (
    <div className="inv-page">

      {/* ── Header ── */}
      <div className="inv-header">
        <div className="inv-header-left">
          <span className="inv-eyebrow">Facturation</span>
          <h1 className="inv-title">Factures</h1>
          <p className="inv-subtitle">
            Créez, suivez et encaissez vos factures avec taxes canadiennes optionnelles.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openForm}>
          + Nouvelle facture
        </button>
      </div>

      {/* ── Toasts ── */}
      {message && <div className="toast toast-success">{message}</div>}
      {error && <div className="toast toast-error">{error}</div>}

      {/* ── Métriques ── */}
      <div className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Total facturé</span>
          <span className="metric-value">{formatMoney(metrics.totalAmount)}</span>
          <span className="metric-sub">{meta.total || 0} facture(s)</span>
        </div>
        <div className="metric-card metric-danger">
          <span className="metric-label">Non encaissé</span>
          <span className="metric-value">{formatMoney(metrics.unpaidAmount)}</span>
          <span className="metric-sub">Factures non payées</span>
        </div>
        <div className="metric-card metric-warning">
          <span className="metric-label">En attente</span>
          <span className="metric-value">{formatMoney(metrics.partialAmount)}</span>
          <span className="metric-sub">Partiellement payées</span>
        </div>
        <div className="metric-card metric-success">
          <span className="metric-label">Encaissé</span>
          <span className="metric-value">{formatMoney(metrics.paidAmount)}</span>
          <span className="metric-sub">Factures payées</span>
        </div>
      </div>

      {/* ── Filtres ── */}
      <form className="filter-bar" onSubmit={handleFilterSubmit}>
        <input
          className="filter-input filter-search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Rechercher — numéro, client, email…"
        />
        <select className="filter-select" name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="non_payee">Non payée</option>
          <option value="partiellement_payee">Partiellement payée</option>
          <option value="payee">Payée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select className="filter-select" name="client_id" value={filters.client_id} onChange={handleFilterChange}>
          <option value="">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>
          ))}
        </select>
        <input className="filter-input" name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} title="Date début" />
        <input className="filter-input" name="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} title="Date fin" />
        <button type="submit" className="btn-filter-submit" disabled={isLoading}>
          {isLoading ? 'Chargement…' : 'Rechercher'}
        </button>
        <button type="button" className="btn-ghost" onClick={resetFilters}>Réinitialiser</button>
      </form>

      {/* ── Formulaire nouvelle facture ── */}
      {isFormOpen && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Nouvelle facture</h2>
              <p className="panel-subtitle">Créée en brouillon — générez-la pour lui attribuer un numéro officiel.</p>
            </div>
            <button type="button" className="btn-ghost" onClick={closeForm}>Fermer</button>
          </div>

          <form className="inv-form" onSubmit={handleCreateInvoice}>
            <div className="form-grid-4">
              <label className="field-label">
                Client *
                <select name="client_id" value={form.client_id} onChange={handleFormChange} required className="field-input">
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{getClientDisplayName(c)}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Date d'émission *
                <input name="issue_date" type="date" value={form.issue_date} onChange={handleFormChange} required className="field-input" />
              </label>
              <label className="field-label">
                Date d'échéance
                <input name="due_date" type="date" value={form.due_date} onChange={handleFormChange} className="field-input" />
              </label>
              <label className="field-label">
                Taxes Canada
                <select name="tax_preset" value={form.tax_preset} onChange={(e) => applyTaxPreset(e.target.value)} className="field-input">
                  <option value="none">Aucune taxe</option>
                  <option value="quebec">Québec — TPS 5% + TVQ 9,975%</option>
                  <option value="ontario">Ontario — TVH 13%</option>
                  <option value="alberta">Alberta — TPS 5%</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </label>
            </div>

            {form.taxes_enabled && (
              <div className="tax-panel">
                <div className="tax-panel-title">
                  <strong>Taxes optionnelles</strong>
                  <span>Ajoutées au sous-total de la facture.</span>
                </div>
                <label className="field-label">
                  TPS/TVH %
                  <input name="gst_hst_rate" type="number" min="0" step="0.001" value={form.gst_hst_rate} onChange={handleFormChange} className="field-input" />
                </label>
                <label className="field-label">
                  TVQ %
                  <input name="qst_rate" type="number" min="0" step="0.001" value={form.qst_rate} onChange={handleFormChange} className="field-input" />
                </label>
                <label className="field-label">
                  Taxe personnalisée
                  <input name="custom_tax_label" value={form.custom_tax_label} onChange={handleFormChange} placeholder="Ex : Local tax" className="field-input" />
                </label>
                <label className="field-label">
                  Taux %
                  <input name="custom_tax_rate" type="number" min="0" step="0.001" value={form.custom_tax_rate} onChange={handleFormChange} className="field-input" />
                </label>
              </div>
            )}

            <div className="lines-section">
              <div className="lines-section-header">
                <h3 className="lines-section-title">Articles / Services</h3>
                <button type="button" className="btn-ghost" onClick={addLine}>+ Ajouter une ligne</button>
              </div>

              {form.items.map((line, index) => {
                const selectedClient = getSelectedClient(clients, form.client_id);
                return (
                  <div className="line-row" key={`line-${index}`}>
                    <label className="field-label">
                      Article *
                      <select value={line.item_id} onChange={(e) => handleLineChange(index, 'item_id', e.target.value)} required className="field-input">
                        <option value="">Sélectionner</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} — {formatMoney(getCatalogPriceForClient(item, selectedClient))}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label line-desc">
                      Description
                      <input value={line.description} onChange={(e) => handleLineChange(index, 'description', e.target.value)} className="field-input" />
                    </label>
                    <label className="field-label line-qty">
                      Qté *
                      <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => handleLineChange(index, 'quantity', e.target.value)} required className="field-input" />
                    </label>
                    <label className="field-label line-price">
                      Prix unitaire *
                      <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)} required className="field-input" />
                    </label>
                    <div className="line-total-cell">
                      <span className="line-total-label">Total</span>
                      <strong className="line-total-value">
                        {formatMoney(Number(line.quantity || 0) * Number(line.unit_price || 0))}
                      </strong>
                      <span className={`price-source-tag ${line.price_source}`}>
                        {line.price_source === 'manual' ? 'Manuel' : 'Catalogue'}
                      </span>
                    </div>
                    <button type="button" className="btn-remove-line" onClick={() => removeLine(index)} disabled={form.items.length === 1}>
                      Retirer
                    </button>
                  </div>
                );
              })}
            </div>

            <label className="field-label">
              Notes (visibles sur la facture)
              <textarea name="notes" rows="3" value={form.notes} onChange={handleFormChange} placeholder="Instructions de paiement, remerciements…" className="field-input" />
            </label>

            <div className="preview-totals">
              <div className="preview-row">
                <span>Sous-total</span>
                <strong>{formatMoney(preview.subtotal_amount)}</strong>
              </div>
              {form.taxes_enabled && (
                <>
                  {Number(preview.gst_hst_amount) > 0 && (
                    <div className="preview-row">
                      <span>TPS/TVH ({form.gst_hst_rate}%)</span>
                      <strong>{formatMoney(preview.gst_hst_amount)}</strong>
                    </div>
                  )}
                  {Number(preview.qst_amount) > 0 && (
                    <div className="preview-row">
                      <span>TVQ ({form.qst_rate}%)</span>
                      <strong>{formatMoney(preview.qst_amount)}</strong>
                    </div>
                  )}
                  {Number(preview.custom_tax_amount) > 0 && (
                    <div className="preview-row">
                      <span>{form.custom_tax_label || 'Taxe personnalisée'} ({form.custom_tax_rate}%)</span>
                      <strong>{formatMoney(preview.custom_tax_amount)}</strong>
                    </div>
                  )}
                  <div className="preview-row">
                    <span>Total taxes</span>
                    <strong>{formatMoney(preview.tax_amount)}</strong>
                  </div>
                </>
              )}
              <div className="preview-row preview-row-total">
                <span>Total facture</span>
                <strong>{formatMoney(preview.total_amount)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={closeForm}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={isSavingInvoice}>
                {isSavingInvoice ? 'Création…' : 'Créer la facture'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Formulaire paiement ── */}
      {paymentForm.invoice_id && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Enregistrer un paiement</h2>
              <p className="panel-subtitle">
                Facture {paymentForm.invoice_number} — solde : {formatMoney(paymentForm.balance_due)}
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={closePaymentForm}>Fermer</button>
          </div>

          <form className="payment-form" onSubmit={handlePaymentSubmit}>
            <label className="field-label">
              Montant *
              <input name="amount" type="number" min="0.01" step="0.01" max={paymentForm.balance_due} value={paymentForm.amount} onChange={handlePaymentChange} required className="field-input" />
            </label>
            <label className="field-label">
              Méthode *
              <select name="payment_method" value={paymentForm.payment_method} onChange={handlePaymentChange} required className="field-input">
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Date *
              <input name="payment_date" type="date" value={paymentForm.payment_date} onChange={handlePaymentChange} required className="field-input" />
            </label>
            <label className="field-label">
              Référence
              <input name="reference" value={paymentForm.reference} onChange={handlePaymentChange} className="field-input" />
            </label>
            <label className="field-label payment-notes">
              Notes
              <textarea name="notes" value={paymentForm.notes} onChange={handlePaymentChange} rows="2" className="field-input" />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={closePaymentForm}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={isSavingPayment}>
                {isSavingPayment ? 'Enregistrement…' : 'Enregistrer le paiement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste des factures ── */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des factures</h2>
            <p className="panel-subtitle">{meta.total || 0} facture(s) trouvée(s)</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => loadInvoices()}>
            Actualiser
          </button>
        </div>

        <div className="inv-list-header">
          <span></span>
          <span>Numéro</span>
          <span>Client</span>
          <span>Dates</span>
          <span>Montant</span>
          <span>Statut</span>
          <span>Rappels</span>
          <span>Actions</span>
        </div>

        <div className="inv-list">
          {invoices.length === 0 && (
            <div className="inv-empty">
              {isLoading ? (
                'Chargement des factures…'
              ) : (
                <div className="inv-empty-content">
                  <p>Aucune facture trouvée.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={openForm}
                  >
                    Créer une facture
                  </button>
                </div>
              )}
            </div>
          )}

          {invoices.map((invoice) => {
            const overdue = isInvoiceOverdue(invoice);
            const isBusy = busyInvoiceId === invoice.id;
            const canPay = invoice.status !== 'brouillon' && invoice.status !== 'annulee' && Number(invoice.balance_due || 0) > 0;
            const canSendReminder = canSendReminderForInvoice(invoice);
            const reminderLogs = reminderLogsByInvoiceId[invoice.id] || [];
            const isReminderExpanded = expandedReminderInvoiceId === invoice.id;
            const isReminderLoading = reminderLoadingInvoiceId === invoice.id;
            const isReminderSending = reminderSendingInvoiceId === invoice.id;
            const isReminderUpdating = reminderUpdatingInvoiceId === invoice.id;

            return (
  <Fragment key={invoice.id}>
                <div className="inv-row" key={invoice.id}>
                  <div className={`inv-row-accent status-${invoice.status}${overdue ? ' overdue' : ''}`} />

                  <div className="inv-num">
                    <strong>{invoice.invoice_number || 'Brouillon'}</strong>
                    <span>{invoice.id.slice(0, 8)}</span>
                  </div>

                  <div className="inv-client">
                    <strong>{getInvoiceClientName(invoice)}</strong>
                    <span>{invoice.billing_email || invoice.client_email || '—'}</span>
                  </div>

                  <div className="inv-dates">
                    <span>Ém. {formatDate(invoice.issue_date)}</span>
                    <span>Éch. {formatDate(invoice.due_date)}</span>
                  </div>

                  <div className="inv-amount">
                    <strong>{formatMoney(invoice.total_amount)}</strong>
                    <span>Payé {formatMoney(invoice.paid_amount)}</span>
                    <span className={Number(invoice.balance_due) > 0 ? 'balance-due' : ''}>
                      Solde {formatMoney(invoice.balance_due)}
                    </span>
                  </div>

                  <div className="inv-status-stack">
                    <span className={`status-pill status-${invoice.status}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                    {overdue && (
                      <span className="status-pill status-overdue">En retard</span>
                    )}
                  </div>

                  <div className="inv-reminder-info">
                    <span className={`reminder-auto-badge ${invoice.reminders_enabled === false ? 'off' : 'on'}`}>
                      {invoice.reminders_enabled === false ? 'Auto off' : 'Auto on'}
                    </span>
                    <small>{invoice.reminder_count || 0} envoyé(s)</small>
                    {invoice.last_reminder_sent_at && (
                      <small>Dernier : {formatDateTime(invoice.last_reminder_sent_at)}</small>
                    )}
                  </div>

                  <div className="inv-actions">
                    {invoice.status === 'brouillon' && (
                      <button type="button" className="act-btn act-primary" onClick={() => handleGenerate(invoice)} disabled={isBusy}>
                        Générer
                      </button>
                    )}
                    {invoice.status !== 'brouillon' && invoice.status !== 'annulee' && (
                      <button type="button" className="act-btn" onClick={() => handleGeneratePdf(invoice)} disabled={isBusy}>
                        PDF
                      </button>
                    )}
                    {canDownloadInvoicePdf(invoice) && (
                      <button
                        type="button"
                        className="act-btn act-link"
                        disabled={isBusy}
                        onClick={async () => {
                          try {
                            setBusyInvoiceId(invoice.id);
                            await triggerInvoicePdfDownload(invoice);
                          } catch (err) {
                            setError(
                              err.response?.data?.message ||
                                'Impossible de télécharger le PDF.'
                            );
                          } finally {
                            setBusyInvoiceId(null);
                          }
                        }}
                      >
                        Télécharger
                      </button>
                    )}
                    {canEmailInvoice(invoice) && (
                      <button type="button" className="act-btn" onClick={() => setEmailInvoiceId(invoice.id)} disabled={isBusy}>
                        Envoyer par email
                      </button>
                    )}
                    {canSendReminder && (
                      <button type="button" className="act-btn act-warning" onClick={() => handleSendReminder(invoice)} disabled={isReminderSending}>
                        {isReminderSending ? 'Envoi…' : 'Rappel'}
                      </button>
                    )}
                    {invoice.status !== 'brouillon' && invoice.status !== 'annulee' && (
                      <button type="button" className="act-btn" onClick={() => handleToggleInvoiceReminders(invoice)} disabled={isReminderUpdating}>
                        {invoice.reminders_enabled === false ? 'Activer auto' : 'Désactiver auto'}
                      </button>
                    )}
                    {invoice.status !== 'brouillon' && (
                      <button type="button" className="act-btn" onClick={() => toggleReminderLogs(invoice)} disabled={isReminderLoading}>
                        {isReminderExpanded ? 'Masquer rappels' : 'Voir rappels'}
                      </button>
                    )}
                    {canPay && (
                      <button type="button" className="act-btn act-success" onClick={() => openPaymentForm(invoice)} disabled={isBusy}>
                        Paiement
                      </button>
                    )}
                    {invoice.status !== 'annulee' && (
                      <button type="button" className="act-btn act-danger" onClick={() => handleCancel(invoice)} disabled={isBusy}>
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {isReminderExpanded && (
                  <div className="reminder-panel" key={`${invoice.id}-reminders`}>
                    <div className="reminder-panel-header">
                      <div>
                        <h3 className="reminder-panel-title">Historique des rappels</h3>
                        <p className="reminder-panel-subtitle">
                          Facture {invoice.invoice_number || invoice.id.slice(0, 8)}
                        </p>
                      </div>
                      <button type="button" className="btn-ghost" onClick={() => loadReminderLogs(invoice.id)} disabled={isReminderLoading}>
                        {isReminderLoading ? 'Chargement…' : 'Actualiser'}
                      </button>
                    </div>

                    {reminderLogs.length === 0 ? (
                      <div className="reminder-empty">Aucun rappel envoyé pour cette facture.</div>
                    ) : (
                      <div className="reminder-list">
                        {reminderLogs.map((log) => (
                          <div key={log.id} className={`reminder-log reminder-log-${log.status}`}>
                            <div className="reminder-log-main">
                              <strong>{log.subject}</strong>
                              <span>{log.recipient_email}</span>
                              <small>{formatDateTime(log.sent_at)}</small>
                            </div>
                            <div className="reminder-log-meta">
                              <span className={`reminder-status-pill reminder-status-${log.status}`}>
                                {formatReminderStatus(log.status)}
                              </span>
                              <small>{formatReminderType(log.reminder_type)}</small>
                            </div>
                            {log.error_message && (
                              <p className="reminder-error">{log.error_message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="pagination">
          <button type="button" className="btn-ghost" disabled={meta.page <= 1} onClick={() => goToPage(meta.page - 1)}>
            ← Précédent
          </button>
          <span className="pagination-info">Page {meta.page || 1} sur {totalPages}</span>
          <button type="button" className="btn-ghost" disabled={meta.page >= totalPages} onClick={() => goToPage(meta.page + 1)}>
            Suivant →
          </button>
        </div>
      </div>

      <InvoiceEmailModal
        invoiceId={emailInvoiceId}
        isOpen={Boolean(emailInvoiceId)}
        onClose={() => setEmailInvoiceId(null)}
        onSent={() => {
          setMessage('Facture envoyée par email avec succès.');
          loadInvoices();
        }}
      />
    </div>
  );
}