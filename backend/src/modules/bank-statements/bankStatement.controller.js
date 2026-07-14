import { successResponse } from '../../utils/response.util.js';
import * as bankStatementService from './bankStatement.service.js';

export async function listBankStatements(req, res, next) {
  try {
    const statements = await bankStatementService.listBankStatements(
      req.query,
      req.user?.company_id
    );

    return successResponse(res, 'Liste des relevés de compte', statements);
  } catch (error) {
    next(error);
  }
}

export async function getBankStatementById(req, res, next) {
  try {
    const result = await bankStatementService.getBankStatementById(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Détail du relevé de compte', result);
  } catch (error) {
    next(error);
  }
}

export async function createBankStatement(req, res, next) {
  try {
    const statement = await bankStatementService.createBankStatement(
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Relevé de compte créé avec succès',
      statement,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function importBankStatementFile(req, res, next) {
  try {
    const statement = await bankStatementService.importBankStatementFile(
      req.file,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Relevé importé avec succès',
      statement,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function processBankStatement(req, res, next) {
  try {
    const result = await bankStatementService.processBankStatement(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Extraction automatique terminée',
      result
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteBankStatement(req, res, next) {
  try {
    const deletedStatement = await bankStatementService.deleteBankStatement(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Relevé de compte supprimé avec succès',
      deletedStatement
    );
  } catch (error) {
    next(error);
  }
}

export async function addTransactionToStatement(req, res, next) {
  try {
    const transaction = await bankStatementService.addTransactionToStatement(
      req.params.id,
      req.body,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Transaction extraite ajoutée avec succès',
      transaction,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function listTransactionsByStatement(req, res, next) {
  try {
    const transactions = await bankStatementService.listTransactionsByStatement(
      req.params.id,
      req.user?.company_id
    );

    return successResponse(res, 'Transactions du relevé', transactions);
  } catch (error) {
    next(error);
  }
}

export async function correctTransaction(req, res, next) {
  try {
    const transaction = await bankStatementService.correctTransaction(
      req.params.transactionId,
      req.body,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Transaction corrigée avec succès',
      transaction
    );
  } catch (error) {
    next(error);
  }
}

export async function matchTransactionClient(req, res, next) {
  try {
    const transaction = await bankStatementService.matchTransactionClient(
      req.params.transactionId,
      req.body,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Client associé à la transaction avec succès',
      transaction
    );
  } catch (error) {
    next(error);
  }
}

export async function createClientFromTransaction(req, res, next) {
  try {
    const result = await bankStatementService.createClientFromTransaction(
      req.params.transactionId,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Client créé et associé à la transaction avec succès',
      result,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function validateTransaction(req, res, next) {
  try {
    const transaction = await bankStatementService.validateTransaction(
      req.params.transactionId,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Transaction validée avec succès',
      transaction
    );
  } catch (error) {
    next(error);
  }
}

export async function createInvoiceFromTransaction(req, res, next) {
  try {
    const result = await bankStatementService.createInvoiceFromTransaction(
      req.params.transactionId,
      req.body,
      req.user?.id,
      req.user?.company_id
    );

    return successResponse(
      res,
      'Facture créée depuis la transaction avec succès',
      result,
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function downloadBankStatementFile(req, res, next) {
  try {
    const result = await bankStatementService.downloadBankStatementFile(
      req.params.id,
      req.user,
      {
        ipAddress:
          req.headers['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
          req.ip,
        userAgent: req.headers['user-agent'] || null
      }
    );

    return res.download(result.absolutePath, result.fileName);
  } catch (error) {
    next(error);
  }
}