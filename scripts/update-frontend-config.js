#!/usr/bin/env node

/**
 * Script to update frontend configuration with deployed contract addresses
 * Usage: node update-frontend-config.js <network> <tokenFactory> <poolFactory> <generator> <oracle>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const [,, network, tokenFactory, poolFactory, generator, oracle] = process.argv;

if (!network || !tokenFactory || !poolFactory || !generator || !oracle) {
  console.error('Usage: node update-frontend-config.js <network> <tokenFactory> <poolFactory> <generator> <oracle>');
  console.error('Example: node update-frontend-config.js sepolia 0x123... 0x456... 0x789... 0xabc...');
  process.exit(1);
}

// Validate network
if (!['sepolia', 'mainnet'].includes(network)) {
  console.error('Network must be either "sepolia" or "mainnet"');
  process.exit(1);
}

// Validate addresses
const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

const addresses = {
  CREDENTIAL_TOKEN_FACTORY: tokenFactory,
  POOL_FACTORY: poolFactory,
  PASSIVE_TOKEN_GENERATOR: generator,
  REPUTATION_ORACLE: oracle,
};

for (const [name, address] of Object.entries(addresses)) {
  if (!isValidAddress(address)) {
    console.error(`Invalid address for ${name}: ${address}`);
    process.exit(1);
  }
}

// Path to the configuration file
const configPath = path.join(__dirname, '..', 'frontend', 'src', 'config', 'contracts.ts');

// Read the current configuration
let configContent;
try {
  configContent = fs.readFileSync(configPath, 'utf8');
} catch (error) {
  console.error(`Failed to read configuration file: ${error.message}`);
  process.exit(1);
}

// Create backup
const backupPath = `${configPath}.backup.${Date.now()}`;
fs.writeFileSync(backupPath, configContent);
console.log(`Created backup: ${backupPath}`);

// Update configuration for the specified network
const updatedConfig = `// Contract deployment addresses
// This file will be updated by each session as contracts are deployed
// Last updated: ${new Date().toISOString()}
// Network: ${network}

export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.REACT_APP_SEPOLIA_RPC_URL || '',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL || '',
    explorerUrl: 'https://etherscan.io',
  },
} as const;

export const CONTRACT_ADDRESSES = {
  sepolia: {
    CREDENTIAL_TOKEN_FACTORY: ${network === 'sepolia' ? `'${tokenFactory}'` : "''"},
    PASSIVE_TOKEN_GENERATOR: ${network === 'sepolia' ? `'${generator}'` : "''"},
    REPUTATION_ORACLE: ${network === 'sepolia' ? `'${oracle}'` : "''"},
    POOL_FACTORY: ${network === 'sepolia' ? `'${poolFactory}'` : "''"},
  },
  mainnet: {
    CREDENTIAL_TOKEN_FACTORY: ${network === 'mainnet' ? `'${tokenFactory}'` : "''"},
    PASSIVE_TOKEN_GENERATOR: ${network === 'mainnet' ? `'${generator}'` : "''"},
    REPUTATION_ORACLE: ${network === 'mainnet' ? `'${oracle}'` : "''"},
    POOL_FACTORY: ${network === 'mainnet' ? `'${poolFactory}'` : "''"},
  },
} as const;

// Get addresses for current network
export const getContractAddresses = (chainId: number) => {
  switch (chainId) {
    case 11155111:
      return CONTRACT_ADDRESSES.sepolia;
    case 1:
      return CONTRACT_ADDRESSES.mainnet;
    default:
      throw new Error(\`Unsupported network: \${chainId}\`);
  }
};

// Contract deployment status tracking
export const DEPLOYMENT_STATUS = {
  sepolia: {
    foundationSetup: ${network === 'sepolia' ? 'true' : 'false'},
    coreTokens: ${network === 'sepolia' ? 'true' : 'false'},
    ammPools: ${network === 'sepolia' ? 'true' : 'false'},
    tokenGeneration: ${network === 'sepolia' ? 'true' : 'false'},
    reputationOracle: ${network === 'sepolia' ? 'true' : 'false'},
  },
  mainnet: {
    foundationSetup: ${network === 'mainnet' ? 'true' : 'false'},
    coreTokens: ${network === 'mainnet' ? 'true' : 'false'},
    ammPools: ${network === 'mainnet' ? 'true' : 'false'},
    tokenGeneration: ${network === 'mainnet' ? 'true' : 'false'},
    reputationOracle: ${network === 'mainnet' ? 'true' : 'false'},
  },
} as const;

// Contract ABIs (imported from compiled artifacts)
export { default as CredentialTokenFactoryABI } from '../../../contracts/out/CredentialTokenFactory.sol/CredentialTokenFactory.json';
export { default as CredentialTokenABI } from '../../../contracts/out/CredentialToken.sol/CredentialToken.json';
export { default as PoolFactoryABI } from '../../../contracts/out/PoolFactory.sol/PoolFactory.json';
export { default as CredentialPoolABI } from '../../../contracts/out/CredentialPool.sol/CredentialPool.json';
export { default as PassiveTokenGeneratorABI } from '../../../contracts/out/PassiveTokenGenerator.sol/PassiveTokenGenerator.json';
export { default as ReputationOracleABI } from '../../../contracts/out/ReputationOracle.sol/ReputationOracle.json';
`;

// Write the updated configuration
try {
  fs.writeFileSync(configPath, updatedConfig);
  console.log(`✅ Successfully updated configuration for ${network}`);
  console.log(`\nContract Addresses:`);
  console.log(`  CREDENTIAL_TOKEN_FACTORY: ${tokenFactory}`);
  console.log(`  POOL_FACTORY: ${poolFactory}`);
  console.log(`  PASSIVE_TOKEN_GENERATOR: ${generator}`);
  console.log(`  REPUTATION_ORACLE: ${oracle}`);
} catch (error) {
  console.error(`Failed to write configuration file: ${error.message}`);

  // Restore backup
  fs.copyFileSync(backupPath, configPath);
  console.log('Restored configuration from backup');
  process.exit(1);
}

// Create deployment record
const deploymentRecord = {
  network,
  timestamp: new Date().toISOString(),
  addresses: {
    CREDENTIAL_TOKEN_FACTORY: tokenFactory,
    POOL_FACTORY: poolFactory,
    PASSIVE_TOKEN_GENERATOR: generator,
    REPUTATION_ORACLE: oracle,
  },
  deployer: process.env.DEPLOYER_ADDRESS || 'unknown',
};

const recordPath = path.join(__dirname, '..', 'deployments', `${network}-${Date.now()}.json`);

// Ensure deployments directory exists
const deploymentsDir = path.dirname(recordPath);
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir, { recursive: true });
}

// Save deployment record
fs.writeFileSync(recordPath, JSON.stringify(deploymentRecord, null, 2));
console.log(`\n📝 Deployment record saved to: ${recordPath}`);