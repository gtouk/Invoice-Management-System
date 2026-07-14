import { useMemo, useState } from 'react';
import {
  calculateCommission,
  getExchangeRate
} from '../../services/commission.service';
import './Commissions.css';
import { formatMoney } from '../../utils/formatters';

const defaultForm = {
  from_currency: 'XAF',
  to_currency: 'CAD',
  sent_amount: 100000,
  commission_percent: 5,
  commission_mode: 'added',
  manual_rate: ''
};

function formatRate(value) {
  return Number(value || 0).toLocaleString('fr-CA', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  });
}

export default function Commissions() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);

  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isUsingManualRate = useMemo(() => {
    return Number(form.manual_rate || 0) > 0;
  }, [form.manual_rate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleFetchRate() {
    setIsLoadingRate(true);
    setError('');
    setMessage('');

    try {
      const response = await getExchangeRate({
        from: form.from_currency,
        to: form.to_currency
      });

      const data = response.data;

      setRateInfo(data);

      setForm((current) => ({
        ...current,
        manual_rate: Number(data.inverse_rate || 0).toFixed(4)
      }));

      setMessage('Taux du jour récupéré avec succès depuis XE.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de récupérer le taux du jour. Vous pouvez saisir le taux manuellement.'
      );
    } finally {
      setIsLoadingRate(false);
    }
  }

  async function handleCalculate(event) {
    event.preventDefault();

    setIsCalculating(true);
    setError('');
    setMessage('');

    try {
      const response = await calculateCommission({
        ...form,
        sent_amount: Number(form.sent_amount),
        commission_percent: Number(form.commission_percent),
        manual_rate: Number(form.manual_rate || 0)
      });

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible d’effectuer le calcul.'
      );
    } finally {
      setIsCalculating(false);
    }
  }

  function resetCalculator() {
    setForm(defaultForm);
    setResult(null);
    setRateInfo(null);
    setMessage('');
    setError('');
  }

  return (
    <div className="page-stack commissions-page">
      <div className="commission-hero">
        <div>
          <span>Calculateur de transfert</span>
          <h1>Commissions et conversion</h1>
          <p>
            Estimez combien une personne paie au départ, la commission appliquée
            et le montant que le bénéficiaire reçoit après conversion.
          </p>
        </div>

        <button type="button" onClick={resetCalculator}>
          Réinitialiser
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="commission-layout">
        <section className="panel commission-form-panel">
          <div className="section-header">
            <div>
              <h2>Détails du transfert</h2>
              <p>
                Exemple : une personne envoie 100 000 FCFA depuis le Cameroun
                vers le Canada.
              </p>
            </div>
          </div>

          <form className="commission-form" onSubmit={handleCalculate}>
            <label>
              Devise envoyée
              <select
                name="from_currency"
                value={form.from_currency}
                onChange={handleChange}
              >
                <option value="XAF">XAF — FCFA Afrique centrale</option>
                <option value="CAD">CAD — Dollar canadien</option>
                <option value="USD">USD — Dollar américain</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </label>

            <label>
              Devise reçue
              <select
                name="to_currency"
                value={form.to_currency}
                onChange={handleChange}
              >
                <option value="CAD">CAD — Dollar canadien</option>
                <option value="XAF">XAF — FCFA Afrique centrale</option>
                <option value="USD">USD — Dollar américain</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </label>

            <label>
              Montant envoyé
              <input
                name="sent_amount"
                type="number"
                min="0"
                step="0.01"
                value={form.sent_amount}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Commission %
              <input
                name="commission_percent"
                type="number"
                min="0"
                step="0.01"
                value={form.commission_percent}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Mode de commission
              <select
                name="commission_mode"
                value={form.commission_mode}
                onChange={handleChange}
              >
                <option value="added">
                  Ajoutée au montant envoyé
                </option>
                <option value="deducted">
                  Déduite du montant envoyé
                </option>
              </select>
            </label>

            <label>
              Taux manuel
              <input
                name="manual_rate"
                type="number"
                min="0"
                step="0.0001"
                value={form.manual_rate}
                onChange={handleChange}
                placeholder="Ex : 445 pour 1 CAD = 445 XAF"
              />
            </label>

            <div className="commission-rate-actions">
              <button
                type="button"
                className="secondary"
                onClick={handleFetchRate}
                disabled={isLoadingRate}
              >
                {isLoadingRate ? 'Récupération...' : 'Taux du jour XE'}
              </button>

              <button type="submit" disabled={isCalculating}>
                {isCalculating ? 'Calcul...' : 'Calculer'}
              </button>
            </div>
          </form>

          <div className="commission-help">
            <strong>Comment lire le taux ?</strong>
            <p>
              Si le taux est 445, cela veut dire que 1 {form.to_currency}
              vaut environ 445 {form.from_currency}. Donc 100 000 XAF / 445
              donne le montant estimé en CAD.
            </p>
          </div>
        </section>

        <section className="panel commission-result-panel">
          <div className="section-header">
            <div>
              <h2>Résultat</h2>
              <p>
                Résumé de la conversion et des frais.
              </p>
            </div>
          </div>

          {!result && (
            <div className="empty-result">
              Remplissez les informations du transfert puis cliquez sur
              “Calculer”.
            </div>
          )}

          {result && (
            <div className="result-stack">
              <div className="main-result-card">
                <span>Montant reçu estimé</span>
                <strong>
                  {formatMoney(result.received_amount, result.to_currency)}
                </strong>
                <small>{result.displayed_rate_label}</small>
              </div>

              <div className="result-grid">
                <div>
                  <span>Montant envoyé</span>
                  <strong>
                    {formatMoney(result.sent_amount, result.from_currency)}
                  </strong>
                </div>

                <div>
                  <span>Commission</span>
                  <strong>
                    {formatMoney(result.commission_amount, result.from_currency)}
                  </strong>
                </div>

                <div>
                  <span>Total payé par l’expéditeur</span>
                  <strong>
                    {formatMoney(result.total_paid_by_sender, result.from_currency)}
                  </strong>
                </div>

                <div>
                  <span>Montant converti</span>
                  <strong>
                    {formatMoney(result.convertible_amount, result.from_currency)}
                  </strong>
                </div>
              </div>

              <div className="rate-box">
                <div>
                  <span>Source du taux</span>
                  <strong>{result.provider}</strong>
                </div>

                <div>
                  <span>Taux direct</span>
                  <strong>
                    1 {result.from_currency} = {formatRate(result.rate)} {result.to_currency}
                  </strong>
                </div>

                <div>
                  <span>Taux inverse</span>
                  <strong>
                    1 {result.to_currency} = {formatRate(result.inverse_rate)} {result.from_currency}
                  </strong>
                </div>

                <div>
                  <span>Date du taux</span>
                  <strong>{result.rate_timestamp || '-'}</strong>
                </div>
              </div>
            </div>
          )}

          {rateInfo && (
            <div className="rate-info-card">
              <strong>Dernier taux XE récupéré</strong>
              <span>
                1 {rateInfo.to_currency} = {formatRate(rateInfo.inverse_rate)} {rateInfo.from_currency}
              </span>
            </div>
          )}

          {isUsingManualRate && (
            <div className="manual-rate-warning">
              Le calcul utilise actuellement le taux manuel saisi dans le formulaire.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}