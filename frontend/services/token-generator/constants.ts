/**
 * Constants for the token generator service
 */

// Time constants
export const SECONDS_PER_DAY = 86400;
export const MIN_CLAIM_INTERVAL = 86400; // 24 hours in seconds
export const CLAIM_REFRESH_INTERVAL = 60000; // Refresh claimable amount every minute

// Emission rate constants
export const MIN_BASE_RATE = 10; // 10 tokens per day minimum
export const MAX_BASE_RATE = 50; // 50 tokens per day maximum
export const DEFAULT_BASE_RATE = 10; // Default 10 tokens per day

// Multiplier constants
export const MIN_MULTIPLIER = 0.8; // 0.8x minimum
export const MAX_MULTIPLIER = 5.0; // 5x maximum
export const DEFAULT_MULTIPLIER = 1.0; // 1x default

// Anti-inflation constants
export const MIN_ANTI_INFLATION = 0.8; // 0.8x minimum
export const MAX_ANTI_INFLATION = 1.2; // 1.2x maximum
export const DEFAULT_ANTI_INFLATION = 1.0; // 1x default

// Time decay constants
export const MONTHLY_DECAY_RATE = 0.01; // 1% decay per month
export const MIN_DECAY_FACTOR = 0.01; // Minimum 1% of original rate

// Contract addresses (to be configured based on network)
export const CONTRACT_ADDRESSES = {
  mainnet: {
    factory: '',
    generator: '',
  },
  goerli: {
    factory: '',
    generator: '',
  },
  localhost: {
    factory: '',
    generator: '',
  },
};

// Error messages
export const ERROR_MESSAGES = {
  SERVICE_NOT_INITIALIZED: 'Token generator service not initialized',
  INVALID_CREDENTIAL: 'Invalid credential ID',
  NOT_CREDENTIAL_HOLDER: 'You do not own this credential',
  CLAIM_TOO_SOON: 'Cannot claim yet. Please wait for the minimum interval',
  NO_TOKENS_TO_CLAIM: 'No tokens available to claim',
  EXCEEDS_MAX_SUPPLY: 'Cannot mint more tokens - max supply reached',
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  INVALID_AMOUNT: 'Invalid token amount',
};

// Success messages
export const SUCCESS_MESSAGES = {
  TOKENS_CLAIMED: 'Tokens successfully claimed!',
  BATCH_CLAIMED: 'Batch claim successful!',
  MULTIPLIER_UPDATED: 'Emission multiplier updated',
  INTERVAL_UPDATED: 'Claim interval updated',
};

// UI Constants
export const UI_CONSTANTS = {
  DECIMALS: 18,
  TOKEN_SYMBOL: 'TKN',
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  GAS_BUFFER: 1.2, // 20% buffer for gas estimates
};

// Stat refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  CLAIMABLE_TOKENS: 60000, // 1 minute
  CREDENTIAL_STATS: 300000, // 5 minutes
  GLOBAL_STATS: 600000, // 10 minutes
  EMISSION_CALCULATION: 30000, // 30 seconds
};

// Chart constants for analytics
export const CHART_CONSTANTS = {
  MAX_DATA_POINTS: 30, // Maximum points to show on charts
  DEFAULT_TIME_RANGE: 7, // Default 7 days
  AVAILABLE_RANGES: [1, 7, 14, 30, 90], // Available day ranges
};

// Notification types
export const NOTIFICATION_TYPES = {
  CLAIM_AVAILABLE: 'claim_available',
  CLAIM_SUCCESS: 'claim_success',
  CLAIM_ERROR: 'claim_error',
  MULTIPLIER_CHANGE: 'multiplier_change',
  MAX_SUPPLY_REACHED: 'max_supply_reached',
};

// Local storage keys
export const STORAGE_KEYS = {
  LAST_CLAIM_CHECK: 'tokengen_last_claim_check',
  FAVORITE_CREDENTIALS: 'tokengen_favorite_credentials',
  USER_PREFERENCES: 'tokengen_user_preferences',
  CLAIM_HISTORY: 'tokengen_claim_history',
};

// API endpoints (for backend service)
export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  CLAIM_STATUS: '/api/token-generator/claim-status',
  EMISSION_STATS: '/api/token-generator/emission-stats',
  CLAIM_HISTORY: '/api/token-generator/claim-history',
  BATCH_CLAIM: '/api/token-generator/batch-claim',
};

// Network configurations
export const NETWORK_CONFIG = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
  },
  5: {
    name: 'Goerli Testnet',
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io',
  },
  31337: {
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
  },
};

// Transaction status
export const TX_STATUS = {
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};