import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../../services/client.service';
import { getItems } from '../../services/item.service';
import {
  addBankTransaction,
  correctBankTransaction,
  createBankStatement,
  createClientFromBankTransaction,
  createInvoiceFromBankTransaction,
  deleteBankStatement,
  getBankStatementById,
  getBankStatements,
  importBankStatementFile,
  matchBankTransactionClient,
  processBankStatement,
  validateBankTransaction
} from '../../services/bankStatement.service';
import './BankStatements.css';

const emptyManualStatementForm = {
  file_name: '',
  file_url: '',
  source_type: 'manuel',
  notes: ''
};

const emptyUploadForm = {
  source_type: 'upload',
  notes: '',
  file: null
};

const emptyTransactionForm = {
  extracted_client_name: '',
  matched_client_id: '',
  transaction_date: '',
  transaction_type: 'depot',
  description: '',
  withdrawal_amount: '',
  deposit_amount: '',
  amount: '',
  balance_after: '',
  reference: '',
  raw_text: '',
  correction_notes: ''
};

const emptyQuickClientForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  client_type: 'particulier',
  membership_status: 'non_membre',
  notes: ''
};

const emptyInvoiceForm = {
  client_id: '',
  issue_date: '',
  due_date: '',
  notes: '',
  items: [
    {
      item_id: '',
      quantity: 1,
      unit_price: ''
    }
  ],
  adjustment_enabled: false,
  adjustment_label: 'Ajustement de rapprochement',
  adjustment_reason: 'Écart entre le total des articles et le montant reçu en banque.'
};

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('fr-FR');
}

