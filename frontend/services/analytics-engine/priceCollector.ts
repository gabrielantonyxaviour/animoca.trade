import { ethers } from 'ethers';

/**
 * Price Data Collection Service
 * Collects price data from pool events and submits to oracle
 */
export class PriceCollector {
  private provider: ethers.Provider;
  private oracleContract: ethers.Contract;
  private poolContracts: Map<string, ethers.Contract>;
  private collectionInterval: NodeJS.Timer | null = null;

  constructor(
    providerUrl: string,
    oracleAddress: string,
    oracleABI: any[],
    private signerPrivateKey: string
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    const signer = new ethers.Wallet(signerPrivateKey, this.provider);
    this.oracleContract = new ethers.Contract(oracleAddress, oracleABI, signer);
    this.poolContracts = new Map();
  }

  /**
   * Start collecting price data
   */
  async start(intervalMs: number = 60000) {
    console.log('Starting price collection service...');

    // Initial collection
    await this.collectAndUpdatePrices();

    // Set up periodic collection
    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectAndUpdatePrices();
      } catch (error) {
        console.error('Error collecting prices:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop collecting price data
   */
  stop() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      console.log('Price collection service stopped');
    }
  }

  /**
   * Add a pool to monitor
   */
  addPool(poolAddress: string, poolABI: any[]) {
    const poolContract = new ethers.Contract(
      poolAddress,
      poolABI,
      this.provider
    );
    this.poolContracts.set(poolAddress, poolContract);

    // Set up event listeners
    this.setupPoolEventListeners(poolContract);
  }

  /**
   * Set up event listeners for pool
   */
  private setupPoolEventListeners(poolContract: ethers.Contract) {
    // Listen for Swap events
    poolContract.on('Swap', async (sender, amount0In, amount1In, amount0Out, amount1Out, to, event) => {
      console.log('Swap event detected:', {
        pool: await poolContract.getAddress(),
        block: event.blockNumber,
      });

      // Process swap event immediately
      await this.processSwapEvent(poolContract, event);
    });

    // Listen for Sync events (liquidity changes)
    poolContract.on('Sync', async (reserve0, reserve1, event) => {
      console.log('Sync event detected:', {
        pool: await poolContract.getAddress(),
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
      });

      await this.processSyncEvent(poolContract, reserve0, reserve1);
    });
  }

  /**
   * Process a swap event
   */
  private async processSwapEvent(poolContract: ethers.Contract, event: any) {
    try {
      const poolAddress = await poolContract.getAddress();
      const token0 = await poolContract.token0();

      // Get current reserves
      const reserves = await poolContract.getReserves();
      const reserve0 = reserves[0];
      const reserve1 = reserves[1];

      // Calculate price
      const price = this.calculatePrice(reserve0, reserve1);

      // Get block for timestamp
      const block = await this.provider.getBlock(event.blockNumber);

      // Calculate volume (simplified - would need to track over time)
      const volume = ethers.parseEther('1000'); // Mock volume

      // Update oracle
      await this.updateOraclePrice(token0, price, volume, reserve1);

    } catch (error) {
      console.error('Error processing swap event:', error);
    }
  }

  /**
   * Process a sync event (liquidity update)
   */
  private async processSyncEvent(poolContract: ethers.Contract, reserve0: bigint, reserve1: bigint) {
    try {
      const token0 = await poolContract.token0();
      const price = this.calculatePrice(reserve0, reserve1);

      // Update liquidity data in oracle
      await this.updateOraclePrice(token0, price, 0n, reserve1);

    } catch (error) {
      console.error('Error processing sync event:', error);
    }
  }

  /**
   * Calculate price from reserves
   */
  private calculatePrice(reserve0: bigint, reserve1: bigint): bigint {
    if (reserve0 === 0n) return 0n;
    return (reserve1 * ethers.parseEther('1')) / reserve0;
  }

  /**
   * Collect prices from all pools and update oracle
   */
  private async collectAndUpdatePrices() {
    const tokens: string[] = [];
    const prices: bigint[] = [];
    const volumes: bigint[] = [];
    const liquidities: bigint[] = [];

    for (const [poolAddress, poolContract] of this.poolContracts) {
      try {
        const token0 = await poolContract.token0();
        const reserves = await poolContract.getReserves();
        const reserve0 = reserves[0];
        const reserve1 = reserves[1];

        const price = this.calculatePrice(reserve0, reserve1);

        // Mock volume calculation (would need historical data)
        const volume = await this.calculate24hVolume(poolAddress);

        tokens.push(token0);
        prices.push(price);
        volumes.push(volume);
        liquidities.push(reserve1);

      } catch (error) {
        console.error(`Error collecting data from pool ${poolAddress}:`, error);
      }
    }

    if (tokens.length > 0) {
      await this.batchUpdateOracle(tokens, prices, volumes, liquidities);
    }
  }

  /**
   * Update oracle with price data
   */
  private async updateOraclePrice(
    token: string,
    price: bigint,
    volume: bigint,
    liquidity: bigint
  ) {
    try {
      const tx = await this.oracleContract.updatePrice(
        token,
        price,
        volume,
        liquidity
      );
      await tx.wait();
      console.log(`Oracle updated for token ${token}`);
    } catch (error) {
      console.error('Error updating oracle:', error);
    }
  }

  /**
   * Batch update oracle prices
   */
  private async batchUpdateOracle(
    tokens: string[],
    prices: bigint[],
    volumes: bigint[],
    liquidities: bigint[]
  ) {
    try {
      const tx = await this.oracleContract.batchUpdatePrices(
        tokens,
        prices,
        volumes,
        liquidities
      );
      await tx.wait();
      console.log(`Batch oracle update completed for ${tokens.length} tokens`);
    } catch (error) {
      console.error('Error batch updating oracle:', error);
    }
  }

  /**
   * Calculate 24h volume for a pool (mock implementation)
   */
  private async calculate24hVolume(poolAddress: string): Promise<bigint> {
    // In production, this would query historical events
    // For now, return mock data
    return ethers.parseEther(Math.floor(Math.random() * 10000).toString());
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: string) {
    const poolContract = this.poolContracts.get(poolAddress);
    if (!poolContract) {
      throw new Error('Pool not found');
    }

    const reserves = await poolContract.getReserves();
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();

    return {
      token0,
      token1,
      reserve0: reserves[0].toString(),
      reserve1: reserves[1].toString(),
      price: this.calculatePrice(reserves[0], reserves[1]).toString(),
    };
  }
}