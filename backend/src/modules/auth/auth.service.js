import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../database/db.js';
import { env } from '../../config/env.js';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role_name,
      company_id: user.company_id,
      company_name: user.company_name
    },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role_name,
      company_id: user.company_id,
      company_name: user.company_name
    },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

function createHttpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function normalizePaymentMethods(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function validateRegisterCompanyPayload(payload = {}) {
  const errors = [];

  const admin = payload.admin || {};
  const company = payload.company || {};
  const onboarding = payload.onboarding || {};

  const adminFullName = normalizeText(admin.full_name);
  const adminEmail = normalizeText(admin.email)?.toLowerCase();
  const adminPhone = normalizeText(admin.phone);
  const password = admin.password || '';
  const passwordConfirmation = admin.password_confirmation || admin.confirm_password || '';

  const companyName = normalizeText(company.company_name);
  const companyEmail = normalizeText(company.company_email)?.toLowerCase();
  const companyPhone = normalizeText(company.company_phone);
  const companyAddress = normalizeText(company.company_address);
  const website = normalizeText(company.website);

  if (!adminFullName) {
    errors.push('Le nom complet du responsable est obligatoire.');
  }

  if (!adminEmail) {
    errors.push('L’email du responsable est obligatoire.');
  }

  if (!password || password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  }

  if (passwordConfirmation && password !== passwordConfirmation) {
    errors.push('La confirmation du mot de passe ne correspond pas.');
  }

  if (!companyName) {
    errors.push('Le nom de l’entreprise est obligatoire.');
  }

  if (!companyEmail) {
    errors.push('L’email de l’entreprise est obligatoire.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      admin: {
        full_name: adminFullName,
        email: adminEmail,
        phone: adminPhone,
        password
      },
      company: {
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_address: companyAddress,
        website,
        business_number: normalizeText(company.business_number),
        gst_hst_number: normalizeText(company.gst_hst_number),
        qst_number: normalizeText(company.qst_number)
      },
      onboarding: {
        industry: normalizeText(onboarding.industry),
        business_description: normalizeText(onboarding.business_description),
        business_type: normalizeText(onboarding.business_type),
        invoice_volume: normalizeText(onboarding.invoice_volume),
        preferred_payment_methods: normalizePaymentMethods(
          onboarding.preferred_payment_methods
        ),
        wants_payment_tracking: normalizeBoolean(onboarding.wants_payment_tracking),
        wants_email_invoicing: normalizeBoolean(onboarding.wants_email_invoicing),
        wants_bank_connection: normalizeBoolean(onboarding.wants_bank_connection),
        wants_bank_statement_import: normalizeBoolean(
          onboarding.wants_bank_statement_import
        ),
        default_currency: normalizeText(onboarding.default_currency) || 'CAD',
        default_invoice_prefix: normalizeText(onboarding.default_invoice_prefix) || 'FAC',
        default_payment_terms:
          normalizeText(onboarding.default_payment_terms) ||
          'Payment due within 15 days.'
      }
    }
  };
}

async function getAdminRoleId() {
  const result = await query(
    `
      SELECT id, name
      FROM roles
      WHERE name IN ('company_admin', 'admin')
      ORDER BY CASE WHEN name = 'company_admin' THEN 1 ELSE 2 END
      LIMIT 1
    `
  );

  if (!result.rows[0]) {
    throw createHttpError(
      'Aucun rôle admin disponible. Créez un rôle admin ou company_admin.',
      500
    );
  }

  return result.rows[0];
}

