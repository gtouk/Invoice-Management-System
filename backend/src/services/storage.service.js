import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import {
  buildInvoicePrivateRelativePath,
  getStorageRoot,
  resolveStoragePath
} from '../utils/storage.util.js';

let supabaseClient = null;

export function getStorageProvider() {
  const provider = String(env.storageProvider || 'local').toLowerCase();
  return provider === 'supabase' ? 'supabase' : 'local';
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      'STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  supabaseClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}

export function normalizePrivateRelativePath(storedPath) {
  if (!storedPath) {
    return null;
  }

  let normalized = String(storedPath).trim().replace(/^\/+/, '');

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('storage/')) {
    normalized = normalized.slice('storage/'.length);
  }

  return normalized;
}

function localAbsolutePath(relativePath) {
  return path.resolve(getStorageRoot(), normalizePrivateRelativePath(relativePath));
}

export async function savePrivateFile({
  relativePath,
  buffer,
  contentType = 'application/octet-stream'
}) {
  const key = normalizePrivateRelativePath(relativePath);

  if (!key) {
    throw new Error('relativePath is required to save a private file.');
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer must be a Buffer.');
  }

  if (getStorageProvider() === 'supabase') {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .upload(key, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return { relativePath: key, provider: 'supabase' };
  }

  const absolutePath = localAbsolutePath(key);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);

  return { relativePath: key, provider: 'local', absolutePath };
}

export async function getPrivateFile({ relativePath }) {
  const key = normalizePrivateRelativePath(relativePath);

  if (!key) {
    return null;
  }

  if (getStorageProvider() === 'supabase') {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage
        .from(env.supabaseStorageBucket)
        .download(key);

      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return {
          relativePath: key,
          buffer: Buffer.from(arrayBuffer),
          contentType: data.type || guessContentType(key),
          provider: 'supabase'
        };
      }
    } catch {
      // Fall through to local legacy fallback.
    }
  }

  const absolutePath = localAbsolutePath(key);

  if (fs.existsSync(absolutePath)) {
    return {
      relativePath: key,
      buffer: fs.readFileSync(absolutePath),
      contentType: guessContentType(key),
      provider: 'local',
      absolutePath
    };
  }

  // Legacy resolve for paths that were stored as /storage/... etc.
  const legacyAbsolute = resolveStoragePath(relativePath);
  if (legacyAbsolute && fs.existsSync(legacyAbsolute)) {
    return {
      relativePath: key,
      buffer: fs.readFileSync(legacyAbsolute),
      contentType: guessContentType(key),
      provider: 'local',
      absolutePath: legacyAbsolute
    };
  }

  return null;
}

export async function privateFileExists({ relativePath }) {
  const key = normalizePrivateRelativePath(relativePath);

  if (!key) {
    return false;
  }

  if (getStorageProvider() === 'supabase') {
    try {
      const supabase = getSupabaseClient();
      const directory = path.posix.dirname(key);
      const filename = path.posix.basename(key);
      const { data, error } = await supabase.storage
        .from(env.supabaseStorageBucket)
        .list(directory === '.' ? '' : directory, {
          search: filename,
          limit: 100
        });

      if (!error && Array.isArray(data) && data.some((item) => item.name === filename)) {
        return true;
      }
    } catch {
      // Fall through to local check.
    }
  }

  const absolutePath = localAbsolutePath(key);
  if (fs.existsSync(absolutePath)) {
    return true;
  }

  const legacyAbsolute = resolveStoragePath(relativePath);
  return Boolean(legacyAbsolute && fs.existsSync(legacyAbsolute));
}

