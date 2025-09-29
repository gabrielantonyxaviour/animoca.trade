import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';

// Common validation schemas
export const commonSchemas = {
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  hash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  positiveInteger: Joi.number().integer().positive(),
  nonNegativeInteger: Joi.number().integer().min(0),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  uuid: Joi.string().uuid().required(),
  objectId: Joi.string().length(24).hex().required(),
};

// Pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Request validation middleware
export function validateRequest(schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join('; ')}`, 400);
    }

    next();
  };
}

// Specific validation schemas for our API

export const authSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    walletAddress: commonSchemas.address.optional(),
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
  }),

  walletLogin: Joi.object({
    walletAddress: commonSchemas.address,
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),
};

export const credentialSchemas = {
  validate: Joi.object({
    credentialHash: commonSchemas.hash,
    airProof: Joi.object().required(),
  }),

  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    credentialData: Joi.object().required(),
    aizkProof: Joi.object().required(),
  }),

  list: paginationSchema.keys({
    status: Joi.string().valid('pending', 'validated', 'rejected').optional(),
    userId: commonSchemas.uuid.optional(),
  }),
};

export const tokenSchemas = {
  generate: Joi.object({
    credentialId: commonSchemas.uuid,
    amount: commonSchemas.positiveInteger.optional(),
  }),

  transfer: Joi.object({
    to: commonSchemas.address,
    amount: Joi.string().pattern(/^\d+$/).required(), // BigNumber string
    tokenAddress: commonSchemas.address,
  }),

  list: paginationSchema.keys({
    userId: commonSchemas.uuid.optional(),
    tokenAddress: commonSchemas.address.optional(),
  }),
};

export const analyticsSchemas = {
  timeRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    granularity: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
  }),

  tokenMetrics: paginationSchema.keys({
    tokenAddress: commonSchemas.address.optional(),
  }),
};

// Utility functions
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}