async function ensureUniqueRegistrationEmail(email) {
  const result = await query(
    `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  if (result.rows[0]) {
    throw createHttpError(
      'Un utilisateur avec cet email existe déjà.',
      409
    );
  }
}

async function ensureUniqueCompanyEmail(email) {
  const result = await query(
    `
      SELECT id
      FROM companies
      WHERE LOWER(company_email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  if (result.rows[0]) {
    throw createHttpError(
      'Une entreprise avec cet email existe déjà.',
      409
    );
  }
}

async function generateUniqueUsername(email) {
  const [localPart, domainPart = 'company'] = email.split('@');

  const domainSlug = domainPart
    .split('.')[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  const baseUsername = `${localPart}-${domainSlug}`
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase()
    .slice(0, 40);

  let username = baseUsername;
  let counter = 1;

  while (true) {
    const result = await query(
      `
        SELECT id
        FROM users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
      `,
      [username]
    );

    if (!result.rows[0]) {
      return username;
    }

    counter += 1;
    username = `${baseUsername}-${counter}`;
  }
}

export async function login(identifier, password) {
  if (!identifier || !password) {
    throw createHttpError('Identifiant et mot de passe obligatoires', 422);
  }

  const result = await query(
    `
      SELECT
        users.id,
        users.full_name,
        users.email,
        users.username,
        users.password_hash,
        users.status,
        users.company_id,

        roles.name AS role_name,

        companies.company_name,
        companies.status AS company_status
      FROM users
      JOIN roles ON roles.id = users.role_id
      LEFT JOIN companies ON companies.id = users.company_id
      WHERE LOWER(users.email) = LOWER($1)
         OR LOWER(users.username) = LOWER($1)
      LIMIT 1
    `,
    [identifier]
  );

  const user = result.rows[0];

  if (!user) {
    throw createHttpError('Identifiant ou mot de passe incorrect', 401);
  }

  if (user.status !== 'actif') {
    throw createHttpError('Compte desactive', 403);
  }

  if (user.company_status && user.company_status !== 'active') {
    throw createHttpError('Cette entreprise est suspendue ou inactive.', 403);
  }

  const passwordIsValid = await bcrypt.compare(password, user.password_hash);

  if (!passwordIsValid) {
    throw createHttpError('Identifiant ou mot de passe incorrect', 401);
  }

  await query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  return {
    access_token: signAccessToken(user),
    refresh_token: signRefreshToken(user),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      role: user.role_name,
      company_id: user.company_id,
      company_name: user.company_name
    }
  };
}

export async function registerCompany(payload) {
  const validation = validateRegisterCompanyPayload(payload);

  if (!validation.isValid) {
    throw createHttpError('Données invalides.', 422, validation.errors);
  }

  const { admin, company, onboarding } = validation.data;

  await ensureUniqueRegistrationEmail(admin.email);
  await ensureUniqueCompanyEmail(company.company_email);

  const role = await getAdminRoleId();
  const passwordHash = await bcrypt.hash(admin.password, 10);

  const companyResult = await query(
    `
      INSERT INTO companies (
        company_name,
        company_email,
        company_phone,
        company_address,
        website,
        business_number,
        gst_hst_number,
        qst_number,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP)
      RETURNING
        id,
        company_name,
        company_email,
        company_phone,
        company_address,
        website,
        company_logo_url,
        business_number,
        gst_hst_number,
        qst_number,
        status,
        created_at,
        updated_at
    `,
    [
      company.company_name,
      company.company_email,
      company.company_phone,
      company.company_address,
      company.website,
      company.business_number,
      company.gst_hst_number,
      company.qst_number
    ]
  );

  const createdCompany = companyResult.rows[0];

  const settingsResult = await query(
    `
      INSERT INTO company_settings (
        company_id,
        company_name,
        company_phone,
        company_email,
        company_address,
        business_number,
        gst_hst_number,
        qst_number,
        invoice_footer_note,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Thank you for your business.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING
        id,
        company_id,
        company_name,
        company_logo_url,
        company_phone,
        company_email,
        company_address,
        business_number,
        gst_hst_number,
        qst_number,
        invoice_footer_note,
        bank_name,
        bank_account_name,
        bank_account,
        bank_routing_number,
        created_at,
        updated_at
    `,
    [
      createdCompany.id,
      company.company_name,
      company.company_phone,
      company.company_email,
      company.company_address,
      company.business_number,
      company.gst_hst_number,
      company.qst_number
    ]
  );

  const onboardingResult = await query(
    `
      INSERT INTO company_onboarding_profiles (
        company_id,
        industry,
        business_description,
        business_type,
        invoice_volume,
        preferred_payment_methods,
        wants_payment_tracking,
        wants_email_invoicing,
        wants_bank_connection,
        wants_bank_statement_import,
        default_currency,
        default_invoice_prefix,
        default_payment_terms,
        onboarding_completed,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `,
    [
      createdCompany.id,
      onboarding.industry,
      onboarding.business_description,
      onboarding.business_type,
      onboarding.invoice_volume,
      onboarding.preferred_payment_methods,
      onboarding.wants_payment_tracking,
      onboarding.wants_email_invoicing,
      onboarding.wants_bank_connection,
      onboarding.wants_bank_statement_import,
      onboarding.default_currency,
      onboarding.default_invoice_prefix,
      onboarding.default_payment_terms
    ]
  );

  const username = await generateUniqueUsername(admin.email);

  const userResult = await query(
    `
      INSERT INTO users (
        company_id,
        full_name,
        email,
        username,
        password_hash,
        role_id,
        status,
        phone,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'actif', $7, CURRENT_TIMESTAMP)
      RETURNING
        id,
        company_id,
        full_name,
        email,
        username,
        status,
        created_at
    `,
    [
      createdCompany.id,
      admin.full_name,
      admin.email,
      username,
      passwordHash,
      role.id,
      admin.phone
    ]
  );

  const createdUser = {
    ...userResult.rows[0],
    role_name: role.name,
    company_name: createdCompany.company_name
  };

  return {
    access_token: signAccessToken(createdUser),
    refresh_token: signRefreshToken(createdUser),
    user: {
      id: createdUser.id,
      full_name: createdUser.full_name,
      email: createdUser.email,
      username: createdUser.username,
      role: createdUser.role_name,
      company_id: createdUser.company_id,
      company_name: createdUser.company_name
    },
    company: createdCompany,
    company_settings: settingsResult.rows[0],
    onboarding: onboardingResult.rows[0]
  };
}

export async function getCurrentUser(userId) {
  const result = await query(
    `
      SELECT
        users.id,
        users.full_name,
        users.email,
        users.username,
        users.status,
        users.company_id,

        roles.name AS role,

        companies.company_name,
        companies.status AS company_status
      FROM users
      JOIN roles ON roles.id = users.role_id
      LEFT JOIN companies ON companies.id = users.company_id
      WHERE users.id = $1
      LIMIT 1
    `,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    throw createHttpError('Utilisateur introuvable', 404);
  }

  if (user.company_status && user.company_status !== 'active') {
    throw createHttpError('Cette entreprise est suspendue ou inactive.', 403);
  }

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    username: user.username,
    status: user.status,
    role: user.role,
    company_id: user.company_id,
    company_name: user.company_name
  };
}