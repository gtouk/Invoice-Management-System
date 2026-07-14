import fs from 'fs';
import path from 'path';
import multer from 'multer';

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

const BANK_STATEMENTS_DIR = path.resolve(
  process.cwd(),
  'storage',
  'bank-statements'
);

const COMPANY_DIR = path.resolve(
  process.cwd(),
  'storage',
  'company'
);

ensureDirectoryExists(BANK_STATEMENTS_DIR);
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

function sanitizeBaseName(originalName) {
  const originalExtension = path.extname(originalName).toLowerCase();

  return path
    .basename(originalName, originalExtension)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .slice(0, 80);
}

function getCompanyBankStatementDir(companyId) {
  const directory = path.resolve(
    process.cwd(),
    'storage',
    'private',
    'companies',
    String(companyId),
    'bank-statements'
  );

  ensureDirectoryExists(directory);
  return directory;
}

const bankStatementStorage = multer.diskStorage({
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
    const originalExtension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseName(file.originalname);
    const uniqueName = `${Date.now()}-${safeBaseName}${originalExtension}`;

    cb(null, uniqueName);
  }
});

const companyLogoStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, COMPANY_DIR);
  },

  filename(req, file, cb) {
    const originalExtension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `company-logo-${Date.now()}${originalExtension}`;

    cb(null, uniqueName);
  }
});

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
  storage: bankStatementStorage,
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