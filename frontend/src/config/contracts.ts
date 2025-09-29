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
    // USDC-Based Marketplace Contract Addresses (Moca Devnet)
    USDC: '0x12D2162F47AAAe1B0591e898648605daA186D644',
    CREDENTIAL_TOKEN_FACTORY: '0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb',
    FEE_COLLECTOR: '0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93',
    CREDENTIAL_AMM: '0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67',
    PASSIVE_TOKEN_GENERATOR: '',
  },
  sepolia: {
    // Will be populated for sepolia deployment
    USDC: '',
    CREDENTIAL_TOKEN_FACTORY: '',
    FEE_COLLECTOR: '',
    CREDENTIAL_AMM: '',
    PASSIVE_TOKEN_GENERATOR: '',
  },
  mainnet: {
    // Will be populated for production deployment
    USDC: '',
    CREDENTIAL_TOKEN_FACTORY: '',
    FEE_COLLECTOR: '',
    CREDENTIAL_AMM: '',
    PASSIVE_TOKEN_GENERATOR: '',
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
    usdc: true,                    // Mock USDC ✓
    factory: true,                 // Credential Token Factory ✓
    feeCollector: true,            // Fee Collector ✓
    amm: true,                     // Credential AMM ✓
    marketplaceReady: true,        // Complete USDC-based marketplace ✓
  },
  sepolia: {
    usdc: false,
    factory: false,
    feeCollector: false,
    amm: false,
    marketplaceReady: false,
  },
  mainnet: {
    usdc: false,                   // Will use real USDC
    factory: false,
    feeCollector: false,
    amm: false,
    marketplaceReady: false,
  },
} as const;