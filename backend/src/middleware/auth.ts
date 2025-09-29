import { Request, Response, NextFunction } from 'express';
import { CryptoUtils } from '../utils/crypto.js';
import { UserModel } from '../models/User.js';
import { AppError } from './errorHandler.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        walletAddress?: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    walletAddress?: string;
  };
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError('Access token required', 401);
    }

    const payload = CryptoUtils.verifyJwtToken(token);
    if (!payload) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Verify user still exists
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          message: error.message,
          statusCode: error.statusCode,
        },
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication failed',
          statusCode: 401,
        },
      });
    }
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = CryptoUtils.verifyJwtToken(token);
      if (payload) {
        const user = await UserModel.findById(payload.userId);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            walletAddress: user.walletAddress,
          };
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, continue even if authentication fails
    logger.debug('Optional authentication failed:', error);
    next();
  }
};

export const requireWallet = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.walletAddress) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Wallet address required for this operation',
        statusCode: 403,
      },
    });
    return;
  }

  next();
};

export const requireEmailVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user?.isEmailVerified) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Email verification required',
          statusCode: 403,
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Email verification check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
};

// Rate limiting for sensitive operations
export const createAuthLimiter = (windowMs: number, max: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    const userAttempts = attempts.get(key);
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userAttempts.count >= max) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many attempts, please try again later',
          statusCode: 429,
          retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
        },
      });
      return;
    }

    userAttempts.count++;
    next();
  };
};

// Login rate limiter (5 attempts per 15 minutes)
export const loginLimiter = createAuthLimiter(15 * 60 * 1000, 5);

// Registration rate limiter (3 registrations per hour)
export const registrationLimiter = createAuthLimiter(60 * 60 * 1000, 3);