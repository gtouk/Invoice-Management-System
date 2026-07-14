import { useEffect, useState } from 'react';
import {
  createItem,
  disableItem,
  getItems,
  reactivateItem,
  updateItem
} from '../../services/item.service';
import './Items.css';

const emptyForm = {
  name: '',
  description: '',
  item_type: 'service',
  non_member_price: '',
  member_price: ''
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} CAD`;
}

function getItemTypeLabel(type) {
  return type === 'article' ? 'Article' : 'Service';
}

function getStatusLabel(status) {
  return status === 'desactive' ? 'Désactivé' : 'Actif';
}

export default function Items() {
  const [items, setItems] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    item_type: '',
    status: ''
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadItems(nextFilters = filters) {
    setLoading(true);
    setError('');

    try {
      const response = await getItems(nextFilters);
      setItems(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les articles et services.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    loadItems(filters);
  }

  function resetFilters() {
    const reset = {
      search: '',
      item_type: '',
      status: ''
    };

    setFilters(reset);
    loadItems(reset);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage('');
    setError('');
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      item_type: item.item_type || 'service',
      non_member_price: item.non_member_price || item.default_price || '',
      member_price: item.member_price || item.non_member_price || item.default_price || ''
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

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function buildPayload() {
    const nonMemberPrice = Number(form.non_member_price || 0);
    const memberPrice =
      form.member_price === '' || form.member_price === null
        ? nonMemberPrice
        : Number(form.member_price || 0);

    return {
      name: form.name,
      description: form.description || null,
      item_type: form.item_type,
      default_price: nonMemberPrice,
      non_member_price: nonMemberPrice,
      member_price: memberPrice
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (editingId) {
        await updateItem(editingId, buildPayload());
        setMessage('Article ou service mis à jour avec succès.');
      } else {
        await createItem(buildPayload());
        setMessage('Article ou service créé avec succès.');
      }

      closeForm();
      await loadItems();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’enregistrer l’article ou service.'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(item) {
    if (!window.confirm(`Désactiver "${item.name}" ?`)) return;

    setMessage('');
    setError('');

    try {
      await disableItem(item.id);
      setMessage('Article ou service désactivé avec succès.');
      await loadItems();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de désactiver cet article ou service.'
      );
    }
  }

  async function handleReactivate(item) {
    setMessage('');
    setError('');

    try {
      await reactivateItem(item.id);
      setMessage('Article ou service réactivé avec succès.');
      await loadItems();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de réactiver cet article ou service.'
      );
    }
  }

  const activeItems = items.filter((item) => item.status === 'actif');
  const disabledItems = items.filter((item) => item.status === 'desactive');

  return (
    <div className="page-stack items-page">
      <div className="items-hero">
        <div>
          <span>Catalogue</span>
          <h1>Articles & Services</h1>
          <p>
            Gérez votre catalogue avec deux prix : un prix standard pour les clients
            non membres et un prix préférentiel pour les membres.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nouvel article/service
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="items-summary-grid">
        <div className="items-summary-card">
          <span>Total catalogue</span>
          <strong>{items.length}</strong>
          <small>Articles et services</small>
        </div>

        <div className="items-summary-card green">
          <span>Actifs</span>
          <strong>{activeItems.length}</strong>
          <small>Disponibles pour facturation</small>
        </div>

        <div className="items-summary-card red">
          <span>Désactivés</span>
          <strong>{disabledItems.length}</strong>
          <small>Non proposés actuellement</small>
        </div>
      </section>

      <section className="panel items-filter-panel">
        <form className="items-filters" onSubmit={handleFilterSubmit}>
          <label>
            Recherche
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Nom ou description..."
            />
          </label>

          <label>
            Type
            <select
              name="item_type"
              value={filters.item_type}
              onChange={handleFilterChange}
            >
              <option value="">Tous</option>
              <option value="service">Service</option>
              <option value="article">Article</option>
            </select>
          </label>

          <label>
            Statut
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">Actifs</option>
              <option value="actif">Actif</option>
              <option value="desactive">Désactivé</option>
            </select>
          </label>

          <div className="items-filter-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Chargement...' : 'Rechercher'}
            </button>

            <button type="button" className="secondary" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      {isFormOpen && (
        <section className="panel item-form-panel">
          <div className="section-header">
            <div>
              <h2>{editingId ? 'Modifier article/service' : 'Créer article/service'}</h2>
              <p>
                Le prix non membre est le prix standard. Le prix membre sera utilisé
                automatiquement pour les clients membres.
              </p>
            </div>

            <button type="button" className="secondary" onClick={closeForm}>
              Fermer
            </button>
          </div>

          <form className="item-form" onSubmit={handleSubmit}>
            <label>
              Nom *
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Ex : Consultation, Produit cosmétique..."
                required
              />
            </label>

            <label>
              Type *
              <select
                name="item_type"
                value={form.item_type}
                onChange={handleFormChange}
              >
                <option value="service">Service</option>
                <option value="article">Article</option>
              </select>
            </label>

            <label>
              Prix non membre / standard *
              <input
                name="non_member_price"
                type="number"
                min="0"
                step="0.01"
                value={form.non_member_price}
                onChange={handleFormChange}
                placeholder="Ex : 100"
                required
              />
            </label>

            <label>
              Prix membre *
              <input
                name="member_price"
                type="number"
                min="0"
                step="0.01"
                value={form.member_price}
                onChange={handleFormChange}
                placeholder="Ex : 75"
                required
              />
            </label>

            <label className="form-wide">
              Description
              <textarea
                name="description"
                rows="3"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Description visible ou réutilisée sur la facture..."
              />
            </label>

            <div className="price-preview-card standard">
              <span>Prix standard</span>
              <strong>{formatMoney(form.non_member_price)}</strong>
              <small>Utilisé pour les clients non membres</small>
            </div>

            <div className="price-preview-card member">
              <span>Prix membre</span>
              <strong>{formatMoney(form.member_price)}</strong>
              <small>Utilisé pour les clients membres</small>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={closeForm}>
                Annuler
              </button>

              <button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel items-list-panel">
        <div className="section-header">
          <div>
            <h2>Catalogue</h2>
            <p>{items.length} article(s) ou service(s)</p>
          </div>

          <button type="button" className="secondary" onClick={() => loadItems()}>
            Actualiser
          </button>
        </div>

        {items.length === 0 && (
          <div className="items-empty">
            {loading ? 'Chargement du catalogue...' : 'Aucun article ou service trouvé.'}
          </div>
        )}

        {items.length > 0 && (
          <div className="items-grid">
            {items.map((item) => (
              <article className={`item-card ${item.status}`} key={item.id}>
                <div className="item-card-header">
                  <div className="item-icon">
                    {item.item_type === 'article' ? 'A' : 'S'}
                  </div>

                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description || 'Aucune description'}</p>
                  </div>
                </div>

                <div className="item-badges">
                  <span className={`item-type-badge ${item.item_type}`}>
                    {getItemTypeLabel(item.item_type)}
                  </span>

                  <span className={`item-status-badge ${item.status}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div className="item-price-grid">
                  <div>
                    <span>Non membre</span>
                    <strong>{formatMoney(item.non_member_price || item.default_price)}</strong>
                  </div>

                  <div>
                    <span>Membre</span>
                    <strong>{formatMoney(item.member_price || item.default_price)}</strong>
                  </div>
                </div>

                <div className="item-card-actions">
                  <button type="button" onClick={() => openEditForm(item)}>
                    Modifier
                  </button>

                  {item.status === 'desactive' ? (
                    <button
                      type="button"
                      className="success"
                      onClick={() => handleReactivate(item)}
                    >
                      Réactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDisable(item)}
                    >
                      Désactiver
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}