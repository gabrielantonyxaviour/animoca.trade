import { Router } from 'express';
import { UserModel } from '../models/User.js';
import { CryptoUtils } from '../utils/crypto.js';
import { validateRequest, authSchemas } from '../utils/validation.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticateToken, loginLimiter, registrationLimiter } from '../middleware/auth.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');
export const authRouter = Router();

// Register with email and password
authRouter.post(
  '/register',
  registrationLimiter,
  validateRequest({ body: authSchemas.register }),
  asyncHandler(async (req, res) => {
    const { email, password, walletAddress } = req.body;

    logger.info('User registration attempt', { email, hasWallet: !!walletAddress });

    const user = await UserModel.create({
      email,
      password,
      walletAddress,
    });

    const token = CryptoUtils.generateJwtToken({
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          reputationScore: user.reputationScore,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  })
);

// Login with email and password
authRouter.post(
  '/login',
  loginLimiter,
  validateRequest({ body: authSchemas.login }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('User login attempt', { email });

    const user = await UserModel.verifyPassword(email, password);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login time
    await UserModel.updateLastLogin(user.id);

    const token = CryptoUtils.generateJwtToken({
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          reputationScore: user.reputationScore,
          lastLoginAt: new Date(),
        },
        token,
      },
    });
  })
);

// Wallet-based authentication
authRouter.post(
  '/wallet-login',
  loginLimiter,
  validateRequest({ body: authSchemas.walletLogin }),
  asyncHandler(async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    logger.info('Wallet login attempt', { walletAddress });

    // Verify signature
    const isValidSignature = CryptoUtils.verifyWalletSignature(
      message,
      signature,
      walletAddress
    );

    if (!isValidSignature) {
      throw new AppError('Invalid wallet signature', 401);
    }

    // Find or create user
    let user = await UserModel.findByWalletAddress(walletAddress);
    if (!user) {
      // Create a new user with wallet address
      const tempEmail = `${walletAddress.toLowerCase()}@wallet.local`;
      user = await UserModel.create({
        email: tempEmail,
        walletAddress,
      });
    }

    // Update last login time
    await UserModel.updateLastLogin(user.id);

    const token = CryptoUtils.generateJwtToken({
      userId: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          reputationScore: user.reputationScore,
          lastLoginAt: new Date(),
        },
        token,
      },
    });
  })
);

// Generate wallet login message
authRouter.post(
  '/wallet-message',
  validateRequest({
    body: {
      walletAddress: authSchemas.walletLogin.extract('walletAddress'),
    },
  }),
  asyncHandler(async (req, res) => {
    const { walletAddress } = req.body;

    const message = CryptoUtils.generateWalletLoginMessage(walletAddress);

    res.json({
      success: true,
      data: {
        message,
        walletAddress,
      },
    });
  })
);

// Get current user profile
authRouter.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          isEmailVerified: user.isEmailVerified,
          reputationScore: user.reputationScore,
          totalTokensGenerated: user.totalTokensGenerated,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          preferences: user.preferences,
        },
      },
    });
  })
);

// Update user profile
authRouter.patch(
  '/me',
  authenticateToken,
  validateRequest({
    body: {
      email: authSchemas.register.extract('email').optional(),
      walletAddress: authSchemas.register.extract('walletAddress').optional(),
      preferences: {
        notifications: {
          email: 'boolean',
          tokenGeneration: 'boolean',
          priceAlerts: 'boolean',
        },
        privacy: {
          showProfile: 'boolean',
          showStats: 'boolean',
        },
      },
    },
  }),
  asyncHandler(async (req, res) => {
    const { email, walletAddress, preferences } = req.body;

    const updatedUser = await UserModel.update(req.user!.id, {
      email,
      walletAddress,
      preferences,
    });

    if (!updatedUser) {
      throw new AppError('Failed to update user', 500);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          walletAddress: updatedUser.walletAddress,
          isEmailVerified: updatedUser.isEmailVerified,
          reputationScore: updatedUser.reputationScore,
          totalTokensGenerated: updatedUser.totalTokensGenerated,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          preferences: updatedUser.preferences,
        },
      },
    });
  })
);

// Logout (client-side operation, but useful for tracking)
authRouter.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('User logout', { userId: req.user!.id });

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  })
);

// Verify JWT token
authRouter.post(
  '/verify-token',
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token required', 400);
    }

    const payload = CryptoUtils.verifyJwtToken(token);
    if (!payload) {
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
        },
      },
    });
  })
);