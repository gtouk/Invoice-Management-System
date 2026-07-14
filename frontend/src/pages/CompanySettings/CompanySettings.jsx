import { useEffect, useState } from 'react';
import {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo
} from '../../services/companySettings.service';
import './CompanySettings.css';

const emptyForm = {
  company_name: '',
  company_phone: '',
  company_email: '',
  company_address: '',
  business_number: '',
  gst_hst_number: '',
  qst_number: '',
  invoice_footer_note: '',
  bank_name: '',
  bank_account_name: '',
  bank_account: '',
  bank_routing_number: ''
};

function buildFileUrl(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  return `${backendBaseUrl}${fileUrl}`;
}

export default function CompanySettings() {
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadSettings() {
    setIsLoading(true);
    setError('');

    try {
      const response = await getCompanySettings();
      const data = response.data;

      setSettings(data);

      setForm({
        company_name: data.company_name || '',
        company_phone: data.company_phone || '',
        company_email: data.company_email || '',
        company_address: data.company_address || '',
        business_number: data.business_number || '',
        gst_hst_number: data.gst_hst_number || '',
        qst_number: data.qst_number || '',
        invoice_footer_note: data.invoice_footer_note || '',
        bank_name: data.bank_name || '',
        bank_account_name: data.bank_account_name || '',
        bank_account: data.bank_account || '',
        bank_routing_number: data.bank_routing_number || ''
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les paramètres entreprise.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];

    setLogoFile(file || null);

    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await updateCompanySettings(form);
      const data = response.data;

      setSettings(data);

      setForm({
        company_name: data.company_name || '',
        company_phone: data.company_phone || '',
        company_email: data.company_email || '',
        company_address: data.company_address || '',
        business_number: data.business_number || '',
        gst_hst_number: data.gst_hst_number || '',
        qst_number: data.qst_number || '',
        invoice_footer_note: data.invoice_footer_note || '',
        bank_name: data.bank_name || '',
        bank_account_name: data.bank_account_name || '',
        bank_account: data.bank_account || '',
        bank_routing_number: data.bank_routing_number || ''
      });

      setMessage('Paramètres entreprise mis à jour avec succès.');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible de mettre à jour les paramètres.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadLogo(event) {
    event.preventDefault();

    if (!logoFile) {
      setError('Veuillez choisir un logo avant de téléverser.');
      return;
    }

    setIsUploadingLogo(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await uploadCompanyLogo(formData);
      const data = response.data;

      setSettings(data);
      setLogoFile(null);
      setLogoPreview(null);

      setMessage('Logo entreprise mis à jour avec succès.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de téléverser le logo.'
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  const logoUrl =
    logoPreview || buildFileUrl(settings?.company_logo_url);

  return (
    <div className="page-stack company-settings-page">
      <div className="page-header">
        <div>
          <h1>Paramètres entreprise</h1>
          <p>
            Gérez les informations utilisées sur vos factures, votre logo,
            vos taxes canadiennes et vos coordonnées bancaires.
          </p>
        </div>

        <button type="button" onClick={loadSettings} disabled={isLoading}>
          Actualiser
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="company-settings-layout">
        <section className="panel logo-panel">
          <h2>Logo entreprise</h2>

          <div className="logo-preview-box">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo entreprise" />
            ) : (
              <div className="logo-placeholder">
                <span>Logo</span>
              </div>
            )}
          </div>

          <form onSubmit={handleUploadLogo} className="logo-upload-form">
            <label>
              Choisir un logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
              />
            </label>

            <button type="submit" disabled={isUploadingLogo || !logoFile}>
              {isUploadingLogo ? 'Téléversement...' : 'Mettre à jour le logo'}
            </button>
          </form>

          <p className="helper-text">
            Formats acceptés : JPG, PNG, WEBP. Taille recommandée : logo clair
            sur fond transparent ou blanc.
          </p>
        </section>

        <section className="panel settings-form-panel">
          <h2>Informations générales</h2>

          <form className="settings-form" onSubmit={handleSubmit}>
            <label>
              Nom de l’entreprise *
              <input
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Téléphone
              <input
                name="company_phone"
                value={form.company_phone}
                onChange={handleChange}
                placeholder="+1 514 ..."
              />
            </label>

            <label>
              Email entreprise / facturation
              <input
                name="company_email"
                value={form.company_email}
                onChange={handleChange}
                type="email"
                placeholder="billing@company.com"
              />
            </label>

            <label className="form-wide">
              Adresse entreprise
              <textarea
                name="company_address"
                value={form.company_address}
                onChange={handleChange}
                rows="3"
                placeholder="Adresse, ville, province, pays"
              />
            </label>

            <div className="form-wide settings-section-title">
              Informations fiscales canadiennes
            </div>

            <label>
              Business Number
              <input
                name="business_number"
                value={form.business_number}
                onChange={handleChange}
                placeholder="123456789"
              />
            </label>

            <label>
              GST/HST Number
              <input
                name="gst_hst_number"
                value={form.gst_hst_number}
                onChange={handleChange}
                placeholder="123456789 RT0001"
              />
            </label>

            <label>
              QST Number
              <input
                name="qst_number"
                value={form.qst_number}
                onChange={handleChange}
                placeholder="1234567890 TQ0001"
              />
            </label>

            <div className="form-wide settings-section-title">
              Coordonnées bancaires optionnelles
            </div>

            <label>
              Nom de la banque
              <input
                name="bank_name"
                value={form.bank_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Nom du compte
              <input
                name="bank_account_name"
                value={form.bank_account_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Numéro de compte
              <input
                name="bank_account"
                value={form.bank_account}
                onChange={handleChange}
                placeholder="Account: 0000000"
              />
            </label>

            <label>
              Transit / Institution
              <input
                name="bank_routing_number"
                value={form.bank_routing_number}
                onChange={handleChange}
                placeholder="Transit: 00000 / Institution: 000"
              />
            </label>

            <div className="form-wide settings-section-title">
              Note de bas de facture
            </div>

            <label className="form-wide">
              Footer / message client
              <textarea
                name="invoice_footer_note"
                value={form.invoice_footer_note}
                onChange={handleChange}
                rows="3"
                placeholder="Thank you for your business."
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {settings && (
        <section className="panel preview-panel">
          <div className="section-header">
            <h2>Aperçu rapide</h2>
          </div>

          <div className="company-preview-card">
            {logoUrl && <img src={logoUrl} alt="Logo entreprise" />}

            <div>
              <h3>{settings.company_name}</h3>

              {settings.company_address && (
                <p>{settings.company_address}</p>
              )}

              <p>
                {[settings.company_phone, settings.company_email]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="tax-preview">
                {settings.business_number && (
                  <span>Business No.: {settings.business_number}</span>
                )}

                {settings.gst_hst_number && (
                  <span>GST/HST: {settings.gst_hst_number}</span>
                )}

                {settings.qst_number && (
                  <span>QST: {settings.qst_number}</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
