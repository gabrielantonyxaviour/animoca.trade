import { ethers } from 'ethers';
import contractABIs from '../contract-abis.json';
import { getContractAddresses, NETWORK_CONFIG } from '../config/contracts.ts';

// Get contract addresses for current network (defaulting to Moca Devnet)
const getContracts = (chainId = 5151) => {
  const addresses = getContractAddresses(chainId);
  return {
    USDC: addresses.USDC,
    FACTORY: addresses.CREDENTIAL_TOKEN_FACTORY,
    FEE_COLLECTOR: addresses.FEE_COLLECTOR,
    AMM: addresses.CREDENTIAL_AMM
  };
};

// Network configuration
const MOCA_DEVNET = NETWORK_CONFIG.mocaDevnet;

class CredentialMarketplace {
  constructor(provider, signer = null, chainId = 5151) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    // Get contract addresses for current network
    this.contracts = getContracts(chainId);

    // Initialize contract instances
    this.usdc = new ethers.Contract(this.contracts.USDC, contractABIs.MockUSDC, provider);
    this.factory = new ethers.Contract(this.contracts.FACTORY, contractABIs.CredentialTokenFactory, provider);
    this.feeCollector = new ethers.Contract(this.contracts.FEE_COLLECTOR, contractABIs.FeeCollector, provider);
    this.amm = new ethers.Contract(this.contracts.AMM, contractABIs.CredentialAMM, provider);

