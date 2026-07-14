import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function createHttpError(message, statusCode = 400, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function ensureSmtpConfigured() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
    throw createHttpError(
      "L'email n'a pas pu être envoyé. Vérifiez la configuration SMTP.",
      502,
      {
        smtpDetail:
          'Variables SMTP manquantes (SMTP_HOST, SMTP_USER, SMTP_PASSWORD/SMTP_PASS).'
      }
    );
  }

  if (
    env.smtpHost === 'smtp.example.com' ||
    env.smtpHost === 'localhost' ||
    env.smtpHost.includes('example.')
  ) {
    throw createHttpError(
      "L'email n'a pas pu être envoyé. Vérifiez la configuration SMTP.",
      502,
      {
        smtpDetail:
          `SMTP_HOST invalide (${env.smtpHost}). Remplacez-le par votre hôte Mailtrap/SMTP réel.`
      }
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
  const fromAddress = env.smtpFrom || env.smtpUser;

  return fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
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
  attachments = [],
  from
} = {}) {
  const transporter = createTransporter();
  const technicalFrom = from || buildTechnicalFrom(fromName);

  try {
    return await transporter.sendMail({
      from: technicalFrom,
      replyTo: replyTo || fromEmail || env.smtpFrom || env.smtpUser,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      text,
      html: html || text,
      attachments
    });
  } catch (error) {
    console.error('[smtp] send failed:', error.code || '', error.message);

    throw createHttpError(
      "L'email n'a pas pu être envoyé. Vérifiez la configuration SMTP.",
      502,
      {
        smtpDetail: [error.code, error.message].filter(Boolean).join(': ')
      }
    );
  }
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
  html,
  from
} = {}) {
  return sendEmailWithAttachment({
    fromName,
    fromEmail,
    replyTo,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    from,
    attachments: []
  });
}
