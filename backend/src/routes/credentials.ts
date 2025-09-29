import { Router } from 'express';
import { CredentialModel, CredentialStatus } from '../models/Credential.js';
import { UserModel } from '../models/User.js';
import { validateRequest, credentialSchemas, paginationSchema } from '../utils/validation.js';
import { authenticateToken, requireWallet } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { CryptoUtils } from '../utils/crypto.js';
import { createLogger } from '../utils/logger.js';
import { calculatePagination, createPaginatedResponse } from '../models/index.js';

const logger = createLogger('credentials');
export const credentialsRouter = Router();

// Create a new credential
credentialsRouter.post(
  '/',
  authenticateToken,
  validateRequest({ body: credentialSchemas.create }),
  asyncHandler(async (req, res) => {
    const { name, description, credentialData, aizkProof } = req.body;
    const userId = req.user!.id;

    logger.info('Creating new credential', { userId, name });

    // Generate credential hash
    const credentialHash = CryptoUtils.generateCredentialHash(credentialData);

    // Create credential
    const credential = await CredentialModel.create({
      userId,
      name,
      description,
      credentialHash,
      credentialData,
      aizkProof,
    });

    res.status(201).json({
      success: true,
      data: {
        credential: {
          id: credential.id,
          name: credential.name,
          description: credential.description,
          credentialHash: credential.credentialHash,
          status: credential.status,
          createdAt: credential.createdAt,
        },
      },
    });
  })
);

// Get user's credentials
credentialsRouter.get(
  '/',
  authenticateToken,
  validateRequest({ query: credentialSchemas.list }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { page, limit, status } = req.query as any;
    const { limit: actualLimit, offset } = calculatePagination(page, limit);

    logger.info('Fetching user credentials', { userId, page, limit, status });

    const filters = { userId, status };
    const credentials = await CredentialModel.list(filters, actualLimit, offset);

    // Get total count for pagination
    const totalCount = await CredentialModel.list(filters, 1000, 0);

    const response = createPaginatedResponse(
      credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        description: cred.description,
        credentialHash: cred.credentialHash,
        status: cred.status,
        tokenAddress: cred.tokenAddress,
        tokenSymbol: cred.tokenSymbol,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
        validatedAt: cred.validatedAt,
        expiresAt: cred.expiresAt,
      })),
      totalCount.length,
      page || 1,
      actualLimit
    );

    res.json({
      success: true,
      data: response,
    });
  })
);

// Get credential by ID
credentialsRouter.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Check if user owns this credential
    if (credential.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: {
        credential: {
          id: credential.id,
          userId: credential.userId,
          name: credential.name,
          description: credential.description,
          credentialHash: credential.credentialHash,
          credentialData: credential.credentialData,
          aizkProof: credential.aizkProof,
          status: credential.status,
          tokenAddress: credential.tokenAddress,
          tokenSymbol: credential.tokenSymbol,
          validationResult: credential.validationResult,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
          validatedAt: credential.validatedAt,
          expiresAt: credential.expiresAt,
        },
      },
    });
  })
);

// Validate a credential (admin or automated process)
credentialsRouter.post(
  '/:id/validate',
  authenticateToken,
  requireWallet,
  validateRequest({ body: credentialSchemas.validate }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { credentialHash, airProof } = req.body;

    logger.info('Validating credential', { credentialId: id });

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Verify credential hash matches
    if (credential.credentialHash !== credentialHash) {
      throw new AppError('Credential hash mismatch', 400);
    }

    // For now, we'll mark it as validated
    // TODO: Integrate with actual AIR validation service
    const validationResult = {
      isValid: true,
      airProof,
      validatedAt: new Date(),
      validator: req.user!.walletAddress,
    };

    const updatedCredential = await CredentialModel.update(id, {
      status: CredentialStatus.VALIDATED,
      validationResult,
      validatedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        credential: {
          id: updatedCredential!.id,
          status: updatedCredential!.status,
          validationResult: updatedCredential!.validationResult,
          validatedAt: updatedCredential!.validatedAt,
        },
      },
    });
  })
);