function formatDateInput(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-FR');
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function formatStatementStatus(status) {
  const labels = {
    importe: 'Importé',
    traite: 'Traité',
    erreur: 'Erreur'
  };

  return labels[status] || status || '-';
}

function formatTransactionStatus(status) {
  const labels = {
    extrait: 'Extrait',
    corrige: 'Corrigé',
    valide: 'Validé',
    utilise: 'Utilisé',
    rejete: 'Rejeté'
  };

  return labels[status] || status || '-';
}

function formatSourceType(sourceType) {
  const labels = {
    upload: 'Upload',
    scan: 'Scan',
    manuel: 'Manuel'
  };

  return labels[sourceType] || sourceType || '-';
}

function formatTransactionType(type) {
  const labels = {
    depot: 'Dépôt',
    retrait: 'Retrait',
    frais: 'Frais'
  };

  return labels[type] || type || '-';
}

function buildFileUrl(fileUrl) {
  if (!fileUrl) return null;

  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  return `${backendBaseUrl}${fileUrl}`;
}

function inferTransactionAmountAndType(form) {
  const deposit = Number(form.deposit_amount || 0);
  const withdrawal = Number(form.withdrawal_amount || 0);

  if (deposit > 0) {
    return {
      transaction_type: 'depot',
      amount: deposit
    };
  }

  if (withdrawal > 0) {
    return {
      transaction_type: form.transaction_type === 'frais' ? 'frais' : 'retrait',
      amount: withdrawal
    };
  }

  return {
    transaction_type: form.transaction_type || 'depot',
    amount: Number(form.amount || 0)
  };
}

function getClientDisplayName(client) {
  if (!client) return '-';

  if (client.client_type === 'entreprise') {
    return client.company_name || client.full_name || '-';
  }

  return client.full_name || '-';
}

function getItemDisplayPrice(item, client) {
  if (!item) return 0;

  if (client?.membership_status === 'membre') {
    return Number(item.member_price || item.non_member_price || item.default_price || 0);
  }

  return Number(item.non_member_price || item.default_price || 0);
}

export default function BankStatements() {
  const navigate = useNavigate();

  const [statements, setStatements] = useState([]);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);

  const [selectedStatement, setSelectedStatement] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [manualStatementForm, setManualStatementForm] = useState(emptyManualStatementForm);
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);

  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);
  const [editingTransactionId, setEditingTransactionId] = useState(null);

  const [clientActionTransaction, setClientActionTransaction] = useState(null);
  const [clientActionMode, setClientActionMode] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [quickClientForm, setQuickClientForm] = useState(emptyQuickClientForm);

  const [invoiceActionTransaction, setInvoiceActionTransaction] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceErrorDetails, setInvoiceErrorDetails] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source_type: ''
  });

  const [loading, setLoading] = useState(false);
  const [savingManualStatement, setSavingManualStatement] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deletingStatement, setDeletingStatement] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingClientAction, setSavingClientAction] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState(null);

  const isEditingTransaction = useMemo(
    () => Boolean(editingTransactionId),
    [editingTransactionId]
  );

  const extractedTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      ['extrait', 'corrige'].includes(transaction.status)
    );
  }, [transactions]);

  const validatedTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === 'valide');
  }, [transactions]);

  const usedTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.status === 'utilise');
  }, [transactions]);

  const depositsTotal = useMemo(() => {
    return transactions.reduce((sum, transaction) => {
      if (transaction.transaction_type === 'depot') {
        return sum + Number(transaction.amount || 0);
      }

      return sum;
    }, 0);
  }, [transactions]);

  const withdrawalsTotal = useMemo(() => {
    return transactions.reduce((sum, transaction) => {
      if (['retrait', 'frais'].includes(transaction.transaction_type)) {
        return sum + Number(transaction.amount || 0);
      }

      return sum;
    }, 0);
  }, [transactions]);

  const invoiceSelectedClient = useMemo(() => {
    return clients.find((client) => client.id === invoiceForm.client_id) || null;
  }, [clients, invoiceForm.client_id]);

  const invoiceItemsTotal = useMemo(() => {
    return invoiceForm.items.reduce((sum, line) => {
      const selectedItem = items.find((item) => item.id === line.item_id);
      const unitPrice =
        line.unit_price !== '' && line.unit_price !== null
          ? Number(line.unit_price)
          : getItemDisplayPrice(selectedItem, invoiceSelectedClient);

      return sum + Number(line.quantity || 0) * Number(unitPrice || 0);
    }, 0);
  }, [invoiceForm.items, items, invoiceSelectedClient]);

  const invoiceTransactionAmount = Number(invoiceActionTransaction?.amount || 0);
  const invoiceDifference = roundMoney(invoiceTransactionAmount - invoiceItemsTotal);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError('');

      const [statementsResponse, clientsResponse, itemsResponse] = await Promise.all([
        getBankStatements(),
        getClients({ status: 'actif' }),
        getItems({ status: 'actif' })
      ]);

      setStatements(statementsResponse.data || []);
      setClients(clientsResponse.data || []);
      setItems(itemsResponse.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les relevés de compte.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStatements(customFilters = filters) {
    try {
      setLoading(true);
      setError('');

      const cleanFilters = {};

      if (customFilters.search) cleanFilters.search = customFilters.search;
      if (customFilters.status) cleanFilters.status = customFilters.status;
      if (customFilters.source_type) cleanFilters.source_type = customFilters.source_type;

      const response = await getBankStatements(cleanFilters);
      setStatements(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger les relevés de compte.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStatementDetail(statementId) {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      const response = await getBankStatementById(statementId);

      setSelectedStatement(response.data.statement);
      setTransactions(response.data.transactions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de charger le détail du relevé.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  function goToCreatedInvoice(invoiceId) {
    if (!invoiceId) return;

    navigate(`/invoices?invoice_id=${invoiceId}`, {
      state: {
        invoiceId
      }
    });
  }

  function handleManualStatementFormChange(event) {
    const { name, value } = event.target;

    setManualStatementForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleUploadFormChange(event) {
    const { name, value, files } = event.target;

    if (name === 'file') {
      setUploadForm((current) => ({
        ...current,
        file: files?.[0] || null
      }));
      return;
    }

    setUploadForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleTransactionFormChange(event) {
    const { name, value } = event.target;

    setTransactionForm((current) => {
      const nextForm = {
        ...current,
        [name]: value
      };

      if (name === 'matched_client_id') {
        const client = clients.find((item) => item.id === value);

        if (client && !current.extracted_client_name) {
          nextForm.extracted_client_name = getClientDisplayName(client);
        }
      }

      if (name === 'deposit_amount' && Number(value || 0) > 0) {
        nextForm.transaction_type = 'depot';
        nextForm.withdrawal_amount = '';
        nextForm.amount = value;
      }

      if (name === 'withdrawal_amount' && Number(value || 0) > 0) {
        nextForm.transaction_type =
          current.transaction_type === 'frais' ? 'frais' : 'retrait';
        nextForm.deposit_amount = '';
        nextForm.amount = value;
      }

      return nextForm;
    });
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleApplyFilters(event) {
    event.preventDefault();
    await loadStatements(filters);
  }

  async function handleResetFilters() {
    const resetFilters = {
      search: '',
      status: '',
      source_type: ''
    };

    setFilters(resetFilters);
    await loadStatements(resetFilters);
  }

  async function handleCreateManualStatement(event) {
    event.preventDefault();

    try {
      setSavingManualStatement(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      const response = await createBankStatement(manualStatementForm);

      setMessage('Relevé manuel créé avec succès.');
      setManualStatementForm(emptyManualStatementForm);

      await loadStatements();

      if (response.data?.id) {
        await loadStatementDetail(response.data.id);
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible de créer le relevé manuel.'
        );
      }
    } finally {
      setSavingManualStatement(false);
    }
  }

  async function handleUploadStatement(event) {
    event.preventDefault();

    if (!uploadForm.file) {
      setError('Veuillez choisir un fichier PDF, JPG ou PNG.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('source_type', uploadForm.source_type);
      formData.append('notes', uploadForm.notes);

      const response = await importBankStatementFile(formData);

      setMessage('Relevé importé avec succès. Vous pouvez maintenant le scanner.');
      setUploadForm(emptyUploadForm);

      await loadStatements();

      if (response.data?.id) {
        await loadStatementDetail(response.data.id);
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’importer le relevé.'
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleProcessSelectedStatement() {
    if (!selectedStatement?.id) {
      setError('Veuillez sélectionner un relevé avant de lancer le scan.');
      return;
    }

    const confirmed = window.confirm(
      'Scanner automatiquement ce relevé ? Les transactions extraites non utilisées seront remplacées.'
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      const response = await processBankStatement(selectedStatement.id);
      const count = response.data?.transactions_count || 0;

      setMessage(`Extraction automatique terminée : ${count} transaction(s) détectée(s).`);

      await Promise.all([
        loadStatements(),
        loadStatementDetail(selectedStatement.id)
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de scanner automatiquement le relevé.'
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeleteStatement(statement) {
    const confirmed = window.confirm(
      `Supprimer le relevé "${statement.file_name}" ? Cette action supprimera aussi ses transactions non utilisées.`
    );

    if (!confirmed) return;

    try {
      setDeletingStatement(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      await deleteBankStatement(statement.id);

      setMessage('Relevé supprimé avec succès.');

      if (selectedStatement?.id === statement.id) {
        setSelectedStatement(null);
        setTransactions([]);
        closeClientActionPanel();
        closeInvoicePanel();
        resetTransactionForm();
      }

      await loadStatements();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de supprimer ce relevé.'
      );
    } finally {
      setDeletingStatement(false);
    }
  }

  function resetTransactionForm() {
    setTransactionForm(emptyTransactionForm);
    setEditingTransactionId(null);
  }

  function startCorrectTransaction(transaction) {
    setEditingTransactionId(transaction.id);

    setTransactionForm({
      extracted_client_name: transaction.extracted_client_name || '',
      matched_client_id: transaction.matched_client_id || '',
      transaction_date: formatDateInput(transaction.transaction_date),
      transaction_type: transaction.transaction_type || 'depot',
      description: transaction.description || '',
      withdrawal_amount:
        Number(transaction.withdrawal_amount || 0) > 0
          ? transaction.withdrawal_amount
          : '',
      deposit_amount:
        Number(transaction.deposit_amount || 0) > 0
          ? transaction.deposit_amount
          : transaction.transaction_type === 'depot'
            ? transaction.amount
            : '',
      amount: transaction.amount || '',
      balance_after: transaction.balance_after || '',
      reference: transaction.reference || '',
      raw_text: transaction.raw_text || '',
      correction_notes: transaction.correction_notes || ''
    });

    setMessage('');
    setError('');
    setCreatedInvoice(null);
  }

  async function handleSubmitTransaction(event) {
    event.preventDefault();

    if (!selectedStatement) {
      setError('Veuillez sélectionner un relevé avant d’ajouter une transaction.');
      return;
    }

    try {
      setSavingTransaction(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      const inferred = inferTransactionAmountAndType(transactionForm);

      const payload = {
        extracted_client_name: transactionForm.extracted_client_name,
        matched_client_id: transactionForm.matched_client_id || null,
        transaction_date: transactionForm.transaction_date || null,
        transaction_type: inferred.transaction_type,
        description: transactionForm.description || transactionForm.raw_text,
        withdrawal_amount: Number(transactionForm.withdrawal_amount || 0),
        deposit_amount: Number(transactionForm.deposit_amount || 0),
        amount: inferred.amount,
        balance_after:
          transactionForm.balance_after !== ''
            ? Number(transactionForm.balance_after)
            : null,
        reference: transactionForm.reference,
        raw_text: transactionForm.raw_text,
        correction_notes: transactionForm.correction_notes
      };

      if (isEditingTransaction) {
        await correctBankTransaction(editingTransactionId, payload);
        setMessage('Transaction corrigée avec succès.');
      } else {
        await addBankTransaction(selectedStatement.id, payload);
        setMessage('Transaction ajoutée avec succès.');
      }

      resetTransactionForm();

      await Promise.all([
        loadStatements(),
        loadStatementDetail(selectedStatement.id)
      ]);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible d’enregistrer la transaction.'
        );
      }
    } finally {
      setSavingTransaction(false);
    }
  }

  function closeClientActionPanel() {
    setClientActionTransaction(null);
    setClientActionMode('');
    setSelectedClientId('');
    setQuickClientForm(emptyQuickClientForm);
  }

  function startMatchClient(transaction) {
    setClientActionTransaction(transaction);
    setClientActionMode('match');
    setSelectedClientId(transaction.matched_client_id || '');
    setQuickClientForm(emptyQuickClientForm);
    setMessage('');
    setError('');
    setCreatedInvoice(null);
  }

  function startCreateClient(transaction) {
    setClientActionTransaction(transaction);
    setClientActionMode('create');
    setSelectedClientId('');

    setQuickClientForm({
      full_name: transaction.extracted_client_name || transaction.description || '',
      phone: '',
      email: '',
      address: '',
      client_type: 'particulier',
      membership_status: 'non_membre',
      notes: `Client créé depuis le relevé bancaire ${selectedStatement?.file_name || ''}`
    });

    setMessage('');
    setError('');
    setCreatedInvoice(null);
  }

  function handleQuickClientFormChange(event) {
    const { name, value } = event.target;

    setQuickClientForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleMatchExistingClient(event) {
    event.preventDefault();

    if (!clientActionTransaction?.id) {
      setError('Aucune transaction sélectionnée.');
      return;
    }

    if (!selectedClientId) {
      setError('Veuillez sélectionner un client existant.');
      return;
    }

    try {
      setSavingClientAction(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      await matchBankTransactionClient(clientActionTransaction.id, {
        matched_client_id: selectedClientId
      });

      setMessage('Client associé à la transaction avec succès.');
      closeClientActionPanel();

      await Promise.all([
        loadInitialData(),
        selectedStatement?.id
          ? loadStatementDetail(selectedStatement.id)
          : Promise.resolve()
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible d’associer ce client à la transaction.'
      );
    } finally {
      setSavingClientAction(false);
    }
  }

  async function handleCreateClientFromTransaction(event) {
    event.preventDefault();

    if (!clientActionTransaction?.id) {
      setError('Aucune transaction sélectionnée.');
      return;
    }

    try {
      setSavingClientAction(true);
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      await createClientFromBankTransaction(
        clientActionTransaction.id,
        quickClientForm
      );

      setMessage('Client créé et associé à la transaction avec succès.');
      closeClientActionPanel();

      await Promise.all([
        loadInitialData(),
        selectedStatement?.id
          ? loadStatementDetail(selectedStatement.id)
          : Promise.resolve()
      ]);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setError(apiErrors.join(' '));
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible de créer le client depuis cette transaction.'
        );
      }
    } finally {
      setSavingClientAction(false);
    }
  }

  async function handleValidateTransaction(transaction) {
    const confirmed = window.confirm(
      'Valider cette transaction ? Elle pourra ensuite servir à créer une facture si c’est un dépôt.'
    );

    if (!confirmed) return;

    try {
      setError('');
      setMessage('');
      setCreatedInvoice(null);

      await validateBankTransaction(transaction.id);

      setMessage('Transaction validée avec succès.');

      if (selectedStatement?.id) {
        await loadStatementDetail(selectedStatement.id);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Impossible de valider cette transaction.'
      );
    }
  }

  function closeInvoicePanel() {
    setInvoiceActionTransaction(null);
    setInvoiceForm(emptyInvoiceForm);
    setInvoiceErrorDetails([]);
  }

  function startCreateInvoiceFromTransaction(transaction) {
    if (transaction.transaction_type !== 'depot') {
      setError('Seules les transactions de type dépôt peuvent créer une facture.');
      return;
    }

    if (transaction.status !== 'valide') {
      setError('La transaction doit être validée avant de créer une facture.');
      return;
    }

    setInvoiceActionTransaction(transaction);
    setInvoiceForm({
      ...emptyInvoiceForm,
      client_id: transaction.matched_client_id || '',
      issue_date: formatDateInput(transaction.transaction_date),
      notes: `Facture créée depuis transaction bancaire : ${
        transaction.description || transaction.raw_text || transaction.id
      }`
    });
    setInvoiceErrorDetails([]);
    setCreatedInvoice(null);
    setMessage('');
    setError('');
  }

  function handleInvoiceFormChange(event) {
    const { name, value, type, checked } = event.target;

    setInvoiceForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleInvoiceLineChange(index, event) {
    const { name, value } = event.target;

    setInvoiceForm((current) => {
      const nextItems = [...current.items];
      const nextLine = {
        ...nextItems[index],
        [name]: value
      };

      if (name === 'item_id') {
        const selectedItem = items.find((item) => item.id === value);
        const selectedClient =
          clients.find((client) => client.id === current.client_id) || null;

        if (selectedItem) {
          nextLine.unit_price = getItemDisplayPrice(selectedItem, selectedClient);
        }
      }

      nextItems[index] = nextLine;

      return {
        ...current,
        items: nextItems
      };
    });
  }

  function addInvoiceLine() {
    setInvoiceForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          item_id: '',
          quantity: 1,
          unit_price: ''
        }
      ]
    }));
  }

  function removeInvoiceLine(index) {
    setInvoiceForm((current) => ({
      ...current,
      items:
        current.items.length <= 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function handleCreateInvoiceFromTransaction(event) {
    event.preventDefault();

    if (!invoiceActionTransaction?.id) {
      setError('Aucune transaction sélectionnée.');
      return;
    }

    try {
      setCreatingInvoice(true);
      setError('');
      setMessage('');
      setInvoiceErrorDetails([]);
      setCreatedInvoice(null);

      const payload = {
        client_id: invoiceForm.client_id,
        issue_date: invoiceForm.issue_date || null,
        due_date: invoiceForm.due_date || null,
        notes: invoiceForm.notes,
        items: invoiceForm.items.map((line) => ({
          item_id: line.item_id || null,
          quantity: Number(line.quantity || 1),
          unit_price:
            line.unit_price !== '' && line.unit_price !== null
              ? Number(line.unit_price)
              : undefined
        })),
        adjustment: {
          enabled: Boolean(invoiceForm.adjustment_enabled),
          label: invoiceForm.adjustment_label,
          reason: invoiceForm.adjustment_reason
        }
      };

      const response = await createInvoiceFromBankTransaction(
        invoiceActionTransaction.id,
        payload
      );

      const invoice = response.data?.invoice || null;

      setCreatedInvoice(invoice);

      setMessage(
        `Facture créée avec succès depuis la transaction${
          invoice?.id ? ` : ${invoice.id}` : ''
        }.`
      );

      closeInvoicePanel();

      await Promise.all([
        loadStatements(),
        selectedStatement?.id
          ? loadStatementDetail(selectedStatement.id)
          : Promise.resolve()
      ]);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setInvoiceErrorDetails(apiErrors);
        setError(err.response?.data?.message || 'Écart de rapprochement détecté.');
      } else {
        setError(
          err.response?.data?.message ||
            'Impossible de créer la facture depuis la transaction.'
        );
      }
    } finally {
      setCreatingInvoice(false);
    }
  }

  return (
    <div className="bank-statements-page">
      <div className="bank-statements-header">
        <div>
          <h1>Relevés de compte</h1>
          <p>
            Importez un relevé, vérifiez les dépôts/retraits, puis créez une facture
            depuis une transaction validée.
          </p>
        </div>

        <button type="button" onClick={() => loadStatements()} disabled={loading}>
          Actualiser
        </button>
      </div>

      {message && (
        <div className="bank-alert bank-alert-success bank-alert-with-action">
          <div>
            <strong>Succès</strong>
            <span>{message}</span>
          </div>

          {createdInvoice?.id && (
            <button
              type="button"
              className="bank-alert-action"
              onClick={() => goToCreatedInvoice(createdInvoice.id)}
            >
              Voir la facture
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bank-alert bank-alert-error">
          <div>
            <strong>Erreur</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="bank-top-grid">
        <section className="bank-card">
          <h2>Importer un relevé bancaire</h2>

          <form className="bank-form" onSubmit={handleUploadStatement}>
            <div className="form-group">
              <label htmlFor="file">Fichier PDF / JPG / PNG *</label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleUploadFormChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="source_type">Type</label>
              <select
                id="source_type"
                name="source_type"
                value={uploadForm.source_type}
                onChange={handleUploadFormChange}
              >
                <option value="upload">PDF texte / fichier uploadé</option>
                <option value="scan">Image scannée / OCR</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="upload_notes">Notes</label>
              <textarea
                id="upload_notes"
                name="notes"
                rows="3"
                value={uploadForm.notes}
                onChange={handleUploadFormChange}
                placeholder="Ex: Relevé Desjardins avril 2026"
              />
            </div>

            <button type="submit" disabled={uploading}>
              {uploading ? 'Import...' : 'Importer le relevé'}
            </button>
          </form>
        </section>

        <section className="bank-card">
          <h2>Créer un relevé manuel</h2>

          <form className="bank-form" onSubmit={handleCreateManualStatement}>
            <div className="form-group">
              <label htmlFor="file_name">Nom du relevé *</label>
              <input
                id="file_name"
                name="file_name"
                value={manualStatementForm.file_name}
                onChange={handleManualStatementFormChange}
                placeholder="Ex: releve-manuel-mai-2026"
              />
            </div>

            <div className="form-group">
              <label htmlFor="file_url">Chemin ou URL du fichier</label>
              <input
                id="file_url"
                name="file_url"
                value={manualStatementForm.file_url}
                onChange={handleManualStatementFormChange}
                placeholder="/storage/bank-statements/releve.pdf"
              />
            </div>

            <div className="form-group">
              <label htmlFor="manual_notes">Notes</label>
              <textarea
                id="manual_notes"
                name="notes"
                rows="3"
                value={manualStatementForm.notes}
                onChange={handleManualStatementFormChange}
                placeholder="Notes internes sur le relevé"
              />
            </div>

            <button type="submit" disabled={savingManualStatement}>
              {savingManualStatement ? 'Création...' : 'Créer manuel'}
            </button>
          </form>
        </section>
      </div>

      <section className="bank-card bank-list-card">
        <div className="bank-section-header">
          <div>
            <h2>Liste des relevés</h2>
            <p>{statements.length} relevé(s)</p>
          </div>
        </div>

        <form className="bank-filters" onSubmit={handleApplyFilters}>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Rechercher par nom de fichier"
          />

          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">Tous les statuts</option>
            <option value="importe">Importé</option>
            <option value="traite">Traité</option>
            <option value="erreur">Erreur</option>
          </select>

          <select
            name="source_type"
            value={filters.source_type}
            onChange={handleFilterChange}
          >
            <option value="">Toutes les sources</option>
            <option value="manuel">Manuel</option>
            <option value="upload">Upload</option>
            <option value="scan">Scan</option>
          </select>

          <div className="bank-filter-actions">
            <button type="submit">Filtrer</button>
            <button type="button" className="secondary-button" onClick={handleResetFilters}>
              Réinitialiser
            </button>
          </div>
        </form>

        {loading ? (
          <p className="bank-empty">Chargement...</p>
        ) : statements.length === 0 ? (
          <p className="bank-empty">Aucun relevé trouvé.</p>
        ) : (
          <div className="bank-table-wrapper">
            <table className="bank-table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Source</th>
                  <th>Statut</th>
                  <th>Transactions</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {statements.map((statement) => (
                  <tr key={statement.id}>
                    <td>{statement.file_name}</td>
                    <td>{formatSourceType(statement.source_type)}</td>
                    <td>
                      <span className={`bank-status status-${statement.status}`}>
                        {formatStatementStatus(statement.status)}
                      </span>
                    </td>
                    <td>{statement.transactions_count || 0}</td>
                    <td>{formatDateTime(statement.imported_at)}</td>
                    <td>
                      <div className="bank-actions">
                        <button type="button" onClick={() => loadStatementDetail(statement.id)}>
                          Voir
                        </button>

                        {statement.file_url && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => window.open(buildFileUrl(statement.file_url), '_blank')}
                          >
                            Ouvrir fichier
                          </button>
                        )}

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteStatement(statement)}
                          disabled={deletingStatement}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStatement && (
        <section className="bank-card bank-detail-card">
          <div className="bank-detail-header">
            <div>
              <h2>Détail du relevé</h2>
              <p>{selectedStatement.file_name}</p>
            </div>

            <div className="bank-detail-actions">
              <div className="bank-detail-status">
                <span>Statut</span>
                <strong>{formatStatementStatus(selectedStatement.status)}</strong>
              </div>

              {selectedStatement.file_url && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => window.open(buildFileUrl(selectedStatement.file_url), '_blank')}
                >
                  Ouvrir fichier
                </button>
              )}

              {selectedStatement.file_url && (
                <button
                  type="button"
                  className="success-button"
                  onClick={handleProcessSelectedStatement}
                  disabled={processing}
                >
                  {processing ? 'Scan...' : 'Scanner automatiquement'}
                </button>
              )}

              <button
                type="button"
                className="danger-button"
                onClick={() => handleDeleteStatement(selectedStatement)}
                disabled={deletingStatement}
              >
                Supprimer relevé
              </button>
            </div>
          </div>

          <div className="bank-detail-grid">
            <div>
              <span>Source</span>
              <strong>{formatSourceType(selectedStatement.source_type)}</strong>
            </div>

            <div>
              <span>Importé le</span>
              <strong>{formatDateTime(selectedStatement.imported_at)}</strong>
            </div>

            <div>
              <span>Traité le</span>
              <strong>{formatDateTime(selectedStatement.processed_at)}</strong>
            </div>

            <div>
              <span>Importé par</span>
              <strong>{selectedStatement.imported_by_name || '-'}</strong>
            </div>
          </div>

          {selectedStatement.notes && (
            <p className="bank-notes">
              <strong>Notes :</strong> {selectedStatement.notes}
            </p>
          )}

          <div className="bank-summary-grid">
            <div>
              <span>Transactions extraites</span>
              <strong>{extractedTransactions.length}</strong>
            </div>

            <div>
              <span>Validées</span>
              <strong>{validatedTransactions.length}</strong>
            </div>

            <div>
              <span>Utilisées</span>
              <strong>{usedTransactions.length}</strong>
            </div>

            <div>
              <span>Total dépôts</span>
              <strong className="money-in">{formatMoney(depositsTotal)}</strong>
            </div>

            <div>
              <span>Total retraits/frais</span>
              <strong className="money-out">{formatMoney(withdrawalsTotal)}</strong>
            </div>

            <div>
              <span>Net détecté</span>
              <strong>{formatMoney(depositsTotal - withdrawalsTotal)}</strong>
            </div>
          </div>

          <div className="bank-transactions-layout">
            <section className="bank-transaction-form-card">
              <h3>
                {isEditingTransaction
                  ? 'Corriger la transaction'
                  : 'Ajouter une transaction'}
              </h3>

              <form className="bank-form" onSubmit={handleSubmitTransaction}>
                <div className="form-group">
                  <label htmlFor="matched_client_id">Client associé</label>
                  <select
                    id="matched_client_id"
                    name="matched_client_id"
                    value={transactionForm.matched_client_id}
                    onChange={handleTransactionFormChange}
                  >
                    <option value="">Aucun client associé</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {getClientDisplayName(client)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="transaction_date">Date transaction</label>
                    <input
                      id="transaction_date"
                      name="transaction_date"
                      type="date"
                      value={transactionForm.transaction_date}
                      onChange={handleTransactionFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="transaction_type">Type *</label>
                    <select
                      id="transaction_type"
                      name="transaction_type"
                      value={transactionForm.transaction_type}
                      onChange={handleTransactionFormChange}
                    >
                      <option value="depot">Dépôt / crédit</option>
                      <option value="retrait">Retrait / débit</option>
                      <option value="frais">Frais bancaire</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description bancaire</label>
                  <input
                    id="description"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionFormChange}
                    placeholder="Ex: Dépôt Mobile, Paiement Interac..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="extracted_client_name">Nom extrait</label>
                  <input
                    id="extracted_client_name"
                    name="extracted_client_name"
                    value={transactionForm.extracted_client_name}
                    onChange={handleTransactionFormChange}
                    placeholder="Nom lu sur le relevé"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="withdrawal_amount">Retrait / débit</label>
                    <input
                      id="withdrawal_amount"
                      name="withdrawal_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={transactionForm.withdrawal_amount}
                      onChange={handleTransactionFormChange}
                      placeholder="Ex: 118.63"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="deposit_amount">Dépôt / crédit</label>
                    <input
                      id="deposit_amount"
                      name="deposit_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={transactionForm.deposit_amount}
                      onChange={handleTransactionFormChange}
                      placeholder="Ex: 129.02"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="balance_after">Solde après</label>
                    <input
                      id="balance_after"
                      name="balance_after"
                      type="number"
                      step="0.01"
                      value={transactionForm.balance_after}
                      onChange={handleTransactionFormChange}
                      placeholder="Ex: 630.49"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reference">Référence</label>
                    <input
                      id="reference"
                      name="reference"
                      value={transactionForm.reference}
                      onChange={handleTransactionFormChange}
                      placeholder="Référence bancaire"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="raw_text">Texte brut extrait</label>
                  <textarea
                    id="raw_text"
                    name="raw_text"
                    rows="3"
                    value={transactionForm.raw_text}
                    onChange={handleTransactionFormChange}
                    placeholder="Texte OCR ou ligne du relevé"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="correction_notes">Notes de correction</label>
                  <textarea
                    id="correction_notes"
                    name="correction_notes"
                    rows="3"
                    value={transactionForm.correction_notes}
                    onChange={handleTransactionFormChange}
                    placeholder="Pourquoi cette correction ?"
                  />
                </div>

                <div className="bank-form-actions">
                  <button type="submit" disabled={savingTransaction}>
                    {savingTransaction
                      ? 'Enregistrement...'
                      : isEditingTransaction
                        ? 'Enregistrer correction'
                        : 'Ajouter transaction'}
                  </button>

                  {isEditingTransaction && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetTransactionForm}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="bank-transactions-card">
              <div className="bank-section-header">
                <div>
                  <h3>Transactions extraites</h3>
                  <p>{transactions.length} transaction(s)</p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <p className="bank-empty">
                  Aucune transaction enregistrée pour ce relevé.
                </p>
              ) : (
                <div className="bank-table-wrapper">
                  <table className="bank-table bank-transaction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Client lié</th>
                        <th>Retrait</th>
                        <th>Dépôt</th>
                        <th>Solde</th>
                        <th>Statut</th>
                        <th>Facture</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => {
                        const isDeposit = transaction.transaction_type === 'depot';
                        const isWithdrawal = ['retrait', 'frais'].includes(
                          transaction.transaction_type
                        );

                        return (
                          <tr key={transaction.id}>
                            <td>{formatDate(transaction.transaction_date)}</td>

                            <td>
                              <span
                                className={`transaction-type-pill ${transaction.transaction_type}`}
                              >
                                {formatTransactionType(transaction.transaction_type)}
                              </span>
                            </td>

                            <td>
                              <strong>
                                {transaction.description ||
                                  transaction.extracted_client_name ||
                                  '-'}
                              </strong>
                              {transaction.raw_text && <small>{transaction.raw_text}</small>}
                            </td>

                            <td>{transaction.matched_client_name || '-'}</td>

                            <td className="money-out">
                              {isWithdrawal
                                ? formatMoney(
                                    Number(transaction.withdrawal_amount || 0) > 0
                                      ? transaction.withdrawal_amount
                                      : transaction.amount
                                  )
                                : '-'}
                            </td>

                            <td className="money-in">
                              {isDeposit
                                ? formatMoney(
                                    Number(transaction.deposit_amount || 0) > 0
                                      ? transaction.deposit_amount
                                      : transaction.amount
                                  )
                                : '-'}
                            </td>

                            <td>
                              {transaction.balance_after
                                ? formatMoney(transaction.balance_after)
                                : '-'}
                            </td>

                            <td>
                              <span
                                className={`bank-status transaction-${transaction.status}`}
                              >
                                {formatTransactionStatus(transaction.status)}
                              </span>
                            </td>

                            <td>
                              {transaction.created_invoice_id || transaction.invoice_id ? (
                                <button
                                  type="button"
                                  className="invoice-link-button"
                                  onClick={() =>
                                    goToCreatedInvoice(
                                      transaction.created_invoice_id || transaction.invoice_id
                                    )
                                  }
                                >
                                  {transaction.created_invoice_number || 'Voir facture'}
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>

                            <td>
                              <div className="bank-actions">
                                {transaction.status !== 'utilise' && (
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => startCorrectTransaction(transaction)}
                                  >
                                    Corriger
                                  </button>
                                )}

                                {transaction.status !== 'utilise' && (
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => startMatchClient(transaction)}
                                  >
                                    Associer client
                                  </button>
                                )}

                                {transaction.status !== 'utilise' &&
                                  !transaction.matched_client_id && (
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      onClick={() => startCreateClient(transaction)}
                                    >
                                      Créer client
                                    </button>
                                  )}

                                {['extrait', 'corrige'].includes(transaction.status) && (
                                  <button
                                    type="button"
                                    className="success-button"
                                    onClick={() => handleValidateTransaction(transaction)}
                                    disabled={!transaction.matched_client_id}
                                    title={
                                      transaction.matched_client_id
                                        ? 'Valider cette transaction'
                                        : 'Associez d’abord un client à cette transaction'
                                    }
                                  >
                                    Valider
                                  </button>
                                )}

                                {transaction.status === 'valide' &&
                                  transaction.transaction_type === 'depot' && (
                                    <button
                                      type="button"
                                      className="success-button"
                                      onClick={() =>
                                        startCreateInvoiceFromTransaction(transaction)
                                      }
                                    >
                                      Créer facture
                                    </button>
                                  )}

                                {transaction.status === 'valide' &&
                                  transaction.transaction_type !== 'depot' && (
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled
                                      title="Les retraits seront traités dans le module Dépenses."
                                    >
                                      Dépense bientôt
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {clientActionTransaction && (
              <section className="bank-client-action-card">
                <div className="bank-section-header">
                  <div>
                    <h3>
                      {clientActionMode === 'match'
                        ? 'Associer à un client existant'
                        : 'Créer un nouveau client'}
                    </h3>
                    <p>
                      Transaction :{' '}
                      {clientActionTransaction.description ||
                        clientActionTransaction.extracted_client_name ||
                        '-'}{' '}
                      — {formatMoney(clientActionTransaction.amount)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeClientActionPanel}
                  >
                    Fermer
                  </button>
                </div>

                {clientActionMode === 'match' && (
                  <form className="bank-form" onSubmit={handleMatchExistingClient}>
                    <div className="form-group">
                      <label htmlFor="selectedClientId">Client existant *</label>
                      <select
                        id="selectedClientId"
                        value={selectedClientId}
                        onChange={(event) => setSelectedClientId(event.target.value)}
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" disabled={savingClientAction}>
                      {savingClientAction ? 'Association...' : 'Associer le client'}
                    </button>
                  </form>
                )}

                {clientActionMode === 'create' && (
                  <form className="bank-form" onSubmit={handleCreateClientFromTransaction}>
                    <div className="form-group">
                      <label htmlFor="quick_full_name">Nom complet / entreprise *</label>
                      <input
                        id="quick_full_name"
                        name="full_name"
                        value={quickClientForm.full_name}
                        onChange={handleQuickClientFormChange}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="quick_phone">Téléphone</label>
                        <input
                          id="quick_phone"
                          name="phone"
                          value={quickClientForm.phone}
                          onChange={handleQuickClientFormChange}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="quick_email">Email</label>
                        <input
                          id="quick_email"
                          name="email"
                          type="email"
                          value={quickClientForm.email}
                          onChange={handleQuickClientFormChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="quick_client_type">Type</label>
                        <select
                          id="quick_client_type"
                          name="client_type"
                          value={quickClientForm.client_type}
                          onChange={handleQuickClientFormChange}
                        >
                          <option value="particulier">Particulier</option>
                          <option value="entreprise">Entreprise</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="quick_membership_status">Statut membre</label>
                        <select
                          id="quick_membership_status"
                          name="membership_status"
                          value={quickClientForm.membership_status}
                          onChange={handleQuickClientFormChange}
                        >
                          <option value="non_membre">Non membre</option>
                          <option value="membre">Membre</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="quick_address">Adresse</label>
                      <input
                        id="quick_address"
                        name="address"
                        value={quickClientForm.address}
                        onChange={handleQuickClientFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="quick_notes">Notes</label>
                      <textarea
                        id="quick_notes"
                        name="notes"
                        rows="3"
                        value={quickClientForm.notes}
                        onChange={handleQuickClientFormChange}
                      />
                    </div>

                    <button type="submit" disabled={savingClientAction}>
                      {savingClientAction ? 'Création...' : 'Créer et associer le client'}
                    </button>
                  </form>
                )}
              </section>
            )}

            {invoiceActionTransaction && (
              <section className="bank-invoice-action-card">
                <div className="bank-section-header">
                  <div>
                    <h3>Créer une facture depuis la transaction</h3>
                    <p>
                      Montant bancaire :{' '}
                      <strong>{formatMoney(invoiceActionTransaction.amount)} CAD</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeInvoicePanel}
                  >
                    Fermer
                  </button>
                </div>

                {invoiceErrorDetails.length > 0 && (
                  <div className="bank-reconciliation-warning">
                    <strong>Écart détecté</strong>
                    <ul>
                      {invoiceErrorDetails.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <form className="bank-invoice-form" onSubmit={handleCreateInvoiceFromTransaction}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="invoice_client_id">Client *</label>
                      <select
                        id="invoice_client_id"
                        name="client_id"
                        value={invoiceForm.client_id}
                        onChange={handleInvoiceFormChange}
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="invoice_issue_date">Date facture</label>
                      <input
                        id="invoice_issue_date"
                        name="issue_date"
                        type="date"
                        value={invoiceForm.issue_date}
                        onChange={handleInvoiceFormChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="invoice_notes">Notes</label>
                    <textarea
                      id="invoice_notes"
                      name="notes"
                      rows="3"
                      value={invoiceForm.notes}
                      onChange={handleInvoiceFormChange}
                    />
                  </div>

                  <div className="bank-invoice-lines">
                    <div className="bank-section-header compact">
                      <div>
                        <h4>Articles / services associés</h4>
                        <p>Le total doit correspondre au montant bancaire.</p>
                      </div>

                      <button type="button" className="secondary-button" onClick={addInvoiceLine}>
                        Ajouter ligne
                      </button>
                    </div>

                    {invoiceForm.items.map((line, index) => {
                      const selectedItem = items.find((item) => item.id === line.item_id);

                      return (
                        <div className="bank-invoice-line" key={`${index}-${line.item_id}`}>
                          <div className="form-group">
                            <label>Article/service</label>
                            <select
                              name="item_id"
                              value={line.item_id}
                              onChange={(event) => handleInvoiceLineChange(index, event)}
                            >
                              <option value="">Sélectionner</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} —{' '}
                                  {formatMoney(getItemDisplayPrice(item, invoiceSelectedClient))}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Quantité</label>
                            <input
                              name="quantity"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.quantity}
                              onChange={(event) => handleInvoiceLineChange(index, event)}
                            />
                          </div>

                          <div className="form-group">
                            <label>Prix unitaire</label>
                            <input
                              name="unit_price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                line.unit_price !== '' && line.unit_price !== null
                                  ? line.unit_price
                                  : selectedItem
                                    ? getItemDisplayPrice(selectedItem, invoiceSelectedClient)
                                    : ''
                              }
                              onChange={(event) => handleInvoiceLineChange(index, event)}
                            />
                          </div>

                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => removeInvoiceLine(index)}
                            disabled={invoiceForm.items.length <= 1}
                          >
                            Retirer
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bank-reconciliation-panel">
                    <div>
                      <span>Montant transaction</span>
                      <strong>{formatMoney(invoiceTransactionAmount)} CAD</strong>
                    </div>

                    <div>
                      <span>Total articles</span>
                      <strong>{formatMoney(invoiceItemsTotal)} CAD</strong>
                    </div>

                    <div>
                      <span>Écart</span>
                      <strong className={invoiceDifference === 0 ? 'money-in' : 'money-out'}>
                        {formatMoney(invoiceDifference)} CAD
                      </strong>
                    </div>
                  </div>

                  {invoiceDifference !== 0 && (
                    <div className="bank-adjustment-box">
                      <label className="bank-checkbox">
                        <input
                          type="checkbox"
                          name="adjustment_enabled"
                          checked={invoiceForm.adjustment_enabled}
                          onChange={handleInvoiceFormChange}
                        />
                        Ajouter automatiquement une ligne d’ajustement de{' '}
                        {formatMoney(invoiceDifference)} CAD
                      </label>

                      {invoiceForm.adjustment_enabled && (
                        <>
                          <div className="form-group">
                            <label htmlFor="adjustment_label">Libellé ajustement</label>
                            <input
                              id="adjustment_label"
                              name="adjustment_label"
                              value={invoiceForm.adjustment_label}
                              onChange={handleInvoiceFormChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="adjustment_reason">Raison obligatoire</label>
                            <textarea
                              id="adjustment_reason"
                              name="adjustment_reason"
                              rows="3"
                              value={invoiceForm.adjustment_reason}
                              onChange={handleInvoiceFormChange}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="bank-form-actions">
                    <button type="submit" disabled={creatingInvoice}>
                      {creatingInvoice ? 'Création...' : 'Créer facture'}
                    </button>

                    <button type="button" className="secondary-button" onClick={closeInvoicePanel}>
                      Annuler
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </section>
      )}
    </div>
  );
}