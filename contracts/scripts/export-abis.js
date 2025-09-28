const fs = require('fs');
const path = require('path');

/**
 * Export contract ABIs to frontend integration
 * Session 1: Export interface ABIs for frontend integration
 * Sessions 2-7: Export actual contract ABIs as they're implemented
 */

const CONTRACTS_DIR = path.join(__dirname, '..');
const OUT_DIR = path.join(CONTRACTS_DIR, 'out');
const FRONTEND_TYPES_DIR = path.join(CONTRACTS_DIR, '..', 'src', 'types');

// Contract interface files to export ABIs from
const INTERFACE_CONTRACTS = [
  'ICredentialToken.sol',
  'ICredentialTokenFactory.sol',
  'ICredentialPool.sol',
  'IPassiveTokenGenerator.sol',
  'IReputationOracle.sol'
];

// Contract implementation files (Sessions 2-3 complete)
const IMPLEMENTATION_CONTRACTS = [
  // Session 2 - Complete
  'CredentialToken.sol',
  'CredentialTokenFactory.sol',

  // Session 3 - Complete
  'PoolFactory.sol',
  'CredentialPool.sol',

  // Session 6
  // 'PassiveTokenGenerator.sol',

  // Session 7
  // 'ReputationOracle.sol'
];

async function exportABIs() {
  console.log('Exporting contract ABIs to frontend...');

  // Ensure output directory exists
  if (!fs.existsSync(FRONTEND_TYPES_DIR)) {
    fs.mkdirSync(FRONTEND_TYPES_DIR, { recursive: true });
  }

  const contractABIs = {};
  const contractAddresses = {
    // Will be populated by deployment scripts in future sessions
    CREDENTIAL_TOKEN_FACTORY: '',
    PASSIVE_TOKEN_GENERATOR: '',
    REPUTATION_ORACLE: '',
    POOL_FACTORY: ''
  };

  // Export interface ABIs (Session 1)
  for (const contractFile of INTERFACE_CONTRACTS) {
    const contractName = contractFile.replace('.sol', '');
    const abiPath = path.join(OUT_DIR, contractFile, `${contractName}.json`);

    if (fs.existsSync(abiPath)) {
      const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      contractABIs[contractName] = contractData.abi || [];
      console.log(`Exported ${contractName} ABI`);
    } else {
      console.log(`${contractName} ABI not found at ${abiPath}`);
      contractABIs[contractName] = [];
    }
  }

  // Export implementation ABIs (future sessions)
  for (const contractFile of IMPLEMENTATION_CONTRACTS) {
    const contractName = contractFile.replace('.sol', '');
    const abiPath = path.join(OUT_DIR, contractFile, `${contractName}.json`);

    if (fs.existsSync(abiPath)) {
      const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      contractABIs[contractName] = contractData.abi || [];
      console.log(`Exported ${contractName} ABI`);
    } else {
      console.log(`${contractName} ABI not found (will be added in future sessions)`);
      contractABIs[contractName] = [];
    }
  }

  // Generate TypeScript file
  const tsContent = `// Auto-generated contract ABIs and addresses
// This file is updated by contract deployment scripts
// Last updated: ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = ${JSON.stringify(contractAddresses, null, 2)} as const;

export const CONTRACT_ABIS = ${JSON.stringify(contractABIs, null, 2)} as const;

// Type definitions for contract interactions
export interface CreateTokenParams {
  credentialId: string;
  name: string;
  symbol: string;
  emissionRate: number;
  maxSupply: number;
  initialLiquidity: {
    tokenAmount: number;
    ethAmount: number;
  };
}

export interface Token {
  address: string;
  credentialId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  emissionRate: number;
  maxSupply: number;
  creator: string;
  createdAt: Date;
  currentPrice?: number;
  marketCap?: number;
  volume24h?: number;
  reputationScore?: number;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: bigint;
  reserve1: bigint;
  totalLiquidity: bigint;
  volume24h: number;
  fees24h: number;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  timestamp: Date;
  price: number;
  volume: number;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippageTolerance: number;
  deadline: number;
}

export interface LPPosition {
  poolAddress: string;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
  uncollectedFees: bigint;
}

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type ContractABIs = typeof CONTRACT_ABIS;
`;

  const outputPath = path.join(FRONTEND_TYPES_DIR, 'contracts.ts');
  fs.writeFileSync(outputPath, tsContent);

  console.log(`\nContract types exported to: ${outputPath}`);
  console.log(`Frontend integration ready for Sessions 4-5`);
  console.log(`ABIs exported: ${Object.keys(contractABIs).length}`);
}

// Run the export
exportABIs().catch(console.error);