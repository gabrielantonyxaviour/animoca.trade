# Deployment Guide - AIR Credential Token Ecosystem

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Contract Deployment](#contract-deployment)
4. [Frontend Configuration](#frontend-configuration)
5. [Verification](#verification)
6. [Monitoring Setup](#monitoring-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Node.js v18.0.0 or higher
- npm v8.0.0 or higher
- Foundry (for smart contracts)
- Git

### Required Accounts
- Ethereum wallet with deployment keys
- Infura or Alchemy API key (for RPC access)
- Etherscan API key (for contract verification)
- Sentry account (for error tracking)

### Minimum ETH Requirements
- **Sepolia Testnet**: 0.5 ETH for deployment and testing
- **Mainnet**: 2 ETH for deployment and initial liquidity

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/air-credential-example.git
cd air-credential-example
```

### 2. Install Dependencies

#### Contracts
```bash
cd contracts
forge install
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 3. Environment Variables

Create `.env` files in both `contracts/` and `frontend/` directories:

#### contracts/.env
```bash
# Network RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Deployment keys (NEVER commit these!)
PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...  # Optional: different admin address
ORACLE_OPERATOR=0x... # Optional: oracle operator address

# Verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# Gas settings
GAS_PRICE_GWEI=20  # For manual gas price
MAX_FEE_GWEI=50    # For EIP-1559
PRIORITY_FEE_GWEI=2 # For EIP-1559
```

#### frontend/.env
```bash
# API URLs
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
REACT_APP_MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# AIR Credential SDK
REACT_APP_AIR_PARTNER_ID=your-partner-id
REACT_APP_AIR_API_URL=https://api.mocanetwork.xyz

# Monitoring
REACT_APP_SENTRY_DSN=https://...@sentry.io/...
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
```

## Contract Deployment

### Step 1: Deploy to Sepolia Testnet

```bash
cd contracts

# Run deployment script
forge script script/DeploySystem.s.sol:DeployToSepolia \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# Expected output:
# CredentialTokenFactory deployed at: 0x...
# PoolFactory deployed at: 0x...
# PassiveTokenGenerator deployed at: 0x...
# ReputationOracle deployed at: 0x...
```

### Step 2: Verify Contracts

```bash
# Verify each contract
forge verify-contract \
  --chain-id 11155111 \
  --compiler-version v0.8.20+commit.a1b79de6 \
  CONTRACT_ADDRESS \
  src/CONTRACT_NAME.sol:CONTRACT_NAME \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Step 3: Test Deployment

```bash
# Run integration tests on deployed contracts
forge script script/DeploySystem.s.sol:testDeployment \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### Step 4: Export Deployment Data

The deployment script automatically generates:
- `deployments/11155111-latest.json` - Deployment data
- `deployments/sepolia-contracts.ts` - TypeScript configuration

Copy the TypeScript configuration to the frontend:
```bash
cp deployments/sepolia-contracts.ts ../frontend/src/config/deployments.ts
```

## Frontend Configuration

### Step 1: Update Contract Addresses

Update `frontend/src/config/contracts.ts`:

```typescript
import { CONTRACT_ADDRESSES as SEPOLIA_ADDRESSES } from './deployments';

export const CONTRACT_ADDRESSES = {
  sepolia: SEPOLIA_ADDRESSES.sepolia,
  mainnet: {
    // Will be populated for production
    CREDENTIAL_TOKEN_FACTORY: '',
    POOL_FACTORY: '',
    PASSIVE_TOKEN_GENERATOR: '',
    REPUTATION_ORACLE: '',
  },
};
```

### Step 2: Build Frontend

```bash
cd frontend

# Development build
npm run dev

# Production build
npm run build
```

### Step 3: Deploy Frontend

#### Using Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Using Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Using AWS S3 + CloudFront
```bash
# Build production
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Verification

### 1. Contract Verification Checklist

- [ ] All contracts deployed successfully
- [ ] Contract addresses logged and saved
- [ ] Contracts verified on Etherscan
- [ ] Contract relationships configured correctly
- [ ] Test token creation works
- [ ] Test pool creation works
- [ ] Test passive generation registration works

### 2. Frontend Verification Checklist

- [ ] Frontend loads without errors
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Contract addresses correctly configured
- [ ] Can create credential tokens
- [ ] Can view existing tokens
- [ ] Can create liquidity pools
- [ ] Can perform swaps
- [ ] Can claim passive generation rewards

### 3. End-to-End Testing

Run the full user journey:

1. **Connect Wallet**: User connects their wallet
2. **Create Token**: User creates a token for their credential
3. **Add Liquidity**: User or others add liquidity to pool
4. **Trade Tokens**: Users can swap ETH for tokens
5. **Passive Generation**: User registers and claims rewards
6. **Analytics**: View token metrics and trading volume

## Monitoring Setup

### 1. Sentry (Error Tracking)

```typescript
// frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. Google Analytics

```html
<!-- frontend/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 3. Contract Event Monitoring

Set up event listeners for critical contract events:

```typescript
// Monitor token creation
tokenFactory.on("TokenCreated", (credentialId, tokenAddress, creator) => {
  console.log(`New token created: ${tokenAddress}`);
  // Send to analytics
});

// Monitor trades
pool.on("Swap", (sender, amountIn, amountOut) => {
  console.log(`Swap executed: ${amountIn} -> ${amountOut}`);
  // Send to analytics
});
```

### 4. Performance Monitoring

```typescript
// Track page load performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  // Send to analytics
  gtag('event', 'page_load', {
    value: perfData.loadEventEnd - perfData.fetchStart
  });
});
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing (`forge test` and `npm test`)
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Rate limiting configured
- [ ] CORS settings configured
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Backup and recovery plan in place

### Mainnet Deployment

```bash
# Deploy to mainnet (CAREFUL!)
cd contracts

forge script script/DeploySystem.s.sol:DeployToMainnet \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  -vvvv

# IMPORTANT: Save all deployment addresses!
```

### Post-deployment Steps

1. **Transfer Ownership**: Transfer contract ownership to multisig wallet
2. **Set Rate Limits**: Configure API rate limits
3. **Enable Monitoring**: Activate all monitoring services
4. **Update Documentation**: Update README with mainnet addresses
5. **Announce Launch**: Notify users of go-live

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Insufficient Funds"
```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL

# Solution: Add more ETH to deployer address
```

#### 2. Contract Verification Fails
```bash
# Try manual verification with constructor args
forge verify-contract \
  --constructor-args $(cast abi-encode "constructor(address)" 0x...) \
  CONTRACT_ADDRESS \
  src/Contract.sol:Contract
```

#### 3. Frontend Cannot Connect to Contracts
```javascript
// Check network
console.log('Current network:', await provider.getNetwork());

// Check contract address
console.log('Factory address:', CONTRACT_ADDRESSES[network].CREDENTIAL_TOKEN_FACTORY);

// Solution: Ensure correct network and addresses
```

#### 4. Transaction Reverts
```javascript
// Enable detailed errors
try {
  await contract.method();
} catch (error) {
  console.error('Transaction failed:', error.reason || error.message);
  // Check error.data for more details
}
```

#### 5. Gas Price Issues
```bash
# Check current gas prices
cast gas-price --rpc-url $RPC_URL

# Set manual gas price
forge script ... --with-gas-price 30gwei
```

### Debug Commands

```bash
# Check deployment transaction
cast tx TRANSACTION_HASH --rpc-url $RPC_URL

# Check contract state
cast call CONTRACT_ADDRESS "owner()" --rpc-url $RPC_URL

# Simulate transaction
cast call CONTRACT_ADDRESS "createToken(bytes32,string,string,uint256,uint256)" \
  ARGS --from USER_ADDRESS --rpc-url $RPC_URL
```

## Security Considerations

1. **Private Keys**: Never commit private keys. Use hardware wallets for mainnet.
2. **Admin Keys**: Use multisig wallets for admin functions
3. **Oracle Security**: Implement oracle signature verification
4. **Rate Limiting**: Implement rate limiting on all public endpoints
5. **Circuit Breakers**: Add emergency pause functionality
6. **Audit Trail**: Log all critical operations

## Support

For deployment support:
- GitHub Issues: [github.com/your-org/air-credential-example/issues](https://github.com/your-org/air-credential-example/issues)
- Discord: [discord.gg/your-server](https://discord.gg/your-server)
- Email: support@your-domain.com

## Next Steps

After successful deployment:
1. Monitor system health for 24-48 hours
2. Conduct user acceptance testing
3. Implement feedback and improvements
4. Plan for scaling and optimization
5. Schedule regular security reviews