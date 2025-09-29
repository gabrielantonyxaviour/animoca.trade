# USDC-Based Credential Marketplace Integration Guide

## Overview

This guide provides complete integration instructions for the USDC-based credential marketplace system deployed on Moca Devnet. The system replaces the emission-based model with a fee-based revenue distribution system using USDC as the base currency.

## Deployed Contract Addresses (Moca Devnet)

```bash
# Add these to your .env file
VITE_USDC_ADDRESS=0x12D2162F47AAAe1B0591e898648605daA186D644
VITE_FACTORY_ADDRESS=0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb
VITE_FEE_COLLECTOR_ADDRESS=0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93
VITE_AMM_ADDRESS=0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67

# Network Configuration
VITE_MOCA_DEVNET_RPC_URL=https://devnet-rpc.mocachain.org
VITE_MOCA_DEVNET_CHAIN_ID=5151
VITE_MOCA_DEVNET_EXPLORER=https://devnet-scan.mocachain.org
```

## Key Functions for Frontend Integration

### 1. Token Creation

**Contract:** CredentialTokenFactory (`0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb`)

```javascript
// Create a new credential token
async function createCredentialToken(credentialId, name, symbol, emissionRate, maxSupply) {
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

  // Convert credentialId to bytes32 if it's a string
  const credentialIdBytes32 = credentialId.startsWith('0x')
    ? credentialId
    : ethers.utils.formatBytes32String(credentialId);

  const tx = await factory.createToken(
    credentialIdBytes32,
    name,
    symbol,
    emissionRate, // tokens per day (with 18 decimals)
    maxSupply,    // max supply (with 18 decimals)
    { value: 0 } // No ETH required, fees paid in USDC
  );

  const receipt = await tx.wait();
  const tokenAddress = receipt.events.find(e => e.event === 'TokenCreated').args.tokenAddress;
  return tokenAddress;
}
```

### 2. Creating Market with Liquidity

**Contract:** CredentialAMM (`0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67`)

```javascript
// Create a liquidity pool for a credential token
async function createMarketWithLiquidity(credentialId, tokenAddress, tokenAmount, usdcAmount) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);

  // Approve tokens
  await usdc.approve(AMM_ADDRESS, usdcAmount);
  await token.approve(AMM_ADDRESS, tokenAmount);

  // Create pool
  const tx = await amm.createPool(
    credentialId,
    tokenAddress,
    tokenAmount, // Token amount (18 decimals)
    usdcAmount   // USDC amount (6 decimals)
  );

  return await tx.wait();
}
```

### 3. Buying Tokens with USDC

```javascript
// Buy credential tokens with USDC
async function buyTokens(credentialId, usdcAmount, minTokensOut, deadline) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, signer);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

  // Approve USDC spending
  await usdc.approve(AMM_ADDRESS, usdcAmount);

  // Execute swap
  const tx = await amm.swapUSDCForTokens(
    credentialId,
    usdcAmount,
    minTokensOut,
    deadline || Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  );

  return await tx.wait();
}
```

### 4. Selling Tokens for USDC

```javascript
// Sell credential tokens for USDC
async function sellTokens(credentialId, tokenAmount, minUsdcOut, deadline) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, signer);
  const tokenAddress = await amm.getTokenByCredential(credentialId);
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);

  // Approve token spending
  await token.approve(AMM_ADDRESS, tokenAmount);

  // Execute swap
  const tx = await amm.swapTokensForUSDC(
    credentialId,
    tokenAmount,
    minUsdcOut,
    deadline || Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  );

  return await tx.wait();
}
```

### 5. Price Fetching and Quotes

```javascript
// Get current token price (USDC per token)
async function getTokenPrice(credentialId) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, provider);
  return await amm.getTokenPrice(credentialId);
}

// Get buy quote (how many tokens for X USDC)
async function getBuyQuote(credentialId, usdcAmount) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, provider);
  const [tokensOut, fee] = await amm.getAmountOut(
    credentialId,
    USDC_ADDRESS,
    usdcAmount
  );
  return { tokensOut, fee };
}

// Get sell quote (how much USDC for X tokens)
async function getSellQuote(credentialId, tokenAmount) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, provider);
  const tokenAddress = await amm.getTokenByCredential(credentialId);
  const [usdcOut, fee] = await amm.getAmountOut(
    credentialId,
    tokenAddress,
    tokenAmount
  );
  return { usdcOut, fee };
}
```

