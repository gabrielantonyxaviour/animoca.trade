import dotenv from 'dotenv';

dotenv.config();

interface Environment {
  // Server
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;

  // Database
  DATABASE_URL: string;
  REDIS_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Blockchain
  MOCA_DEVNET_RPC_URL: string;
  CHAIN_ID: number;

  // Contract Addresses
  CREDENTIAL_TOKEN_FACTORY: string;
  PASSIVE_TOKEN_GENERATOR: string;
  REPUTATION_ORACLE: string;
  POOL_FACTORY: string;

  // AIR Kit
  AIR_KIT_API_KEY?: string;
  AIR_KIT_ENVIRONMENT: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Logging
  LOG_LEVEL: string;
}

const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'MOCA_DEVNET_RPC_URL',
  'CREDENTIAL_TOKEN_FACTORY',
  'PASSIVE_TOKEN_GENERATOR',
  'REPUTATION_ORACLE',
  'POOL_FACTORY',
];

function validateEnvironment(): Environment {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    // Server
    PORT: parseInt(process.env.PORT || '3001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Database
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

    // Blockchain
    MOCA_DEVNET_RPC_URL: process.env.MOCA_DEVNET_RPC_URL!,
    CHAIN_ID: parseInt(process.env.CHAIN_ID || '5151', 10),

    // Contract Addresses
    CREDENTIAL_TOKEN_FACTORY: process.env.CREDENTIAL_TOKEN_FACTORY!,
    PASSIVE_TOKEN_GENERATOR: process.env.PASSIVE_TOKEN_GENERATOR!,
    REPUTATION_ORACLE: process.env.REPUTATION_ORACLE!,
    POOL_FACTORY: process.env.POOL_FACTORY!,

    // AIR Kit
    AIR_KIT_API_KEY: process.env.AIR_KIT_API_KEY,
    AIR_KIT_ENVIRONMENT: process.env.AIR_KIT_ENVIRONMENT || 'development',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };
}

export const env = validateEnvironment();