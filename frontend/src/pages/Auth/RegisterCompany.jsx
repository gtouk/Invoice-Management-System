import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerCompany } from '../../services/auth.service';
import './RegisterCompany.css';

const initialForm = {
  admin: {
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: ''
  },
  company: {
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    website: '',
    business_number: '',
    gst_hst_number: '',
    qst_number: ''
  },
  onboarding: {
    industry: '',
    business_description: '',
    business_type: '',
    invoice_volume: '',
    preferred_payment_methods: [],
    wants_payment_tracking: true,
    wants_email_invoicing: true,
    wants_bank_connection: false,
    wants_bank_statement_import: false,
    default_currency: 'CAD',
    default_invoice_prefix: 'FAC',
    default_payment_terms: 'Payment due within 15 days.'
  }
};

const steps = [
  {
    title: 'Compte',
    subtitle: 'Qui va gérer cet espace entreprise ?'
  },
  {
    title: 'Entreprise',
    subtitle: 'Identité et coordonnées de votre entreprise.'
  },
  {
    title: 'Activité',
    subtitle: 'Aidez-nous à comprendre ce que vous faites.'
  },
  {
    title: 'Besoins',
    subtitle: 'Comment votre entreprise facture et encaisse.'
  },
  {
    title: 'Facturation',
    subtitle: 'Préparez vos paramètres de facture.'
  },
  {
    title: 'Confirmation',
    subtitle: 'Vérifiez les informations avant de créer l’espace.'
  }
];

const industries = [
  'Services professionnels',
  'Commerce / Vente de produits',
  'Construction / Rénovation',
  'Transport / Livraison',
  'Hôtellerie / Restauration',
  'Santé / Bien-être',
  'Éducation / Formation',
  'Technologie / Informatique',
  'Immobilier',
  'Organisation / Association',
  'Autre'
];

const paymentMethods = [
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'paypal_stripe', label: 'PayPal / Stripe' }
];

function getNestedValue(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function setNestedValue(object, path, value) {
  const keys = path.split('.');
  const nextObject = structuredClone(object);

  let current = nextObject;

  for (let index = 0; index < keys.length - 1; index += 1) {
    current = current[keys[index]];
  }

  current[keys[keys.length - 1]] = value;

  return nextObject;
}

function Field({ label, path, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label className="register-field">
      <span>
        {label}
        {required && <strong> *</strong>}
      </span>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(event) => onChange(path, event.target.value)}
        required={required}
      />
    </label>
  );
}

function TextAreaField({ label, path, value, onChange, required = false, placeholder = '' }) {
  return (
    <label className="register-field register-field-wide">
      <span>
        {label}
        {required && <strong> *</strong>}
      </span>
      <textarea
        value={value || ''}
        placeholder={placeholder}
        rows="4"
        onChange={(event) => onChange(path, event.target.value)}
        required={required}
      />
    </label>
  );
}

