import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getStorageRoot } from '../utils/storage.util.js';
import { getStorageProvider } from '../services/storage.service.js';

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

const COMPANY_DIR = path.resolve(getStorageRoot(), 'company');
ensureDirectoryExists(COMPANY_DIR);

const allowedBankStatementMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png'
];

const allowedLogoMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

export function sanitizeUploadBaseName(originalName) {
  const originalExtension = path.extname(originalName).toLowerCase();

  return path
    .basename(originalName, originalExtension)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 80);
}

export function buildBankStatementStoredFilename(originalName) {
  const originalExtension = path.extname(originalName).toLowerCase();
  const safeBaseName = sanitizeUploadBaseName(originalName);
  return `${Date.now()}-${safeBaseName}${originalExtension}`;
}

function getCompanyBankStatementDir(companyId) {
  const directory = path.resolve(
    getStorageRoot(),
    'private',
    'companies',
    String(companyId),
    'bank-statements'
  );

  ensureDirectoryExists(directory);
  return directory;
}

function createBankStatementStorage() {
  // Memory storage for cloud providers so files can be uploaded via storage.service.
  if (getStorageProvider() === 'supabase') {
    return multer.memoryStorage();
  }

  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        if (!req.user?.company_id) {
          cb(new Error('Aucune entreprise associée à cet utilisateur.'), null);
          return;
        }

        cb(null, getCompanyBankStatementDir(req.user.company_id));
      } catch (error) {
        cb(error, null);
      }
    },

    filename(req, file, cb) {
      cb(null, buildBankStatementStoredFilename(file.originalname));
    }
  });
}

function createCompanyLogoStorage() {
  // Always memory: logos go through savePublicFile (local disk or Supabase).
  return multer.memoryStorage();
}

const companyLogoStorage = createCompanyLogoStorage();

function bankStatementFileFilter(req, file, cb) {
  if (!allowedBankStatementMimeTypes.includes(file.mimetype)) {
    cb(
      new Error('Format non autorisé. Formats acceptés : PDF, JPG, PNG.'),
      false
    );
    return;
  }

  cb(null, true);
}

function companyLogoFileFilter(req, file, cb) {
  if (!allowedLogoMimeTypes.includes(file.mimetype)) {
    cb(
      new Error('Format non autorisé. Formats acceptés : JPG, PNG, WEBP.'),
      false
    );
    return;
  }

  cb(null, true);
}

export const uploadBankStatement = multer({
  storage: createBankStatementStorage(),
  fileFilter: bankStatementFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export const uploadCompanyLogo = multer({
  storage: companyLogoStorage,
  fileFilter: companyLogoFileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024
  }
});
