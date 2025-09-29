import { env } from './environment.js';

export const NETWORK_CONFIG = {
  mocaDevnet: {
    chainId: 5151,
    name: 'Moca Devnet',
    rpcUrl: env.MOCA_DEVNET_RPC_URL,
    explorerUrl: 'https://devnet-scan.mocachain.org',
    blockTime: 2000, // 2 seconds
  },
} as const;

export const CONTRACT_ADDRESSES = {
  CREDENTIAL_TOKEN_FACTORY: env.CREDENTIAL_TOKEN_FACTORY,
  PASSIVE_TOKEN_GENERATOR: env.PASSIVE_TOKEN_GENERATOR,
  REPUTATION_ORACLE: env.REPUTATION_ORACLE,
  POOL_FACTORY: env.POOL_FACTORY,
} as const;

// Contract ABIs (basic interfaces - can be expanded)
export const CONTRACT_ABIS = {
  CREDENTIAL_TOKEN_FACTORY: [
    'function createCredentialToken(string memory name, string memory symbol, uint256 totalSupply) external returns (address)',
    'function getTokenByCredential(bytes32 credentialHash) external view returns (address)',
    'event TokenCreated(address indexed token, bytes32 indexed credentialHash, string name, string symbol)',
  ],

  PASSIVE_TOKEN_GENERATOR: [
    'function generateTokens() external',
    'function setGenerationRate(uint256 rate) external',
    'function getLastGenerationTime() external view returns (uint256)',
    'event TokensGenerated(uint256 amount, uint256 timestamp)',
  ],

  REPUTATION_ORACLE: [
    'function updateReputation(address user, uint256 score) external',
    'function getReputation(address user) external view returns (uint256)',
    'event ReputationUpdated(address indexed user, uint256 score, uint256 timestamp)',
  ],

  POOL_FACTORY: [
    'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)',
    'event PoolCreated(address indexed tokenA, address indexed tokenB, uint24 indexed fee, address pool)',
  ],

  // Standard ERC20 interface for credential tokens
  ERC20: [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
  ],
} as const;

// Event signatures for monitoring
export const EVENT_SIGNATURES = {
  TOKEN_CREATED: 'TokenCreated(address,bytes32,string,string)',
  TOKENS_GENERATED: 'TokensGenerated(uint256,uint256)',
  REPUTATION_UPDATED: 'ReputationUpdated(address,uint256,uint256)',
  POOL_CREATED: 'PoolCreated(address,address,uint24,address)',
  TRANSFER: 'Transfer(address,address,uint256)',
  APPROVAL: 'Approval(address,address,uint256)',
} as const;