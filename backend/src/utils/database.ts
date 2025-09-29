import { Pool } from 'pg';
import Redis from 'redis';
import { DATABASE_CONFIG, REDIS_CONFIG } from '../../config/database.js';
import { createLogger } from './logger.js';

const logger = createLogger('database');

// PostgreSQL connection pool
export const db = new Pool({
  connectionString: DATABASE_CONFIG.url,
  ssl: DATABASE_CONFIG.ssl,
  ...DATABASE_CONFIG.pool,
});

// Redis client
export const redis = Redis.createClient({
  url: REDIS_CONFIG.url,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

// Database connection initialization
export async function initializeDatabase() {
  try {
    // Test PostgreSQL connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ PostgreSQL connection established successfully');

    // Connect to Redis
    await redis.connect();
    logger.info('✅ Redis connection established successfully');

  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database health check
export async function checkDatabaseHealth() {
  const health = {
    postgres: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Check PostgreSQL
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    health.postgres = true;
  } catch (error) {
    logger.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check Redis
    await redis.ping();
    health.redis = true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  return health;
}

// Graceful shutdown
export async function closeDatabase() {
  try {
    await db.end();
    await redis.disconnect();
    logger.info('Database connections closed gracefully');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
}

// Query helpers
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();

  try {
    const result = await db.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result.rows as T[];
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
      query: text,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new DatabaseError(
      `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function queryExists(text: string, params?: any[]): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(${text}) as exists`,
    params
  );
  return result?.exists || false;
}

// Redis helpers
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(`${REDIS_CONFIG.keyPrefixes.cache}${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Cache get failed:', error);
    return null;
  }
}

export async function cacheSet<T = any>(
  key: string,
  value: T,
  ttl: number = REDIS_CONFIG.ttl.cache
): Promise<void> {
  try {
    await redis.setEx(
      `${REDIS_CONFIG.keyPrefixes.cache}${key}`,
      ttl,
      JSON.stringify(value)
    );
  } catch (error) {
    logger.error('Cache set failed:', error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(`${REDIS_CONFIG.keyPrefixes.cache}${key}`);
  } catch (error) {
    logger.error('Cache delete failed:', error);
  }
}