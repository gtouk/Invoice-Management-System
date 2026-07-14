import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../database/db.js';
import { env } from '../../config/env.js';
import { createAuditLog } from '../../utils/audit.util.js';

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

function normalizeRegisterPayload(payload = {}) {
  if (payload.admin || payload.company) {
    return {
      admin: payload.admin || {},
      company: payload.company || {},
      onboarding: payload.onboarding || {}
    };
  }

  return {
    admin: {
      full_name: payload.admin_full_name,
      email: payload.admin_email,
      username: payload.admin_username,
      phone: payload.admin_phone,
      password: payload.admin_password,
      password_confirmation:
        payload.admin_password_confirmation || payload.admin_confirm_password
    },
    company: {
      company_name: payload.company_name,
      company_email: payload.company_email,
      company_phone: payload.company_phone,
      company_address: payload.company_address,
      website: payload.website,
      business_number: payload.business_number,
      gst_hst_number: payload.gst_hst_number,
      qst_number: payload.qst_number
    },
    onboarding: payload.onboarding || {}
  };
}

function validateRegisterCompanyPayload(rawPayload = {}) {
  const errors = [];
  const payload = normalizeRegisterPayload(rawPayload);

  const admin = payload.admin || {};
  const company = payload.company || {};
  const onboarding = payload.onboarding || {};

  const adminFullName = normalizeText(admin.full_name);
  const adminEmail = normalizeText(admin.email)?.toLowerCase();
  const adminUsername = normalizeText(admin.username)?.toLowerCase();
  const adminPhone = normalizeText(admin.phone);
  const password = admin.password || '';
  const passwordConfirmation =
    admin.password_confirmation || admin.confirm_password || '';

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
        username: adminUsername,
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
        wants_payment_tracking: normalizeBoolean(
          onboarding.wants_payment_tracking ?? true
        ),
        wants_email_invoicing: normalizeBoolean(
          onboarding.wants_email_invoicing ?? true
        ),
        wants_bank_connection: normalizeBoolean(
          onboarding.wants_bank_connection
        ),
        wants_bank_statement_import: normalizeBoolean(
          onboarding.wants_bank_statement_import
        ),
        default_currency: normalizeText(onboarding.default_currency) || 'CAD',
        default_invoice_prefix:
          normalizeText(onboarding.default_invoice_prefix) || 'FAC',
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

async function ensureUniqueUsername(username, txQuery = query) {
  const result = await txQuery(
    `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
    `,
    [username]
  );

  if (result.rows[0]) {
    throw createHttpError(
      'Un utilisateur avec ce nom d’utilisateur existe déjà.',
      409
    );
  }
}

async function ensureUniqueRegistrationEmail(email, txQuery = query) {
  const result = await txQuery(
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

async function ensureUniqueCompanyEmail(email, txQuery = query) {
  const result = await txQuery(
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

async function generateUniqueUsername(email, txQuery = query) {
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
    const result = await txQuery(
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

  if (user.role_name !== 'super_admin') {
    if (!user.company_id) {
      throw createHttpError(
        'Aucune entreprise associée à cet utilisateur.',
        403
      );
    }

    if (!user.company_status || user.company_status !== 'active') {
      await createAuditLog({
        companyId: user.company_id || null,
        userId: user.id,
        actorRole: user.role_name,
        action: 'login_denied_company_suspended',
        entityType: 'company',
        entityId: user.company_id || null,
        metadata: {
          company_status: user.company_status || null
        }
      });

      throw createHttpError(
        'Votre entreprise est suspendue. Contactez le support.',
        403
      );
    }
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
  const passwordHash = await bcrypt.hash(admin.password, 10);

  const result = await withTransaction(async (txQuery) => {
    await ensureUniqueRegistrationEmail(admin.email, txQuery);
    await ensureUniqueCompanyEmail(company.company_email, txQuery);

    if (admin.username) {
      await ensureUniqueUsername(admin.username, txQuery);
    }

    const roleResult = await txQuery(
      `
        SELECT id, name
        FROM roles
        WHERE name IN ('company_admin', 'admin')
        ORDER BY CASE WHEN name = 'company_admin' THEN 1 ELSE 2 END
        LIMIT 1
      `
    );

    const role = roleResult.rows[0];

    if (!role) {
      throw createHttpError(
        'Aucun rôle admin disponible. Créez un rôle admin ou company_admin.',
        500
      );
    }

    const companyResult = await txQuery(
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

    const settingsResult = await txQuery(
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
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          'Thank you for your business.',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
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

    const onboardingResult = await txQuery(
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

    const username =
      admin.username ||
      (await generateUniqueUsername(admin.email, txQuery));

    const userResult = await txQuery(
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

    try {
      await txQuery(
        `
          INSERT INTO invoice_reminder_settings (
            company_id,
            enabled,
            start_after_due_days,
            frequency_days,
            max_reminders,
            send_time
          )
          VALUES ($1, true, 1, 7, NULL, '09:00')
          ON CONFLICT (company_id) DO NOTHING
        `,
        [createdCompany.id]
      );
    } catch {
      // Table may not exist on older DBs — registration should still succeed.
    }

    const createdUser = {
      ...userResult.rows[0],
      role_name: role.name,
      company_name: createdCompany.company_name
    };

    return {
      createdCompany,
      settings: settingsResult.rows[0],
      onboarding: onboardingResult.rows[0],
      createdUser
    };
  });

  await createAuditLog({
    companyId: result.createdCompany.id,
    userId: result.createdUser.id,
    actorRole: result.createdUser.role_name,
    action: 'company_registered',
    entityType: 'company',
    entityId: result.createdCompany.id,
    metadata: {
      company_email: result.createdCompany.company_email
    }
  });

  return {
    access_token: signAccessToken(result.createdUser),
    refresh_token: signRefreshToken(result.createdUser),
    user: {
      id: result.createdUser.id,
      full_name: result.createdUser.full_name,
      email: result.createdUser.email,
      username: result.createdUser.username,
      role: result.createdUser.role_name,
      company_id: result.createdUser.company_id,
      company_name: result.createdUser.company_name
    },
    company: result.createdCompany,
    company_settings: result.settings,
    onboarding: result.onboarding
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

  if (user.role !== 'super_admin') {
    if (!user.company_id) {
      throw createHttpError(
        'Aucune entreprise associée à cet utilisateur.',
        403
      );
    }

    if (!user.company_status || user.company_status !== 'active') {
      throw createHttpError(
        'Votre entreprise est suspendue. Contactez le support.',
        403
      );
    }
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