// Reject a credential
credentialsRouter.post(
  '/:id/reject',
  authenticateToken,
  requireWallet,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    logger.info('Rejecting credential', { credentialId: id, reason });

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    const validationResult = {
      isValid: false,
      reason: reason || 'Credential validation failed',
      rejectedAt: new Date(),
      validator: req.user!.walletAddress,
    };

    const updatedCredential = await CredentialModel.update(id, {
      status: CredentialStatus.REJECTED,
      validationResult,
    });

    res.json({
      success: true,
      data: {
        credential: {
          id: updatedCredential!.id,
          status: updatedCredential!.status,
          validationResult: updatedCredential!.validationResult,
        },
      },
    });
  })
);

// Associate token address with credential
credentialsRouter.post(
  '/:id/token',
  authenticateToken,
  requireWallet,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tokenAddress, tokenSymbol } = req.body;
    const userId = req.user!.id;

    logger.info('Associating token with credential', { credentialId: id, tokenAddress });

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Check if user owns this credential
    if (credential.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Ensure credential is validated
    if (credential.status !== CredentialStatus.VALIDATED) {
      throw new AppError('Credential must be validated before token association', 400);
    }

    const updatedCredential = await CredentialModel.update(id, {
      tokenAddress,
      tokenSymbol,
    });

    res.json({
      success: true,
      data: {
        credential: {
          id: updatedCredential!.id,
          tokenAddress: updatedCredential!.tokenAddress,
          tokenSymbol: updatedCredential!.tokenSymbol,
          updatedAt: updatedCredential!.updatedAt,
        },
      },
    });
  })
);

// Get all credentials (public endpoint with optional filtering)
credentialsRouter.get(
  '/public/list',
  validateRequest({ query: paginationSchema }),
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy, sortOrder } = req.query as any;
    const { limit: actualLimit, offset } = calculatePagination(page, limit);

    // Only show validated credentials publicly
    const filters = { status: CredentialStatus.VALIDATED };
    const credentials = await CredentialModel.list(filters, actualLimit, offset);

    // Get total count
    const totalCount = await CredentialModel.list(filters, 1000, 0);

    const response = createPaginatedResponse(
      credentials.map(cred => ({
        id: cred.id,
        name: cred.name,
        description: cred.description,
        credentialHash: cred.credentialHash,
        status: cred.status,
        tokenAddress: cred.tokenAddress,
        tokenSymbol: cred.tokenSymbol,
        createdAt: cred.createdAt,
        validatedAt: cred.validatedAt,
      })),
      totalCount.length,
      page || 1,
      actualLimit
    );

    res.json({
      success: true,
      data: response,
    });
  })
);

// Get credential statistics
credentialsRouter.get(
  '/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const statusCounts = await CredentialModel.getStatusCounts();

    res.json({
      success: true,
      data: {
        statusCounts,
        total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      },
    });
  })
);

// Update credential expiration
credentialsRouter.patch(
  '/:id/expiration',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expiresAt } = req.body;
    const userId = req.user!.id;

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Check if user owns this credential
    if (credential.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    const updatedCredential = await CredentialModel.update(id, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.json({
      success: true,
      data: {
        credential: {
          id: updatedCredential!.id,
          expiresAt: updatedCredential!.expiresAt,
          updatedAt: updatedCredential!.updatedAt,
        },
      },
    });
  })
);

// Delete credential
credentialsRouter.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const credential = await CredentialModel.findById(id);
    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    // Check if user owns this credential
    if (credential.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Don't allow deletion of validated credentials with tokens
    if (credential.status === CredentialStatus.VALIDATED && credential.tokenAddress) {
      throw new AppError('Cannot delete credential with associated token', 400);
    }

    const deleted = await CredentialModel.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete credential', 500);
    }

    res.json({
      success: true,
      data: {
        message: 'Credential deleted successfully',
      },
    });
  })
);