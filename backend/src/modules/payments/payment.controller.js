import { successResponse } from '../../utils/response.util.js';
import * as paymentService from './payment.service.js';

export async function listPayments(req, res, next) {
  try {
    const result = await paymentService.listPayments(
      req.query,
      req.user?.company_id
    );

    return res.status(200).json({
      success: true,
      message: 'Liste des paiements',
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentById(req, res, next) {
  try {
    const payment = await paymentService.getPaymentById(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail du paiement', payment);
  } catch (error) {
    next(error);
  }
}

export async function createPayment(req, res, next) {
  try {
    const payment = await paymentService.createPayment(
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Paiement enregistré avec succès',
      payment,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function listPaymentsByInvoice(req, res, next) {
  try {
    const payments = await paymentService.listPaymentsByInvoice(
      req.params.invoiceId,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Paiements de la facture',
      payments
    );
  } catch (error) {
    next(error);
  }
}

export async function listPaymentsByClient(req, res, next) {
  try {
    const payments = await paymentService.listPaymentsByClient(
      req.params.clientId,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Paiements du client',
      payments
    );
  } catch (error) {
    next(error);
  }
}