// Contract deployment addresses
// This file will be updated by each session as contracts are deployed

export const NETWORK_CONFIG = {
  mocaDevnet: {
    chainId: 5151,
    name: 'Moca Devnet',
    rpcUrl: 'https://devnet-rpc.mocachain.org',
    explorerUrl: 'https://devnet-scan.mocachain.org',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || '',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL || '',
    explorerUrl: 'https://etherscan.io',
  },
} as const;

export const CONTRACT_ADDRESSES = {
  mocaDevnet: {
    // Will be populated by deployment to Moca Devnet
    CREDENTIAL_TOKEN_FACTORY: '',
    PASSIVE_TOKEN_GENERATOR: '',
    REPUTATION_ORACLE: '',
    POOL_FACTORY: '',
  },
  sepolia: {
    // Will be populated by Session 1-3 deployments
    CREDENTIAL_TOKEN_FACTORY: '',
    PASSIVE_TOKEN_GENERATOR: '',
    REPUTATION_ORACLE: '',
    POOL_FACTORY: '',
  },
  mainnet: {
    // Will be populated for production deployment in Session 8
    CREDENTIAL_TOKEN_FACTORY: '',
    PASSIVE_TOKEN_GENERATOR: '',
    REPUTATION_ORACLE: '',
    POOL_FACTORY: '',
  },
} as const;

// Get addresses for current network
export const getContractAddresses = (chainId: number) => {
  switch (chainId) {
    case 5151:
      return CONTRACT_ADDRESSES.mocaDevnet;
    case 11155111:
      return CONTRACT_ADDRESSES.sepolia;
    case 1:
      return CONTRACT_ADDRESSES.mainnet;
    default:
      throw new Error(`Unsupported network: ${chainId}`);
  }
};

// Contract deployment status tracking
export const DEPLOYMENT_STATUS = {
  mocaDevnet: {
    foundationSetup: false,        // Factory contracts
    coreTokens: false,             // Token generation
    ammPools: false,               // DEX pools
    tokenGeneration: false,        // Passive token generator
    reputationOracle: false,       // Reputation system
  },
  sepolia: {
    foundationSetup: false,        // Session 1
    coreTokens: false,             // Session 2
    ammPools: false,               // Session 3
    tokenGeneration: false,        // Session 6
    reputationOracle: false,       // Session 7
  },
  mainnet: {
    foundationSetup: false,        // Session 8
    coreTokens: false,             // Session 8
    ammPools: false,               // Session 8
    tokenGeneration: false,        // Session 8
    reputationOracle: false,       // Session 8
  },
} as const;