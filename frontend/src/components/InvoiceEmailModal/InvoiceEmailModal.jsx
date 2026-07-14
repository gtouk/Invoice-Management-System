import { useEffect, useState } from 'react';
import {
  getInvoiceEmailLogs,
  prepareInvoiceEmail,
  sendInvoiceEmail
} from '../../services/invoiceEmail.service';
import { downloadInvoicePdf } from '../../services/invoice.service';
import { formatDateTime } from '../../utils/formatters';
import './InvoiceEmailModal.css';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        from: preparedData.email?.from || preparedData.company_settings?.company_email || '',
        from_name:
          preparedData.email?.from_name ||
          preparedData.company_settings?.company_name ||
          '',
        to: preparedData.recipient_email || preparedData.email?.to || '',
        cc: preparedData.email?.cc || '',
        bcc: preparedData.email?.bcc || '',
        subject: preparedData.subject || preparedData.email?.subject || '',
        body: preparedData.body || preparedData.email?.body || ''
      });

      if (preparedData.can_send === false) {
        setError("Le PDF de cette facture n'est pas disponible.");
      }
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

  async function handleDownloadAttachment() {
    if (!invoiceId) return;

    setIsDownloading(true);
    setError('');

    try {
      const response = await downloadInvoicePdf(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        prepared?.attachment_name || `facture-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de télécharger le PDF.'
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();

    if (prepared?.can_send === false) {
      setError("Le PDF de cette facture n'est pas disponible.");
      return;
    }

    setIsSending(true);
    setError('');
    setMessage('');

    try {
      await sendInvoiceEmail(invoiceId, form);

      setMessage('Facture envoyée par email avec succès.');

      const logsResponse = await getInvoiceEmailLogs(invoiceId);
      setLogs(logsResponse.data || []);
      setActiveTab('history');

      if (onSent) {
        onSent({ success: true });
      }
    } catch (err) {
      const backendMessage =
        err.response?.data?.message ||
        'Impossible d’envoyer l’email.';
      const apiErrors = err.response?.data?.errors;
      const failedLog = Array.isArray(apiErrors)
        ? apiErrors.find((item) => item?.error_message)
        : null;
      const detail = failedLog?.error_message;

      const status = err.response?.status;
      const isSmtpIssue = status === 502 || /smtp/i.test(backendMessage);

      setError(
        [
          backendMessage,
          detail && detail !== backendMessage ? detail : null,
          isSmtpIssue
            ? 'Vérifiez SMTP_HOST / SMTP_USER / SMTP_PASSWORD dans .env, puis redémarrez le backend.'
            : null
        ]
          .filter(Boolean)
          .join(' ')
      );

      try {
        const logsResponse = await getInvoiceEmailLogs(invoiceId);
        setLogs(logsResponse.data || []);
        setActiveTab('history');
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

  const attachmentName =
    prepared?.attachment_name ||
    prepared?.email?.attachment?.name ||
    null;

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
                type="email"
                value={form.to}
                onChange={handleChange}
                placeholder="client@email.com"
                required
              />
            </label>

            <div className="email-two-columns">
              <label className="email-row">
                <span>Cc</span>
                <input
                  name="cc"
                  value={form.cc}
                  onChange={handleChange}
                  placeholder="optionnel"
                />
              </label>

              <label className="email-row">
                <span>Bcc</span>
                <input
                  name="bcc"
                  value={form.bcc}
                  onChange={handleChange}
                  placeholder="optionnel"
                />
              </label>
            </div>

            <label className="email-row">
              <span>Sujet</span>
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

            {attachmentName && (
              <div className="email-attachment-card">
                <div>
                  <span className="attachment-icon">PDF</span>
                </div>

                <div>
                  <strong>{attachmentName}</strong>
                  <span>
                    {prepared?.has_pdf
                      ? 'Pièce jointe automatiquement ajoutée'
                      : "PDF indisponible"}
                  </span>
                </div>

                {prepared?.has_pdf && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleDownloadAttachment}
                    disabled={isDownloading}
                  >
                    {isDownloading ? '...' : 'Télécharger'}
                  </button>
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

              <button
                type="submit"
                disabled={isSending || prepared?.can_send === false}
              >
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
                    {log.cc_email && <span>Cc : {log.cc_email}</span>}
                    {log.bcc_email && <span>Bcc : {log.bcc_email}</span>}
                    <small>
                      {formatDateTime(log.sent_at || log.created_at)} · {log.sent_by_name || 'Utilisateur'}
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