### 6. Getting Pool Information

```javascript
// Get pool reserves and liquidity
async function getPoolInfo(credentialId) {
  const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, provider);
  const pool = await amm.getPool(credentialId);

  return {
    tokenAddress: pool.credentialToken,
    tokenReserves: pool.tokenReserves,
    usdcReserves: pool.usdcReserves,
    totalLiquidity: pool.totalLiquidity,
    isActive: pool.isActive
  };
}
```

### 7. USDC Operations

```javascript
// Get USDC balance
async function getUSDCBalance(address) {
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
  return await usdc.balanceOf(address);
}

// Free mint USDC (testnet only)
async function mintTestUSDC(amount) {
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const tx = await usdc.freeMint(signer.address, amount);
  return await tx.wait();
}
```

## Event Listeners for Real-Time Updates

```javascript
// Listen for trades
const amm = new ethers.Contract(AMM_ADDRESS, AMM_ABI, provider);

amm.on('Swap', (user, credentialId, tokenIn, tokenOut, amountIn, amountOut, fee) => {
  console.log('Trade executed:', {
    user,
    credentialId,
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    amountOut: amountOut.toString(),
    fee: fee.toString()
  });
});

// Listen for new tokens
const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

factory.on('TokenCreated', (credentialId, tokenAddress, creator) => {
  console.log('New token created:', {
    credentialId,
    tokenAddress,
    creator
  });
});
```

## Complete Integration Example

```javascript
// Complete workflow: Create token, add liquidity, enable trading
async function setupCredentialMarket(credentialId, name, symbol) {
  try {
    // Step 1: Create token
    console.log('Creating credential token...');
    const tokenAddress = await createCredentialToken(
      credentialId,
      name,
      symbol,
      ethers.utils.parseEther('1000'), // 1000 tokens per day
      ethers.utils.parseEther('1000000') // 1M max supply
    );

    // Step 2: Mint initial tokens (for liquidity)
    console.log('Minting initial tokens...');
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
    // Note: Only authorized minters can mint tokens

    // Step 3: Add initial liquidity
    console.log('Adding initial liquidity...');
    await createMarketWithLiquidity(
      credentialId,
      tokenAddress,
      ethers.utils.parseEther('1000'), // 1000 tokens
      ethers.utils.parseUnits('1000', 6) // 1000 USDC
    );

    console.log('Market setup complete!');
    return tokenAddress;

  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}
```

## Error Handling

```javascript
// Common error patterns and handling
function handleContractError(error) {
  if (error.reason) {
    switch (error.reason) {
      case 'InsufficientLiquidity()':
        return 'Not enough liquidity in the pool for this trade';
      case 'SlippageExceeded()':
        return 'Price moved too much, try adjusting slippage tolerance';
      case 'DeadlineExpired()':
        return 'Transaction took too long, please try again';
      case 'InsufficientBalance()':
        return 'Insufficient token balance';
      default:
        return `Contract error: ${error.reason}`;
    }
  }
  return 'Unknown error occurred';
}
```

## TypeScript Types

```typescript
interface PoolInfo {
  tokenAddress: string;
  tokenReserves: BigNumber;
  usdcReserves: BigNumber;
  totalLiquidity: BigNumber;
  isActive: boolean;
}

interface TradeQuote {
  tokensOut?: BigNumber;
  usdcOut?: BigNumber;
  fee: BigNumber;
}

interface SwapParams {
  credentialId: string;
  amount: BigNumber;
  minAmountOut: BigNumber;
  deadline: number;
}
```

## Security Considerations

1. **Always use deadlines** for swaps to prevent MEV attacks
2. **Set appropriate slippage tolerance** (recommended: 0.5-2%)
3. **Validate all user inputs** before sending transactions
4. **Check approvals** before attempting swaps
5. **Handle network errors** and transaction failures gracefully

## Gas Optimization Tips

1. **Batch operations** when possible
2. **Use multicall** for reading multiple values
3. **Cache pool data** to reduce RPC calls
4. **Estimate gas** before transactions for better UX

This integration guide provides everything needed to build a frontend for the USDC-based credential marketplace. The system is fully tested and deployed on Moca Devnet.