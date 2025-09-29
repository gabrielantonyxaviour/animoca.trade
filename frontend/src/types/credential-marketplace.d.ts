// Type declarations for credential-marketplace service

import { ethers } from 'ethers';

export interface TokenCreateResult {
  tokenAddress: string;
  credentialId: string;
  receipt: ethers.TransactionReceipt;
}

export interface TradeQuote {
  tokensOut: bigint;
  fee: bigint;
  effectivePrice: bigint;
}

export interface SellQuote {
  usdcOut: bigint;
  fee: bigint;
  effectivePrice: bigint;
}

export interface PoolInfo {
  tokenAddress: string;
  tokenReserves: bigint;
  usdcReserves: bigint;
  totalLiquidity: bigint;
  lastPrice: bigint;
  isActive: boolean;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  credentialId: string;
  creator: string;
}

export interface EventCallbacks {
  onTokenCreated?: (...args: any[]) => void;
  onSwap?: (...args: any[]) => void;
  onPoolCreated?: (...args: any[]) => void;
  onLiquidityAdded?: (...args: any[]) => void;
  onRewardsClaimed?: (...args: any[]) => void;
}

export declare class CredentialMarketplace {
  provider: ethers.Provider;
  signer: ethers.Signer | null;
  chainId: number;
  contracts: {
    USDC: string;
    FACTORY: string;
    FEE_COLLECTOR: string;
    AMM: string;
  };
  usdc: ethers.Contract;
  factory: ethers.Contract;
  feeCollector: ethers.Contract;
  amm: ethers.Contract;
  usdcSigner?: ethers.Contract;
  factorySigner?: ethers.Contract;
  feeCollectorSigner?: ethers.Contract;
  ammSigner?: ethers.Contract;

  constructor(provider: ethers.Provider, signer?: ethers.Signer | null, chainId?: number);

  setSigner(signer: ethers.Signer): void;

  // Utility functions
  stringToBytes32(str: string): string;
  bytes32ToString(bytes32: string): string;
  formatUSDC(amount: bigint): string;
  parseUSDC(amount: string | number): bigint;
  formatTokens(amount: bigint): string;
  parseTokens(amount: string | number): bigint;

  // USDC operations
  getUSDCBalance(address: string): Promise<bigint>;
  mintTestUSDC(amount: number): Promise<ethers.TransactionReceipt>;
  approveUSDC(spender: string, amount: bigint): Promise<ethers.TransactionReceipt>;

  // Token creation
  createCredentialToken(
    credentialId: string,
    name: string,
    symbol: string,
    emissionRate: number,
    maxSupply: number
  ): Promise<TokenCreateResult>;

  // Market operations
  createMarketWithLiquidity(
    credentialId: string,
    tokenAddress: string,
    tokenAmount: bigint,
    usdcAmount: bigint
  ): Promise<ethers.TransactionReceipt>;

  // Trading functions
  buyTokens(
    credentialId: string,
    usdcAmount: bigint,
    slippageTolerance?: number,
    deadline?: number | null
  ): Promise<ethers.TransactionReceipt>;

  sellTokens(
    credentialId: string,
    tokenAmount: bigint,
    slippageTolerance?: number,
    deadline?: number | null
  ): Promise<ethers.TransactionReceipt>;

  // Price and quote functions
  getTokenPrice(credentialId: string): Promise<bigint>;
  getBuyQuote(credentialId: string, usdcAmount: bigint): Promise<TradeQuote>;
  getSellQuote(credentialId: string, tokenAmount: bigint): Promise<SellQuote>;

  // Pool information
  getPoolInfo(credentialId: string): Promise<PoolInfo>;
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;

  // Liquidity operations
  addLiquidity(
    credentialId: string,
    tokenAmount: bigint,
    usdcAmount: bigint,
    slippageTolerance?: number,
    deadline?: number | null
  ): Promise<ethers.TransactionReceipt>;

  // Revenue and rewards
  getPendingRewards(credentialId: string, userAddress: string): Promise<bigint>;
  claimRewards(credentialId: string): Promise<ethers.TransactionReceipt>;
  getRevenuePool(credentialId: string): Promise<bigint>;

  // Event listeners
  setupEventListeners(callbacks?: EventCallbacks): void;
  removeAllListeners(): void;

  // Utility for error handling
  handleError(error: any): string;
}

export declare const MOCA_DEVNET: {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
};

export declare function initializeMarketplace(
  provider: ethers.Provider,
  signer?: ethers.Signer | null,
  chainId?: number
): CredentialMarketplace;

export declare function getMarketplace(): CredentialMarketplace;

export default CredentialMarketplace;