export async function deletePrivateFile({ relativePath }) {
  const key = normalizePrivateRelativePath(relativePath);

  if (!key) {
    return false;
  }

  let deleted = false;

  if (getStorageProvider() === 'supabase') {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage
        .from(env.supabaseStorageBucket)
        .remove([key]);
      if (!error) {
        deleted = true;
      }
    } catch {
      // Continue with local cleanup.
    }
  }

  const absolutePath = localAbsolutePath(key);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    deleted = true;
  }

  const legacyAbsolute = resolveStoragePath(relativePath);
  if (legacyAbsolute && fs.existsSync(legacyAbsolute) && legacyAbsolute !== absolutePath) {
    fs.unlinkSync(legacyAbsolute);
    deleted = true;
  }

  return deleted;
}

function guessContentType(relativePath) {
  const lower = String(relativePath || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function savePublicFile({
  relativePath,
  buffer,
  contentType = 'application/octet-stream'
}) {
  return savePrivateFile({ relativePath, buffer, contentType });
}

export async function getPublicFile({ relativePath }) {
  return getPrivateFile({ relativePath });
}

export async function publicFileExists({ relativePath }) {
  return privateFileExists({ relativePath });
}

export function getPublicFileUrl({ companyId, relativePath = null }) {
  if (companyId) {
    return `/api/public/companies/${companyId}/logo`;
  }

  const key = normalizePrivateRelativePath(relativePath);
  if (!key) {
    return null;
  }

  // Browser-safe local static fallback for public/* paths.
  if (key.startsWith('public/')) {
    return `/storage/${key}`;
  }

  return null;
}

/**
 * Resolve a company logo buffer (public path, API path, or legacy /storage/company/...).
 */
export async function getCompanyLogoFile({
  companyId = null,
  storedUrl = null
} = {}) {
  const candidates = [];

  if (storedUrl) {
    const raw = String(storedUrl).trim();

    if (raw.startsWith('/storage/company/') || raw.startsWith('storage/company/')) {
      const filename = path.basename(raw);
      candidates.push(`company/${filename}`);
      // Also absolute under storage root
      candidates.push(path.posix.join('company', filename));
    } else if (
      !raw.includes('/api/public/companies/') &&
      !raw.startsWith('http')
    ) {
      candidates.push(normalizePrivateRelativePath(raw));
    }
  }

  if (companyId) {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
      candidates.push(
        path.posix.join('public', 'companies', String(companyId), `logo${ext}`)
      );
    }
  }

  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);

    const file = await getPrivateFile({ relativePath: candidate });
    if (file?.buffer?.length) {
      return file;
    }
  }

  // Legacy absolute under storage/company (old uploads).
  if (storedUrl && String(storedUrl).includes('company-logo-')) {
    const filename = path.basename(String(storedUrl));
    const legacyPath = path.resolve(getStorageRoot(), 'company', filename);
    if (fs.existsSync(legacyPath)) {
      return {
        relativePath: `company/${filename}`,
        buffer: fs.readFileSync(legacyPath),
        contentType: guessContentType(filename),
        provider: 'local',
        absolutePath: legacyPath
      };
    }
  }

  return null;
}

/**
 * Resolves an invoice PDF from the configured provider, with local legacy fallback.
 */
export async function getInvoicePdfFile(invoice) {
  if (!invoice) {
    return null;
  }

  const candidates = [];

  if (invoice.pdf_url) {
    candidates.push(normalizePrivateRelativePath(invoice.pdf_url));
  }

  if (invoice.company_id && invoice.id) {
    candidates.push(
      buildInvoicePrivateRelativePath(invoice.company_id, invoice.id)
    );
  }

  if (invoice.invoice_number) {
    candidates.push(`invoices/${invoice.invoice_number}.pdf`);
  }

  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);

    const file = await getPrivateFile({ relativePath: candidate });
    if (file?.buffer?.length) {
      return file;
    }
  }

  return null;
}

export function sendFileDownload(res, { buffer, fileName, contentType }) {
  const safeName = String(fileName || 'download')
    .replace(/"/g, '')
    .replace(/[\r\n]/g, '');

  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"`
  );
  res.setHeader('Content-Length', Buffer.byteLength(buffer));
  return res.status(200).send(buffer);
}
