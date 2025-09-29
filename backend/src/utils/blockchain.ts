import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORK_CONFIG, CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../../config/contracts.js';
import { env } from '../../config/environment.js';
import { createLogger } from './logger.js';

const logger = createLogger('blockchain');

// Create providers
export const provider = new ethers.JsonRpcProvider(env.MOCA_DEVNET_RPC_URL);

export const publicClient = createPublicClient({
  chain: {
    id: NETWORK_CONFIG.mocaDevnet.chainId,
    name: NETWORK_CONFIG.mocaDevnet.name,
    network: 'moca-devnet',
    nativeCurrency: {
      decimals: 18,
      name: 'MOCA',
      symbol: 'MOCA',
    },
    rpcUrls: {
      default: {
        http: [NETWORK_CONFIG.mocaDevnet.rpcUrl],
      },
      public: {
        http: [NETWORK_CONFIG.mocaDevnet.rpcUrl],
      },
    },
  },
  transport: http(env.MOCA_DEVNET_RPC_URL),
});

// Wallet client (for when we need to send transactions)
export function createWalletClientFromPrivateKey(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain: {
      id: NETWORK_CONFIG.mocaDevnet.chainId,
      name: NETWORK_CONFIG.mocaDevnet.name,
      network: 'moca-devnet',
      nativeCurrency: {
        decimals: 18,
        name: 'MOCA',
        symbol: 'MOCA',
      },
      rpcUrls: {
        default: {
          http: [NETWORK_CONFIG.mocaDevnet.rpcUrl],
        },
        public: {
          http: [NETWORK_CONFIG.mocaDevnet.rpcUrl],
        },
      },
    },
    transport: http(env.MOCA_DEVNET_RPC_URL),
  });
}

