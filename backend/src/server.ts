import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRouter } from './routes/auth.js';
import { credentialsRouter } from './routes/credentials.js';
import { tokensRouter } from './routes/tokens.js';
import { analyticsRouter } from './routes/analytics.js';
import { startBackgroundServices } from './services/index.js';
import { initializeDatabase, closeDatabase, checkDatabaseHealth } from './utils/database.js';

// Load environment variables
dotenv.config();

const logger = createLogger('server');
const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.postgres && dbHealth.redis;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealth,
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/analytics', analyticsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server and background services
async function startServer() {
  try {
    // Initialize database connections
    await initializeDatabase();

    // Start background services
    await startBackgroundServices();

    app.listen(PORT, () => {
      logger.info(`🚀 AIR Credential Backend API running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Unhandled error during server startup:', error);
  process.exit(1);
});