export default function RegisterCompany() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[step];

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);

  function updateField(path, value) {
    setForm((current) => setNestedValue(current, path, value));
  }

  function togglePaymentMethod(value) {
    setForm((current) => {
      const selected = current.onboarding.preferred_payment_methods;

      const nextSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      return {
        ...current,
        onboarding: {
          ...current.onboarding,
          preferred_payment_methods: nextSelected
        }
      };
    });
  }

  function validateCurrentStep() {
    const errors = [];

    if (step === 0) {
      if (!form.admin.full_name.trim()) errors.push('Le nom du responsable est obligatoire.');
      if (!form.admin.email.trim()) errors.push('L’email du responsable est obligatoire.');
      if (!form.admin.password || form.admin.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères.');
      }
      if (form.admin.password !== form.admin.password_confirmation) {
        errors.push('La confirmation du mot de passe ne correspond pas.');
      }
    }

    if (step === 1) {
      if (!form.company.company_name.trim()) errors.push('Le nom de l’entreprise est obligatoire.');
      if (!form.company.company_email.trim()) errors.push('L’email de l’entreprise est obligatoire.');
    }

    if (step === 2) {
      if (!form.onboarding.industry) errors.push('Le secteur d’activité est obligatoire.');
      if (!form.onboarding.business_type) errors.push('Le type d’activité est obligatoire.');
    }

    if (step === 4) {
      if (!form.onboarding.default_currency) errors.push('La devise est obligatoire.');
      if (!form.onboarding.default_invoice_prefix.trim()) {
        errors.push('Le préfixe de facture est obligatoire.');
      }
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return false;
    }

    setError('');
    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await registerCompany(form);
      navigate('/admin/dashboard');
    } catch (err) {
      const errors = err.response?.data?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.join(' '));
      } else {
        setError(err.response?.data?.message || 'Impossible de créer l’espace entreprise.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStepContent() {
    if (step === 0) {
      return (
        <div className="register-grid">
          <Field
            label="Nom complet du responsable"
            path="admin.full_name"
            value={form.admin.full_name}
            onChange={updateField}
            required
          />

          <Field
            label="Email professionnel"
            path="admin.email"
            value={form.admin.email}
            onChange={updateField}
            type="email"
            required
          />

          <Field
            label="Téléphone"
            path="admin.phone"
            value={form.admin.phone}
            onChange={updateField}
            placeholder="+1 514 ..."
          />

          <Field
            label="Mot de passe"
            path="admin.password"
            value={form.admin.password}
            onChange={updateField}
            type="password"
            required
          />

          <Field
            label="Confirmer le mot de passe"
            path="admin.password_confirmation"
            value={form.admin.password_confirmation}
            onChange={updateField}
            type="password"
            required
          />
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="register-grid">
          <Field
            label="Nom de l’entreprise"
            path="company.company_name"
            value={form.company.company_name}
            onChange={updateField}
            required
          />

          <Field
            label="Email de facturation"
            path="company.company_email"
            value={form.company.company_email}
            onChange={updateField}
            type="email"
            required
          />

          <Field
            label="Téléphone de l’entreprise"
            path="company.company_phone"
            value={form.company.company_phone}
            onChange={updateField}
          />

          <Field
            label="Site web"
            path="company.website"
            value={form.company.website}
            onChange={updateField}
            placeholder="https://..."
          />

          <TextAreaField
            label="Adresse de l’entreprise"
            path="company.company_address"
            value={form.company.company_address}
            onChange={updateField}
            placeholder="Adresse, ville, province, pays"
          />

          <Field
            label="Business Number"
            path="company.business_number"
            value={form.company.business_number}
            onChange={updateField}
          />

          <Field
            label="GST/HST Number"
            path="company.gst_hst_number"
            value={form.company.gst_hst_number}
            onChange={updateField}
          />

          <Field
            label="QST Number"
            path="company.qst_number"
            value={form.company.qst_number}
            onChange={updateField}
          />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="register-grid">
          <label className="register-field">
            <span>Secteur d’activité *</span>
            <select
              value={form.onboarding.industry}
              onChange={(event) => updateField('onboarding.industry', event.target.value)}
              required
            >
              <option value="">Choisir un secteur</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </label>

          <label className="register-field">
            <span>Votre entreprise facture principalement *</span>
            <select
              value={form.onboarding.business_type}
              onChange={(event) => updateField('onboarding.business_type', event.target.value)}
              required
            >
              <option value="">Choisir</option>
              <option value="services">Des services</option>
              <option value="produits">Des produits</option>
              <option value="produits_et_services">Les deux</option>
            </select>
          </label>

          <TextAreaField
            label="Que fait principalement votre entreprise ?"
            path="onboarding.business_description"
            value={form.onboarding.business_description}
            onChange={updateField}
            placeholder="Exemple : Nous vendons des produits cosmétiques et proposons des services de beauté."
          />
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="register-grid">
          <label className="register-field">
            <span>Combien de factures pensez-vous créer par mois ?</span>
            <select
              value={form.onboarding.invoice_volume}
              onChange={(event) => updateField('onboarding.invoice_volume', event.target.value)}
            >
              <option value="">Choisir</option>
              <option value="1_10">1 à 10</option>
              <option value="11_50">11 à 50</option>
              <option value="51_200">51 à 200</option>
              <option value="200_plus">Plus de 200</option>
            </select>
          </label>

          <div className="register-field register-field-wide">
            <span>Comment vos clients vous paient le plus souvent ?</span>

            <div className="checkbox-grid">
              {paymentMethods.map((method) => (
                <label key={method.value} className="checkbox-card">
                  <input
                    type="checkbox"
                    checked={form.onboarding.preferred_payment_methods.includes(method.value)}
                    onChange={() => togglePaymentMethod(method.value)}
                  />
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="register-field register-field-wide">
            <span>Modules qui vous intéressent</span>

            <div className="toggle-list">
              <label>
                <input
                  type="checkbox"
                  checked={form.onboarding.wants_payment_tracking}
                  onChange={(event) =>
                    updateField('onboarding.wants_payment_tracking', event.target.checked)
                  }
                />
                <span>Suivre les paiements dans la plateforme</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.onboarding.wants_email_invoicing}
                  onChange={(event) =>
                    updateField('onboarding.wants_email_invoicing', event.target.checked)
                  }
                />
                <span>Envoyer les factures par email</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.onboarding.wants_bank_connection}
                  onChange={(event) =>
                    updateField('onboarding.wants_bank_connection', event.target.checked)
                  }
                />
                <span>Connecter une banque pour synchroniser les transactions</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.onboarding.wants_bank_statement_import}
                  onChange={(event) =>
                    updateField('onboarding.wants_bank_statement_import', event.target.checked)
                  }
                />
                <span>Importer des relevés PDF/image plus tard</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="register-grid">
          <label className="register-field">
            <span>Devise par défaut *</span>
            <select
              value={form.onboarding.default_currency}
              onChange={(event) => updateField('onboarding.default_currency', event.target.value)}
              required
            >
              <option value="CAD">CAD — Dollar canadien</option>
              <option value="USD">USD — Dollar américain</option>
              <option value="EUR">EUR — Euro</option>
              <option value="CDF">CDF — Franc congolais</option>
              <option value="XAF">XAF — Franc CFA</option>
            </select>
          </label>

          <Field
            label="Préfixe de facture"
            path="onboarding.default_invoice_prefix"
            value={form.onboarding.default_invoice_prefix}
            onChange={updateField}
            required
          />

          <TextAreaField
            label="Conditions de paiement par défaut"
            path="onboarding.default_payment_terms"
            value={form.onboarding.default_payment_terms}
            onChange={updateField}
          />
        </div>
      );
    }

    return (
      <div className="confirmation-box">
        <div>
          <span>Responsable</span>
          <strong>{form.admin.full_name}</strong>
          <p>{form.admin.email}</p>
        </div>

        <div>
          <span>Entreprise</span>
          <strong>{form.company.company_name}</strong>
          <p>{form.company.company_email}</p>
          <p>{form.company.company_address || 'Adresse non renseignée'}</p>
        </div>

        <div>
          <span>Activité</span>
          <strong>{form.onboarding.industry || 'Non renseigné'}</strong>
          <p>{form.onboarding.business_description || 'Description non renseignée'}</p>
        </div>

        <div>
          <span>Facturation</span>
          <strong>
            {form.onboarding.default_invoice_prefix} · {form.onboarding.default_currency}
          </strong>
          <p>{form.onboarding.default_payment_terms}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-company-page">
      <div className="register-company-card">
        <div className="register-company-left">
          <div className="brand-block">
            <div className="brand-mark">N</div>
            <div>
              <h1>Créer un espace entreprise</h1>
              <p>
                Configurez votre compte, votre entreprise et vos préférences de facturation
                en quelques étapes.
              </p>
            </div>
          </div>

          <div className="progress-wrapper">
            <div className="progress-header">
              <span>Progression</span>
              <strong>{progress}%</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="step-list">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={`step-item ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}
                onClick={() => {
                  if (index <= step) {
                    setStep(index);
                  }
                }}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
              </button>
            ))}
          </div>

          <p className="login-hint">
            Vous avez déjà un espace ? <Link to="/login">Se connecter</Link>
          </p>
        </div>

        <form className="register-company-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <span>Étape {step + 1} sur {steps.length}</span>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.subtitle}</p>
          </div>

          {error && <div className="register-error">{error}</div>}

          {renderStepContent()}

          <div className="register-actions">
            {step > 0 && (
              <button
                type="button"
                className="button-secondary"
                onClick={previousStep}
                disabled={isSubmitting}
              >
                Retour
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
              >
                Continuer
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Création...' : 'Créer mon espace entreprise'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}