import { env } from './environment.js';

export const DATABASE_CONFIG = {
  url: env.DATABASE_URL,
  // Supabase requires SSL in all environments
  ssl: { rejectUnauthorized: false },

  // Connection pool settings optimized for Supabase
  pool: {
    min: 1,
    max: 5, // Supabase free tier has connection limits
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};