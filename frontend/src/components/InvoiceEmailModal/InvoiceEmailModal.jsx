import { useEffect, useMemo, useState } from 'react';
import {
  getInvoiceEmailLogs,
  prepareInvoiceEmail,
  sendInvoiceEmail
} from '../../services/invoiceEmail.service';
import './InvoiceEmailModal.css';

function buildFileUrl(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  return `${backendBaseUrl}${fileUrl}`;
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-CA');
}

export default function InvoiceEmailModal({
  invoiceId,
  isOpen,
  onClose,
  onSent
}) {
  const [prepared, setPrepared] = useState(null);
  const [logs, setLogs] = useState([]);

  const [form, setForm] = useState({
    from: '',
    from_name: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });

  const [activeTab, setActiveTab] = useState('compose');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const attachmentUrl = useMemo(() => {
    return buildFileUrl(prepared?.email?.attachment?.url);
  }, [prepared]);

  async function loadEmailData() {
    if (!invoiceId) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const [preparedResponse, logsResponse] = await Promise.all([
        prepareInvoiceEmail(invoiceId),
        getInvoiceEmailLogs(invoiceId)
      ]);

      const preparedData = preparedResponse.data;
      const logsData = logsResponse.data || [];

      setPrepared(preparedData);
      setLogs(logsData);

      setForm({
        from: preparedData.email?.from || '',
        from_name: preparedData.email?.from_name || '',
        to: preparedData.email?.to || '',
        cc: preparedData.email?.cc || '',
        bcc: preparedData.email?.bcc || '',
        subject: preparedData.email?.subject || '',
        body: preparedData.email?.body || ''
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de préparer l’email de facture.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('compose');
      loadEmailData();
    }
  }, [isOpen, invoiceId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSend(event) {
    event.preventDefault();

    setIsSending(true);
    setError('');
    setMessage('');

    try {
      await sendInvoiceEmail(invoiceId, form);

      setMessage('Facture envoyée par email avec succès.');

      const logsResponse = await getInvoiceEmailLogs(invoiceId);
      setLogs(logsResponse.data || []);

      if (onSent) {
        onSent();
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(
          err.response?.data?.message ||
            apiErrors.map((item) => item.error_message || item).join(' ')
        );
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’envoyer l’email.'
        );
      }

      try {
        const logsResponse = await getInvoiceEmailLogs(invoiceId);
        setLogs(logsResponse.data || []);
      } catch {
        // ignore refresh error
      }
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="email-modal-backdrop">
      <div className="email-modal">
        <div className="email-modal-header">
          <div>
            <span>Nouvel email</span>
            <h2>Envoyer la facture</h2>
          </div>

          <button type="button" onClick={onClose} className="email-close-button">
            ×
          </button>
        </div>

        <div className="email-tabs">
          <button
            type="button"
            className={activeTab === 'compose' ? 'active' : ''}
            onClick={() => setActiveTab('compose')}
          >
            Message
          </button>

          <button
            type="button"
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            Historique ({logs.length})
          </button>
        </div>

        {isLoading && (
          <div className="email-loading">
            Préparation de l’email...
          </div>
        )}

        {message && <div className="email-success">{message}</div>}
        {error && <div className="email-error">{error}</div>}

        {!isLoading && activeTab === 'compose' && (
          <form className="email-compose" onSubmit={handleSend}>
            <div className="email-row readonly">
              <label>De</label>
              <div className="email-from-box">
                <strong>{form.from_name || 'Entreprise'}</strong>
                <span>{form.from || 'Email entreprise non configuré'}</span>
              </div>
            </div>

            <label className="email-row">
              <span>À</span>
              <input
                name="to"
                value={form.to}
                onChange={handleChange}
                placeholder="client@email.com"
                required
              />
            </label>

            <div className="email-two-columns">
              <label className="email-row">
                <span>CC</span>
                <input
                  name="cc"
                  value={form.cc}
                  onChange={handleChange}
                  placeholder="optionnel"
                />
              </label>

              <label className="email-row">
                <span>BCC</span>
                <input
                  name="bcc"
                  value={form.bcc}
                  onChange={handleChange}
                  placeholder="optionnel"
                />
              </label>
            </div>

            <label className="email-row">
              <span>Objet</span>
              <input
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </label>

            <label className="email-row body-row">
              <span>Message</span>
              <textarea
                name="body"
                value={form.body}
                onChange={handleChange}
                rows="12"
                required
              />
            </label>

            {prepared?.email?.attachment && (
              <div className="email-attachment-card">
                <div>
                  <span className="attachment-icon">PDF</span>
                </div>

                <div>
                  <strong>{prepared.email.attachment.name}</strong>
                  <span>Pièce jointe automatiquement ajoutée</span>
                </div>

                {attachmentUrl && (
                  <a href={attachmentUrl} target="_blank" rel="noreferrer">
                    Ouvrir
                  </a>
                )}
              </div>
            )}

            <div className="email-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={onClose}
                disabled={isSending}
              >
                Annuler
              </button>

              <button type="submit" disabled={isSending}>
                {isSending ? 'Envoi en cours...' : 'Envoyer'}
              </button>
            </div>
          </form>
        )}

        {!isLoading && activeTab === 'history' && (
          <div className="email-history">
            {logs.length === 0 && (
              <p className="email-empty">
                Aucun email envoyé pour cette facture.
              </p>
            )}

            {logs.map((log) => (
              <div key={log.id} className={`email-log-card ${log.status}`}>
                <div className="email-log-main">
                  <div>
                    <strong>{log.subject}</strong>
                    <span>
                      À : {log.recipient_email}
                    </span>
                    {log.cc_email && <span>CC : {log.cc_email}</span>}
                    {log.bcc_email && <span>BCC : {log.bcc_email}</span>}
                    <small>
                      {formatDate(log.sent_at)} · {log.sent_by_name || 'Utilisateur'}
                    </small>
                  </div>

                  <span className="email-status-pill">
                    {log.status === 'sent' ? 'Envoyé' : 'Échec'}
                  </span>
                </div>

                {log.error_message && (
                  <p className="email-log-error">{log.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
