import { useEffect, useMemo, useState } from 'react';
import {
  getDueReminderInvoices,
  getReminderSettings,
  runInvoiceRemindersNow,
  updateReminderSettings
} from '../../services/invoiceReminder.service';
import './InvoiceReminderSettings.css';

const defaultForm = {
  enabled: true,
  start_after_due_days: 1,
  frequency_days: 7,
  max_reminders: '',
  send_time: '09:00',
  email_subject: 'Payment reminder for invoice {{invoice_number}}',
  email_message:
    'Hello {{client_name}}, this is a reminder that invoice {{invoice_number}} has a remaining balance of {{balance_due}}.'
};

function unwrapApiData(response) {
  return response?.data || response?.message?.data || null;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(number);
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('fr-CA');
}

export default function InvoiceReminderSettings() {
  const [form, setForm] = useState(defaultForm);
  const [dueInvoices, setDueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [runResult, setRunResult] = useState(null);

  const variables = useMemo(
    () => [
      '{{client_name}}',
      '{{invoice_number}}',
      '{{issue_date}}',
      '{{due_date}}',
      '{{subtotal_amount}}',
      '{{tax_amount}}',
      '{{total_amount}}',
      '{{paid_amount}}',
      '{{balance_due}}',
      '{{company_name}}',
      '{{company_email}}',
      '{{company_phone}}',
      '{{invoice_pdf_link}}'
    ],
    []
  );

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const [settingsResponse, dueInvoicesResponse] = await Promise.all([
        getReminderSettings(),
        getDueReminderInvoices()
      ]);

      const settings = unwrapApiData(settingsResponse);
      const invoices = unwrapApiData(dueInvoicesResponse) || [];

      if (settings) {
        setForm({
          enabled: Boolean(settings.enabled),
          start_after_due_days: settings.start_after_due_days ?? 1,
          frequency_days: settings.frequency_days ?? 7,
          max_reminders: settings.max_reminders ?? '',
          send_time: settings.send_time || '09:00',
          email_subject:
            settings.email_subject || defaultForm.email_subject,
          email_message:
            settings.email_message || defaultForm.email_message
        });
      }

      setDueInvoices(invoices);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Impossible de charger les paramètres de rappel."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        enabled: form.enabled,
        start_after_due_days: Number(form.start_after_due_days),
        frequency_days: Number(form.frequency_days),
        max_reminders:
          form.max_reminders === '' || form.max_reminders === null
            ? null
            : Number(form.max_reminders),
        send_time: form.send_time,
        email_subject: form.email_subject,
        email_message: form.email_message
      };

      await updateReminderSettings(payload);

      setMessage('Paramètres de rappel enregistrés avec succès.');
      await loadData();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;

      setError(
        Array.isArray(apiErrors) && apiErrors.length > 0
          ? apiErrors.join(' ')
          : err?.response?.data?.message ||
              "Impossible d'enregistrer les paramètres."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    try {
      setRunning(true);
      setError('');
      setMessage('');
      setRunResult(null);

      const response = await runInvoiceRemindersNow();
      const data = unwrapApiData(response);

      setRunResult(data);
      setMessage('Traitement automatique lancé avec succès.');

      await loadData();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;

      setError(
        Array.isArray(apiErrors) && apiErrors.length > 0
          ? apiErrors.join(' ')
          : err?.response?.data?.message ||
              "Impossible de lancer le traitement automatique."
      );
    } finally {
      setRunning(false);
    }
  }

  function insertVariable(variable) {
    setForm((current) => ({
      ...current,
      email_message: `${current.email_message || ''} ${variable}`.trim()
    }));
  }

  if (loading) {
    return (
      <div className="reminder-page">
        <div className="reminder-loading">Chargement des paramètres...</div>
      </div>
    );
  }

  return (
    <div className="reminder-page">
      <div className="reminder-hero">
        <div>
          <p className="reminder-eyebrow">Automatisation</p>
          <h1>Rappels de paiement</h1>
          <p>
            Configure l’envoi automatique des rappels aux clients lorsque les
            factures arrivent à échéance et ne sont pas encore complètement
            payées.
          </p>
        </div>

        <button
          type="button"
          className="reminder-run-button"
          onClick={handleRunNow}
          disabled={running}
        >
          {running ? 'Traitement...' : 'Lancer maintenant'}
        </button>
      </div>

      {message && <div className="reminder-alert success">{message}</div>}
      {error && <div className="reminder-alert error">{error}</div>}

      {runResult && (
        <div className="reminder-result-card">
          <strong>Résultat du traitement :</strong>{' '}
          {runResult.total || 0} facture(s) vérifiée(s).
        </div>
      )}

      <div className="reminder-grid">
        <form className="reminder-card reminder-form" onSubmit={handleSubmit}>
          <div className="reminder-card-header">
            <div>
              <h2>Paramètres automatiques</h2>
              <p>Ces paramètres sont propres à l’entreprise connectée.</p>
            </div>

            <label className="reminder-switch">
              <input
                type="checkbox"
                name="enabled"
                checked={form.enabled}
                onChange={handleChange}
              />
              <span />
              <strong>{form.enabled ? 'Activé' : 'Désactivé'}</strong>
            </label>
          </div>

          <div className="reminder-form-grid">
            <label>
              <span>Démarrer après échéance</span>
              <input
                type="number"
                min="0"
                name="start_after_due_days"
                value={form.start_after_due_days}
                onChange={handleChange}
              />
              <small>0 = le jour même de l’échéance.</small>
            </label>

            <label>
              <span>Fréquence d’envoi</span>
              <input
                type="number"
                min="1"
                name="frequency_days"
                value={form.frequency_days}
                onChange={handleChange}
              />
              <small>Nombre de jours entre deux rappels.</small>
            </label>

            <label>
              <span>Maximum de rappels</span>
              <input
                type="number"
                min="1"
                name="max_reminders"
                value={form.max_reminders}
                onChange={handleChange}
                placeholder="Illimité"
              />
              <small>Laisse vide pour envoyer jusqu’au paiement complet.</small>
            </label>

            <label>
              <span>Heure d’envoi</span>
              <input
                type="time"
                name="send_time"
                value={form.send_time}
                onChange={handleChange}
              />
              <small>Utilisé pour l’affichage et les réglages métier.</small>
            </label>
          </div>

          <label className="reminder-full-field">
            <span>Sujet de l’email</span>
            <input
              type="text"
              name="email_subject"
              value={form.email_subject}
              onChange={handleChange}
            />
          </label>

          <label className="reminder-full-field">
            <span>Message de l’email</span>
            <textarea
              name="email_message"
              value={form.email_message}
              onChange={handleChange}
              rows={8}
            />
          </label>

          <div className="reminder-variables">
            <span>Variables disponibles :</span>
            <div>
              {variables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                >
                  {variable}
                </button>
              ))}
            </div>
          </div>

          <div className="reminder-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>

        <div className="reminder-card">
          <div className="reminder-card-header">
            <div>
              <h2>Factures impayées</h2>
              <p>
                Factures avec échéance, solde restant et rappels activés.
              </p>
            </div>

            <span className="reminder-count">{dueInvoices.length}</span>
          </div>

          <div className="reminder-invoice-list">
            {dueInvoices.length === 0 ? (
              <div className="reminder-empty">
                Aucune facture en attente de rappel.
              </div>
            ) : (
              dueInvoices.map((invoice) => (
                <div key={invoice.id} className="reminder-invoice-item">
                  <div>
                    <strong>{invoice.invoice_number}</strong>
                    <span>{invoice.client_name || 'Client'}</span>
                    <small>
                      Échéance : {formatDate(invoice.due_date)}
                    </small>
                  </div>

                  <div>
                    <strong>{formatMoney(invoice.balance_due)}</strong>
                    <span>{invoice.status}</span>
                    <small>
                      Rappels envoyés : {invoice.reminder_count || 0}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}