import dotenv from 'dotenv';

dotenv.config();

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

const corsOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.CORS_ORIGINS
    ? String(process.env.CORS_ORIGINS)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [])
].filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: firstDefined(
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_SECRET
  ),
  jwtRefreshSecret: firstDefined(
    process.env.JWT_REFRESH_SECRET,
    process.env.JWT_SECRET
  ),
  jwtAccessExpiresIn: firstDefined(
    process.env.JWT_ACCESS_EXPIRES_IN,
    process.env.JWT_EXPIRES_IN,
    '15m'
  ),
  jwtRefreshExpiresIn: firstDefined(
    process.env.JWT_REFRESH_EXPIRES_IN,
    '7d'
  ),
  frontendUrl: process.env.FRONTEND_URL || null,
  corsOrigins,
  storageRoot: process.env.STORAGE_ROOT || null,
  storageProvider: String(process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
  supabaseUrl: process.env.SUPABASE_URL || null,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'invoice-files',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  smtpFrom:
    process.env.SMTP_FROM ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER
};