// Contract interfaces
export class ContractInteraction {
  static async createCredentialToken(
    walletClient: any,
    name: string,
    symbol: string,
    totalSupply: string
  ): Promise<{ hash: string; tokenAddress?: string }> {
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.CREDENTIAL_TOKEN_FACTORY as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.CREDENTIAL_TOKEN_FACTORY),
        functionName: 'createCredentialToken',
        args: [name, symbol, BigInt(totalSupply)],
      });

      logger.info('Token creation transaction sent', { hash, name, symbol, totalSupply });

      // Wait for transaction receipt to get the token address
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse logs to find the token address
      const tokenCreatedLog = receipt.logs.find(log =>
        log.topics[0] === ethers.id('TokenCreated(address,bytes32,string,string)')
      );

      let tokenAddress: string | undefined;
      if (tokenCreatedLog && tokenCreatedLog.topics[1]) {
        tokenAddress = ethers.getAddress('0x' + tokenCreatedLog.topics[1].slice(26));
      }

      return { hash, tokenAddress };
    } catch (error) {
      logger.error('Failed to create credential token', error);
      throw error;
    }
  }

  static async getTokenByCredential(credentialHash: string): Promise<string | null> {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.CREDENTIAL_TOKEN_FACTORY as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.CREDENTIAL_TOKEN_FACTORY),
        functionName: 'getTokenByCredential',
        args: [credentialHash as `0x${string}`],
      });

      return result as string;
    } catch (error) {
      logger.error('Failed to get token by credential', error);
      return null;
    }
  }

  static async generatePassiveTokens(walletClient: any): Promise<string> {
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.PASSIVE_TOKEN_GENERATOR as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.PASSIVE_TOKEN_GENERATOR),
        functionName: 'generateTokens',
      });

      logger.info('Passive token generation transaction sent', { hash });
      return hash;
    } catch (error) {
      logger.error('Failed to generate passive tokens', error);
      throw error;
    }
  }

  static async getLastGenerationTime(): Promise<number> {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.PASSIVE_TOKEN_GENERATOR as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.PASSIVE_TOKEN_GENERATOR),
        functionName: 'getLastGenerationTime',
      });

      return Number(result);
    } catch (error) {
      logger.error('Failed to get last generation time', error);
      return 0;
    }
  }

  static async updateReputation(
    walletClient: any,
    userAddress: string,
    score: number
  ): Promise<string> {
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.REPUTATION_ORACLE as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.REPUTATION_ORACLE),
        functionName: 'updateReputation',
        args: [userAddress as `0x${string}`, BigInt(score)],
      });

      logger.info('Reputation update transaction sent', { hash, userAddress, score });
      return hash;
    } catch (error) {
      logger.error('Failed to update reputation', error);
      throw error;
    }
  }

  static async getReputation(userAddress: string): Promise<number> {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.REPUTATION_ORACLE as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.REPUTATION_ORACLE),
        functionName: 'getReputation',
        args: [userAddress as `0x${string}`],
      });

      return Number(result);
    } catch (error) {
      logger.error('Failed to get reputation', error);
      return 0;
    }
  }

  static async createPool(
    walletClient: any,
    tokenA: string,
    tokenB: string,
    fee: number
  ): Promise<{ hash: string; poolAddress?: string }> {
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.POOL_FACTORY as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.POOL_FACTORY),
        functionName: 'createPool',
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`, fee],
      });

      logger.info('Pool creation transaction sent', { hash, tokenA, tokenB, fee });

      // Wait for transaction receipt to get the pool address
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse logs to find the pool address
      const poolCreatedLog = receipt.logs.find(log =>
        log.topics[0] === ethers.id('PoolCreated(address,address,uint24,address)')
      );

      let poolAddress: string | undefined;
      if (poolCreatedLog && poolCreatedLog.data) {
        // Pool address is in the data field for this event
        poolAddress = ethers.getAddress('0x' + poolCreatedLog.data.slice(26, 66));
      }

      return { hash, poolAddress };
    } catch (error) {
      logger.error('Failed to create pool', error);
      throw error;
    }
  }

  static async getPool(tokenA: string, tokenB: string, fee: number): Promise<string | null> {
    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.POOL_FACTORY as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.POOL_FACTORY),
        functionName: 'getPool',
        args: [tokenA as `0x${string}`, tokenB as `0x${string}`, fee],
      });

      return result as string;
    } catch (error) {
      logger.error('Failed to get pool', error);
      return null;
    }
  }
}

// ERC20 Token utilities
export class TokenUtils {
  static async getTokenInfo(tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  } | null> {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(CONTRACT_ABIS.ERC20),
          functionName: 'name',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(CONTRACT_ABIS.ERC20),
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(CONTRACT_ABIS.ERC20),
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: parseAbi(CONTRACT_ABIS.ERC20),
          functionName: 'totalSupply',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
        totalSupply: (totalSupply as bigint).toString(),
      };
    } catch (error) {
      logger.error('Failed to get token info', { tokenAddress, error });
      return null;
    }
  }

  static async getBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.ERC20),
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      });

      return (balance as bigint).toString();
    } catch (error) {
      logger.error('Failed to get token balance', { tokenAddress, userAddress, error });
      return '0';
    }
  }

  static async transfer(
    walletClient: any,
    tokenAddress: string,
    to: string,
    amount: string
  ): Promise<string> {
    try {
      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(CONTRACT_ABIS.ERC20),
        functionName: 'transfer',
        args: [to as `0x${string}`, BigInt(amount)],
      });

      logger.info('Token transfer transaction sent', { hash, tokenAddress, to, amount });
      return hash;
    } catch (error) {
      logger.error('Failed to transfer tokens', error);
      throw error;
    }
  }
}

// Blockchain monitoring utilities
export class BlockchainMonitor {
  static async getCurrentBlock(): Promise<number> {
    try {
      const blockNumber = await publicClient.getBlockNumber();
      return Number(blockNumber);
    } catch (error) {
      logger.error('Failed to get current block', error);
      return 0;
    }
  }

  static async getTransactionReceipt(hash: string) {
    try {
      return await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
    } catch (error) {
      logger.error('Failed to get transaction receipt', { hash, error });
      return null;
    }
  }

  static async waitForTransaction(hash: string, timeout = 30000) {
    try {
      return await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout,
      });
    } catch (error) {
      logger.error('Failed to wait for transaction', { hash, error });
      throw error;
    }
  }

  static async getLogs(fromBlock: number, toBlock: number, addresses?: string[]) {
    try {
      return await publicClient.getLogs({
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        address: addresses as `0x${string}`[],
      });
    } catch (error) {
      logger.error('Failed to get logs', { fromBlock, toBlock, addresses, error });
      return [];
    }
  }
}

// Utility functions
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function formatTokenAmount(amount: string, decimals: number): string {
  return ethers.formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number): string {
  return ethers.parseUnits(amount, decimals).toString();
}

export function generateRandomPrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}