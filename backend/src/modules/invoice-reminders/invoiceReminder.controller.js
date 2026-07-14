import { successResponse } from '../../utils/response.util.js';
import * as reminderService from './invoiceReminder.service.js';

export async function getSettings(req, res, next) {
  try {
    const settings = await reminderService.getSettings(req.user.company_id);

    return successResponse(res, {
      message: 'Paramètres de rappel récupérés avec succès.',
      data: settings
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await reminderService.updateSettings(
      req.user.company_id,
      req.body
    );

    return successResponse(res, {
      message: 'Paramètres de rappel mis à jour avec succès.',
      data: settings
    });
  } catch (error) {
    return next(error);
  }
}

export async function sendManualReminder(req, res, next) {
  try {
    const result = await reminderService.sendManualReminder(
      req.params.id,
      req.user.company_id,
      req.user.id
    );

    return successResponse(res, {
      message: 'Rappel envoyé avec succès.',
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function getInvoiceReminderLogs(req, res, next) {
  try {
    const logs = await reminderService.getInvoiceReminderLogs(
      req.params.id,
      req.user.company_id
    );

    return successResponse(res, {
      message: 'Historique des rappels récupéré avec succès.',
      data: logs
    });
  } catch (error) {
    return next(error);
  }
}

export async function enableInvoiceReminders(req, res, next) {
  try {
    const invoice = await reminderService.enableInvoiceReminders(
      req.params.id,
      req.user.company_id
    );

    return successResponse(res, {
      message: 'Rappels activés pour cette facture.',
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
}

export async function disableInvoiceReminders(req, res, next) {
  try {
    const invoice = await reminderService.disableInvoiceReminders(
      req.params.id,
      req.user.company_id
    );

    return successResponse(res, {
      message: 'Rappels désactivés pour cette facture.',
      data: invoice
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDueInvoicesPreview(req, res, next) {
  try {
    const invoices = await reminderService.getDueInvoicesPreview(
      req.user.company_id
    );

    return successResponse(res, {
      message: 'Factures en attente de rappel récupérées avec succès.',
      data: invoices
    });
  } catch (error) {
    return next(error);
  }
}

export async function runAutomaticRemindersNow(req, res, next) {
  try {
    const result = await reminderService.processAutomaticReminders();

    return successResponse(res, {
      message: 'Traitement automatique des rappels exécuté.',
      data: result
    });
  } catch (error) {
    return next(error);
  }
}