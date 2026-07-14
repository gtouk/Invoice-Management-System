import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensureSmtpConfigured() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
    throw createHttpError(
      'Configuration SMTP manquante. Veuillez configurer SMTP_HOST, SMTP_USER et SMTP_PASSWORD.',
      500
    );
  }
}

function createTransporter() {
  ensureSmtpConfigured();

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort || 587,
    secure: Boolean(env.smtpSecure),
    auth: {
      user: env.smtpUser,
      pass: env.smtpPassword
    }
  });
}

function buildTechnicalFrom(fromName) {
  /**
   * Important :
   * Beaucoup de SMTP refusent un from différent du SMTP_USER.
   * On utilise donc SMTP_USER comme vrai expéditeur technique,
   * et l’email de l’entreprise en Reply-To.
   */
  return fromName
    ? `"${fromName}" <${env.smtpUser}>`
    : env.smtpUser;
}

export async function sendEmailWithAttachment({
  fromName,
  fromEmail,
  replyTo,
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  attachments = []
}) {
  const transporter = createTransporter();

  const technicalFrom = buildTechnicalFrom(fromName);

  return transporter.sendMail({
    from: technicalFrom,
    replyTo: replyTo || fromEmail || env.smtpUser,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text,
    html,
    attachments
  });
}

export async function sendEmail({
  fromName,
  fromEmail,
  replyTo,
  to,
  cc,
  bcc,
  subject,
  text,
  html
}) {
  const transporter = createTransporter();

  const technicalFrom = buildTechnicalFrom(fromName);

  return transporter.sendMail({
    from: technicalFrom,
    replyTo: replyTo || fromEmail || env.smtpUser,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text,
    html: html || text
  });
}