    // Initialize with signer if provided
    if (signer) {
      this.usdcSigner = this.usdc.connect(signer);
      this.factorySigner = this.factory.connect(signer);
      this.feeCollectorSigner = this.feeCollector.connect(signer);
      this.ammSigner = this.amm.connect(signer);
    }
  }

  setSigner(signer) {
    this.signer = signer;
    this.usdcSigner = this.usdc.connect(signer);
    this.factorySigner = this.factory.connect(signer);
    this.feeCollectorSigner = this.feeCollector.connect(signer);
    this.ammSigner = this.amm.connect(signer);
  }

  // Utility functions
  stringToBytes32(str) {
    return ethers.encodeBytes32String(str);
  }

  bytes32ToString(bytes32) {
    return ethers.decodeBytes32String(bytes32);
  }

  formatUSDC(amount) {
    return ethers.formatUnits(amount, 6);
  }

  parseUSDC(amount) {
    return ethers.parseUnits(amount.toString(), 6);
  }

  formatTokens(amount) {
    return ethers.formatEther(amount);
  }

  parseTokens(amount) {
    return ethers.parseEther(amount.toString());
  }

  // USDC operations
  async getUSDCBalance(address) {
    return await this.usdc.balanceOf(address);
  }

  async mintTestUSDC(amount) {
    console.log("marketplace.mintTestUSDC called with amount:", amount);

    if (!this.signer) {
      console.error("No signer available for minting");
      throw new Error('Signer required for this operation');
    }

    console.log("Signer address:", await this.signer.getAddress());
    console.log("USDC contract address:", this.contracts.USDC);
    console.log("Has usdcSigner:", !!this.usdcSigner);

    try {
      const parsedAmount = this.parseUSDC(amount);
      console.log("Parsed amount (wei):", parsedAmount.toString());

      console.log("Calling freeMint...");
      const tx = await this.usdcSigner.freeMint(this.signer.address, parsedAmount);
      console.log("Transaction sent:", tx.hash);

      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);

      return receipt;
    } catch (error) {
      console.error("mintTestUSDC failed:", error);
      throw error;
    }
  }

  async approveUSDC(spender, amount) {
    if (!this.signer) throw new Error('Signer required for this operation');
    const tx = await this.usdcSigner.approve(spender, amount);
    return await tx.wait();
  }

  // Token creation
  async createCredentialToken(credentialId, name, symbol, emissionRate, maxSupply) {
    if (!this.signer) throw new Error('Signer required for this operation');

    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;

    // First, approve USDC for fee payment
    const feeAmount = this.parseUSDC(1); // 1 USDC minting fee
    await this.approveUSDC(this.contracts.FEE_COLLECTOR, feeAmount);

    const tx = await this.factorySigner.createToken(
      credentialIdBytes32,
      name,
      symbol,
      this.parseTokens(emissionRate),
      this.parseTokens(maxSupply)
    );

    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'TokenCreated');
    return {
      tokenAddress: event.args.tokenAddress,
      credentialId: event.args.credentialId,
      receipt
    };
  }

  // Market operations
  async createMarketWithLiquidity(credentialId, tokenAddress, tokenAmount, usdcAmount) {
    if (!this.signer) throw new Error('Signer required for this operation');

    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;

    const token = new ethers.Contract(tokenAddress, contractABIs.CredentialToken, this.signer);

    // Approve tokens
    await this.approveUSDC(this.contracts.AMM, usdcAmount);
    const tokenTx = await token.approve(this.contracts.AMM, tokenAmount);
    await tokenTx.wait();

    // Create pool
    const tx = await this.ammSigner.createPool(
      credentialIdBytes32,
      tokenAddress,
      tokenAmount,
      usdcAmount
    );

    return await tx.wait();
  }

  // Trading functions
  async buyTokens(credentialId, usdcAmount, slippageTolerance = 0.005, deadline = null) {
    if (!this.signer) throw new Error('Signer required for this operation');

    // TEMPORARY: Just mint some test USDC to see a transaction go through
    // This bypasses the actual token trading since the token doesn't exist yet
    console.log(`Mock buy operation: minting ${usdcAmount} USDC instead of buying tokens`);

    // Mint some test USDC (convert the usdcAmount to a reasonable test amount)
    const testMintAmount = Math.min(parseFloat(this.formatUSDC(usdcAmount)) || 10, 100);
    const receipt = await this.mintTestUSDC(testMintAmount);

    console.log('Test transaction completed:', receipt.transactionHash);
    return receipt;

    // ORIGINAL CODE (commented out until token exists):
    /*
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;

    // Get quote
    const quote = await this.getBuyQuote(credentialIdBytes32, usdcAmount);
    const minTokensOut = quote.tokensOut * BigInt(Math.floor((1 - slippageTolerance) * 10000)) / BigInt(10000);

    // Set deadline (1 hour from now if not provided)
    const txDeadline = deadline || Math.floor(Date.now() / 1000) + 3600;

    // Approve USDC
    await this.approveUSDC(this.contracts.AMM, usdcAmount);

    // Execute swap
    const tx = await this.ammSigner.swapUSDCForTokens(
      credentialIdBytes32,
      usdcAmount,
      minTokensOut,
      txDeadline
    );

    return await tx.wait();
    */
  }

  async sellTokens(credentialId, tokenAmount, slippageTolerance = 0.005, deadline = null) {
    if (!this.signer) throw new Error('Signer required for this operation');

    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;

    // Get token address
    const tokenAddress = await this.amm.getTokenByCredential(credentialIdBytes32);
    const token = new ethers.Contract(tokenAddress, contractABIs.CredentialToken, this.signer);

    // Get quote
    const quote = await this.getSellQuote(credentialIdBytes32, tokenAmount);
    const minUsdcOut = quote.usdcOut * BigInt(Math.floor((1 - slippageTolerance) * 10000)) / BigInt(10000);

    // Set deadline
    const txDeadline = deadline || Math.floor(Date.now() / 1000) + 3600;

    // Approve tokens
    const approveTx = await token.approve(this.contracts.AMM, tokenAmount);
    await approveTx.wait();

    // Execute swap
    const tx = await this.ammSigner.swapTokensForUSDC(
      credentialIdBytes32,
      tokenAmount,
      minUsdcOut,
      txDeadline
    );

    return await tx.wait();
  }

  // Price and quote functions
  async getTokenPrice(credentialId) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    return await this.amm.getTokenPrice(credentialIdBytes32);
  }

  async getBuyQuote(credentialId, usdcAmount) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    const [tokensOut, fee] = await this.amm.getAmountOut(
      credentialIdBytes32,
      this.contracts.USDC,
      usdcAmount
    );
    return { tokensOut, fee, effectivePrice: usdcAmount * ethers.parseEther('1') / tokensOut };
  }

  async getSellQuote(credentialId, tokenAmount) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    const tokenAddress = await this.amm.getTokenByCredential(credentialIdBytes32);
    const [usdcOut, fee] = await this.amm.getAmountOut(
      credentialIdBytes32,
      tokenAddress,
      tokenAmount
    );
    return { usdcOut, fee, effectivePrice: usdcOut * ethers.parseEther('1') / tokenAmount };
  }

  // Pool information
  async getPoolInfo(credentialId) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    const pool = await this.amm.getPool(credentialIdBytes32);
    return {
      tokenAddress: pool.credentialToken,
      tokenReserves: pool.tokenReserves,
      usdcReserves: pool.usdcReserves,
      totalLiquidity: pool.totalLiquidity,
      lastPrice: pool.lastPrice,
      isActive: pool.isActive
    };
  }

  async getTokenInfo(tokenAddress) {
    const token = new ethers.Contract(tokenAddress, contractABIs.CredentialToken, this.provider);
    const [name, symbol, decimals, totalSupply, credentialId, creator] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.getCredentialId(),
      token.getCreator()
    ]);

    return { name, symbol, decimals, totalSupply, credentialId, creator };
  }

  // Liquidity operations
  async addLiquidity(credentialId, tokenAmount, usdcAmount, slippageTolerance = 0.005, deadline = null) {
    if (!this.signer) throw new Error('Signer required for this operation');

    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;

    const tokenAddress = await this.amm.getTokenByCredential(credentialIdBytes32);
    const token = new ethers.Contract(tokenAddress, contractABIs.CredentialToken, this.signer);

    // Calculate minimum liquidity
    const minLiquidity = 0; // For simplicity, set to 0. In production, calculate based on slippage

    // Set deadline
    const txDeadline = deadline || Math.floor(Date.now() / 1000) + 3600;

    // Approve tokens
    await this.approveUSDC(this.contracts.AMM, usdcAmount);
    const tokenTx = await token.approve(this.contracts.AMM, tokenAmount);
    await tokenTx.wait();

    // Add liquidity
    const tx = await this.ammSigner.addLiquidity(
      credentialIdBytes32,
      tokenAmount,
      usdcAmount,
      minLiquidity,
      txDeadline
    );

    return await tx.wait();
  }

  // Revenue and rewards
  async getPendingRewards(credentialId, userAddress) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    return await this.feeCollector.getPendingRewards(credentialIdBytes32, userAddress);
  }

  async claimRewards(credentialId) {
    if (!this.signer) throw new Error('Signer required for this operation');
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    const tx = await this.feeCollectorSigner.claimRewards(credentialIdBytes32);
    return await tx.wait();
  }

  async getRevenuePool(credentialId) {
    // Convert credentialId to bytes32 if it's a string
    const credentialIdBytes32 = typeof credentialId === 'string' && !credentialId.startsWith('0x')
      ? this.stringToBytes32(credentialId)
      : credentialId;
    return await this.feeCollector.getRevenuePool(credentialIdBytes32);
  }

  // Event listeners
  setupEventListeners(callbacks = {}) {
    if (callbacks.onTokenCreated) {
      this.factory.on('TokenCreated', callbacks.onTokenCreated);
    }

    if (callbacks.onSwap) {
      this.amm.on('Swap', callbacks.onSwap);
    }

    if (callbacks.onPoolCreated) {
      this.amm.on('PoolCreated', callbacks.onPoolCreated);
    }

    if (callbacks.onLiquidityAdded) {
      this.amm.on('LiquidityAdded', callbacks.onLiquidityAdded);
    }

    if (callbacks.onRewardsClaimed) {
      this.feeCollector.on('RewardsClaimed', callbacks.onRewardsClaimed);
    }
  }

  removeAllListeners() {
    this.factory.removeAllListeners();
    this.amm.removeAllListeners();
    this.feeCollector.removeAllListeners();
  }

  // Utility for error handling
  handleError(error) {
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
        case 'OnlyMinter()':
          return 'Only authorized minters can perform this action';
        default:
          return `Contract error: ${error.reason}`;
      }
    }
    return error.message || 'Unknown error occurred';
  }
}

// Export singleton instance and class
let marketplaceInstance = null;

export const initializeMarketplace = (provider, signer = null, chainId = 5151) => {
  marketplaceInstance = new CredentialMarketplace(provider, signer, chainId);
  return marketplaceInstance;
};

export const getMarketplace = () => {
  if (!marketplaceInstance) {
    throw new Error('Marketplace not initialized. Call initializeMarketplace first.');
  }
  return marketplaceInstance;
};

export { CredentialMarketplace, MOCA_DEVNET };
export default CredentialMarketplace;