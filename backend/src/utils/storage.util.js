import fs from 'fs';
import path from 'path';

export function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

export function getStorageRoot() {
  return path.resolve(process.cwd(), 'storage');
}

export function buildInvoicePrivateRelativePath(companyId, invoiceId) {
  return path.posix.join(
    'private',
    'companies',
    String(companyId),
    'invoices',
    `${invoiceId}.pdf`
  );
}

export function buildBankStatementPrivateRelativePath(companyId, filename) {
  return path.posix.join(
    'private',
    'companies',
    String(companyId),
    'bank-statements',
    filename
  );
}

export function resolveStoragePath(storedPath) {
  if (!storedPath) {
    return null;
  }

  const normalized = String(storedPath).trim().replace(/^\/+/, '');

  if (!normalized) {
    return null;
  }

  // Absolute path already on disk
  if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
    return storedPath;
  }

  // New private relative paths: private/companies/...
  if (normalized.startsWith('private/')) {
    return path.resolve(getStorageRoot(), normalized);
  }

  // Legacy public URLs: /storage/... or storage/...
  if (normalized.startsWith('storage/')) {
    return path.resolve(process.cwd(), normalized);
  }

  // Legacy values like invoices/FAC.pdf
  if (normalized.startsWith('invoices/') || normalized.startsWith('bank-statements/')) {
    return path.resolve(getStorageRoot(), normalized);
  }

  // Bare filename (legacy invoice PDF)
  if (!normalized.includes('/')) {
    return path.resolve(getStorageRoot(), 'invoices', normalized);
  }

  return path.resolve(getStorageRoot(), normalized);
}

export function resolveInvoicePdfAbsolutePath(invoice) {
  if (!invoice) {
    return null;
  }

  const candidates = [];

  if (invoice.pdf_url) {
    candidates.push(resolveStoragePath(invoice.pdf_url));
  }

  if (invoice.company_id && invoice.id) {
    candidates.push(
      path.resolve(
        getStorageRoot(),
        buildInvoicePrivateRelativePath(invoice.company_id, invoice.id)
      )
    );
  }

  if (invoice.invoice_number) {
    candidates.push(
      path.resolve(getStorageRoot(), 'invoices', `${invoice.invoice_number}.pdf`)
    );
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getInvoiceDownloadApiPath(invoiceId) {
  return `/api/invoices/${invoiceId}/download`;
}

export function getBankStatementFileApiPath(statementId) {
  return `/api/bank-statements/${statementId}/file`;
}
