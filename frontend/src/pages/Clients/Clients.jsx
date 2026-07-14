import { useEffect, useMemo, useState } from 'react';
import {
  archiveClient,
  createClient,
  getClients,
  reactivateClient,
  updateClient
} from '../../services/client.service';
import './Clients.css';

const emptyForm = {
  client_type: 'particulier',
  membership_status: 'non_membre',
  full_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  company_name: '',
  contact_person_name: '',
  tax_number: '',
  registration_number: '',
  national_id: '',
  website: '',
  billing_email: '',
  billing_phone: '',
  billing_address: ''
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} $`;
}

function getClientName(client) {
  if (client.client_type === 'entreprise') {
    return client.company_name || client.full_name || '—';
  }
  return client.full_name || '—';
}

function getClientTypeLabel(type) {
  return type === 'entreprise' ? 'Entreprise' : 'Particulier';
}

function getMembershipLabel(status) {
  return status === 'membre' ? 'Membre' : 'Non membre';
}

function getInitials(name) {
  const parts = (name || '?').trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

function ClientCard({ client, onEdit, onArchive, onReactivate }) {
  const name = getClientName(client);
  const isMember = client.membership_status === 'membre';
  const isArchived = client.status === 'archive';

  return (
    <article className={`cl-card ${isMember ? 'cl-card-member' : 'cl-card-nonmember'}`}>
      <div className="cl-card-top">
        <div className={`cl-avatar ${isMember ? 'cl-avatar-member' : 'cl-avatar-nonmember'}`}>
          {getInitials(name)}
        </div>
        <div className="cl-card-identity">
          <strong className="cl-card-name">{name}</strong>
          <span className="cl-card-email">{client.email || client.billing_email || 'Aucun email'}</span>
        </div>
        {isArchived && <span className="cl-archived-badge">Archivé</span>}
      </div>

      <div className="cl-card-badges">
        <span className={`cl-badge cl-badge-type-${client.client_type}`}>
          {getClientTypeLabel(client.client_type)}
        </span>
        <span className={`cl-badge cl-badge-membership-${client.membership_status}`}>
          {getMembershipLabel(client.membership_status)}
        </span>
      </div>

      <div className="cl-card-details">
        <div className="cl-detail-item">
          <span>Téléphone</span>
          <strong>{client.phone || client.billing_phone || '—'}</strong>
        </div>
        <div className="cl-detail-item">
          <span>Solde dû</span>
          <strong className={Number(client.balance_due) > 0 ? 'cl-balance-due' : ''}>
            {formatMoney(client.balance_due)}
          </strong>
        </div>
      </div>

      <div className="cl-card-actions">
        <button type="button" className="cl-act-btn" onClick={() => onEdit(client)}>
          Modifier
        </button>
        {isArchived ? (
          <button type="button" className="cl-act-btn cl-act-success" onClick={() => onReactivate(client)}>
            Réactiver
          </button>
        ) : (
          <button type="button" className="cl-act-btn cl-act-danger" onClick={() => onArchive(client)}>
            Archiver
          </button>
        )}
      </div>
    </article>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    membership_status: '',
    page: 1,
    limit: 20
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const memberClients = useMemo(() => clients.filter((c) => c.membership_status === 'membre'), [clients]);
  const nonMemberClients = useMemo(() => clients.filter((c) => c.membership_status !== 'membre'), [clients]);

  const totalPages = Math.max(Math.ceil((meta.total || 0) / (meta.limit || 20)), 1);

  async function loadClients(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const response = await getClients(nextFilters);
      setClients(response.data || []);
      setMeta(response.meta || { page: 1, limit: 20, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les clients.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((curr) => ({ ...curr, [name]: value, page: 1 }));
  }

  function handleFilterSubmit(e) {
    e.preventDefault();
    loadClients({ ...filters, page: 1 });
  }

  function resetFilters() {
    const reset = { search: '', status: '', type: '', membership_status: '', page: 1, limit: 20 };
    setFilters(reset);
    loadClients(reset);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function openEditForm(client) {
    setEditingId(client.id);
    setForm({
      client_type: client.client_type || 'particulier',
      membership_status: client.membership_status || 'non_membre',
      full_name: client.full_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      company_name: client.company_name || '',
      contact_person_name: client.contact_person_name || '',
      tax_number: client.tax_number || '',
      registration_number: client.registration_number || '',
      national_id: client.national_id || '',
      website: client.website || '',
      billing_email: client.billing_email || '',
      billing_phone: client.billing_phone || '',
      billing_address: client.billing_address || ''
    });
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((curr) => ({ ...curr, [name]: value }));
  }

  function buildPayload() {
    return {
      ...form,
      company_name:
        form.client_type === 'entreprise'
          ? form.company_name || form.full_name
          : form.company_name || null
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (editingId) {
        await updateClient(editingId, buildPayload());
        setMessage('Client mis à jour avec succès.');
      } else {
        await createClient(buildPayload());
        setMessage('Client créé avec succès.');
      }
      closeForm();
      await loadClients();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) setError(apiErrors.join(' '));
      else setError(err.response?.data?.message || "Impossible d'enregistrer le client.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(client) {
    if (!window.confirm(`Archiver ${getClientName(client)} ?`)) return;
    setMessage('');
    setError('');
    try {
      await archiveClient(client.id);
      setMessage('Client archivé avec succès.');
      await loadClients();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible d'archiver ce client.");
    }
  }

  async function handleReactivate(client) {
    setMessage('');
    setError('');
    try {
      await reactivateClient(client.id);
      setMessage('Client réactivé avec succès.');
      await loadClients();
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de réactiver ce client.");
    }
  }

  function goToPage(page) {
    const next = { ...filters, page };
    setFilters(next);
    loadClients(next);
  }

  return (
    <div className="cl-page">

      {/* ── Header ── */}
      <div className="cl-header">
        <div className="cl-header-left">
          <span className="cl-eyebrow">Gestion clientèle</span>
          <h1 className="cl-title">Clients</h1>
          <p className="cl-subtitle">
            Gérez particuliers, entreprises, membres et non membres. Les membres bénéficient automatiquement des prix préférentiels en facturation.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          + Nouveau client
        </button>
      </div>

      {/* ── Toasts ── */}
      {message && <div className="toast toast-success">{message}</div>}
      {error && <div className="toast toast-error">{error}</div>}

      {/* ── Métriques ── */}
      <div className="cl-metrics-row">
        <div className="cl-metric-card">
          <span className="cl-metric-label">Total clients</span>
          <span className="cl-metric-value">{meta.total || 0}</span>
          <span className="cl-metric-sub">Dans cette sélection</span>
        </div>
        <div className="cl-metric-card cl-metric-success">
          <span className="cl-metric-label">Membres</span>
          <span className="cl-metric-value">{memberClients.length}</span>
          <span className="cl-metric-sub">Prix préférentiels</span>
        </div>
        <div className="cl-metric-card">
          <span className="cl-metric-label">Non membres</span>
          <span className="cl-metric-value">{nonMemberClients.length}</span>
          <span className="cl-metric-sub">Prix standards</span>
        </div>
        <div className="cl-metric-card cl-metric-danger">
          <span className="cl-metric-label">Soldes en attente</span>
          <span className="cl-metric-value">
            {formatMoney(clients.reduce((s, c) => s + Number(c.balance_due || 0), 0))}
          </span>
          <span className="cl-metric-sub">Total non encaissé</span>
        </div>
      </div>

      {/* ── Filtres ── */}
      <form className="cl-filter-bar" onSubmit={handleFilterSubmit}>
        <input
          className="cl-filter-input cl-filter-search"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Rechercher — nom, email, téléphone, entreprise…"
        />
        <select className="cl-filter-select" name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">Tous les types</option>
          <option value="particulier">Particulier</option>
          <option value="entreprise">Entreprise</option>
        </select>
        <select className="cl-filter-select" name="membership_status" value={filters.membership_status} onChange={handleFilterChange}>
          <option value="">Tous les statuts</option>
          <option value="membre">Membre</option>
          <option value="non_membre">Non membre</option>
        </select>
        <select className="cl-filter-select" name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Actifs</option>
          <option value="actif">Actif</option>
          <option value="archive">Archivé</option>
        </select>
        <button type="submit" className="btn-filter-submit" disabled={loading}>
          {loading ? 'Chargement…' : 'Rechercher'}
        </button>
        <button type="button" className="btn-ghost" onClick={resetFilters}>Réinitialiser</button>
      </form>

      {/* ── Formulaire client ── */}
      {isFormOpen && (
        <div className="cl-panel">
          <div className="cl-panel-header">
            <div>
              <h2 className="cl-panel-title">
                {editingId ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <p className="cl-panel-subtitle">
                Le statut membre détermine les prix appliqués automatiquement en facturation.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={closeForm}>Fermer</button>
          </div>

          <form className="cl-form" onSubmit={handleSubmit}>
            {/* Type & Membership */}
            <div className="cl-form-grid-2">
              <label className="cl-field-label">
                Type de client
                <select name="client_type" value={form.client_type} onChange={handleFormChange} className="cl-field-input">
                  <option value="particulier">Particulier</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </label>
              <label className="cl-field-label">
                Statut membre
                <select name="membership_status" value={form.membership_status} onChange={handleFormChange} className="cl-field-input">
                  <option value="non_membre">Non membre</option>
                  <option value="membre">Membre</option>
                </select>
              </label>
            </div>

            {/* Champs principaux */}
            <div className="cl-form-section-label">Informations principales</div>
            <div className="cl-form-grid-2">
              <label className="cl-field-label">
                Nom complet {form.client_type === 'particulier' && '*'}
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFormChange}
                  required={form.client_type === 'particulier'}
                  className="cl-field-input"
                />
              </label>

              {form.client_type === 'entreprise' && (
                <label className="cl-field-label">
                  Nom de l'entreprise *
                  <input name="company_name" value={form.company_name} onChange={handleFormChange} required className="cl-field-input" />
                </label>
              )}

              <label className="cl-field-label">
                Téléphone
                <input name="phone" value={form.phone} onChange={handleFormChange} className="cl-field-input" />
              </label>

              <label className="cl-field-label">
                Email
                <input name="email" type="email" value={form.email} onChange={handleFormChange} className="cl-field-input" />
              </label>

              {form.client_type === 'entreprise' && (
                <>
                  <label className="cl-field-label">
                    Personne contact
                    <input name="contact_person_name" value={form.contact_person_name} onChange={handleFormChange} className="cl-field-input" />
                  </label>
                  <label className="cl-field-label">
                    Site web
                    <input name="website" value={form.website} onChange={handleFormChange} className="cl-field-input" />
                  </label>
                  <label className="cl-field-label">
                    Numéro fiscal
                    <input name="tax_number" value={form.tax_number} onChange={handleFormChange} className="cl-field-input" />
                  </label>
                  <label className="cl-field-label">
                    Numéro d'enregistrement
                    <input name="registration_number" value={form.registration_number} onChange={handleFormChange} className="cl-field-input" />
                  </label>
                </>
              )}
            </div>

            <label className="cl-field-label">
              Adresse
              <textarea name="address" rows="2" value={form.address} onChange={handleFormChange} className="cl-field-input" />
            </label>

            {/* Facturation */}
            <div className="cl-form-section-label">Coordonnées de facturation</div>
            <div className="cl-form-grid-2">
              <label className="cl-field-label">
                Email facturation
                <input name="billing_email" type="email" value={form.billing_email} onChange={handleFormChange} className="cl-field-input" />
              </label>
              <label className="cl-field-label">
                Téléphone facturation
                <input name="billing_phone" value={form.billing_phone} onChange={handleFormChange} className="cl-field-input" />
              </label>
            </div>
            <label className="cl-field-label">
              Adresse facturation
              <textarea name="billing_address" rows="2" value={form.billing_address} onChange={handleFormChange} className="cl-field-input" />
            </label>

            <label className="cl-field-label">
              Notes internes
              <textarea name="notes" rows="3" value={form.notes} onChange={handleFormChange} placeholder="Informations complémentaires, préférences…" className="cl-field-input" />
            </label>

            <div className="cl-form-actions">
              <button type="button" className="btn-ghost" onClick={closeForm}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer le client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste ── */}
      <div className="cl-panel">
        <div className="cl-panel-header">
          <div>
            <h2 className="cl-panel-title">Liste des clients</h2>
            <p className="cl-panel-subtitle">{meta.total || 0} client(s) trouvé(s)</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => loadClients()}>Actualiser</button>
        </div>

        {clients.length === 0 ? (
          <div className="cl-empty">
            {loading ? 'Chargement des clients…' : 'Aucun client trouvé. Créez votre premier client.'}
          </div>
        ) : (
          <div className="cl-groups">

            {/* Groupe membres */}
            <div className="cl-group cl-group-members">
              <div className="cl-group-header">
                <div>
                  <span className="cl-group-eyebrow">Prix préférentiels</span>
                  <h3 className="cl-group-title">Clients membres</h3>
                  <p className="cl-group-desc">
                    Prix membres appliqués automatiquement en facturation.
                  </p>
                </div>
                <div className="cl-group-count cl-group-count-member">{memberClients.length}</div>
              </div>

              {memberClients.length === 0 ? (
                <div className="cl-empty cl-empty-mini">Aucun client membre dans cette sélection.</div>
              ) : (
                <div className="cl-grid">
                  {memberClients.map((client) => (
                    <ClientCard key={client.id} client={client} onEdit={openEditForm} onArchive={handleArchive} onReactivate={handleReactivate} />
                  ))}
                </div>
              )}
            </div>

            {/* Groupe non membres */}
            <div className="cl-group cl-group-nonmembers">
              <div className="cl-group-header">
                <div>
                  <span className="cl-group-eyebrow">Prix standards</span>
                  <h3 className="cl-group-title">Clients non membres</h3>
                  <p className="cl-group-desc">
                    Prix non membres appliqués automatiquement en facturation.
                  </p>
                </div>
                <div className="cl-group-count cl-group-count-nonmember">{nonMemberClients.length}</div>
              </div>

              {nonMemberClients.length === 0 ? (
                <div className="cl-empty cl-empty-mini">Aucun client non membre dans cette sélection.</div>
              ) : (
                <div className="cl-grid">
                  {nonMemberClients.map((client) => (
                    <ClientCard key={client.id} client={client} onEdit={openEditForm} onArchive={handleArchive} onReactivate={handleReactivate} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <div className="cl-pagination">
          <button type="button" className="btn-ghost" disabled={meta.page <= 1} onClick={() => goToPage(meta.page - 1)}>
            ← Précédent
          </button>
          <span className="cl-pagination-info">Page {meta.page || 1} sur {totalPages}</span>
          <button type="button" className="btn-ghost" disabled={meta.page >= totalPages} onClick={() => goToPage(meta.page + 1)}>
            Suivant →
          </button>
        </div>
      </div>

    </div>
  );
}