import { ethers } from 'ethers';

/**
 * Data Aggregation Service
 * Aggregates data from multiple sources for dashboard displays
 */
export class DataAggregator {
  private provider: ethers.Provider;
  private oracleContract: ethers.Contract;
  private poolContracts: Map<string, ethers.Contract>;
  private tokenContracts: Map<string, ethers.Contract>;

  constructor(
    providerUrl: string,
    oracleAddress: string,
    oracleABI: any[]
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.oracleContract = new ethers.Contract(oracleAddress, oracleABI, this.provider);
    this.poolContracts = new Map();
    this.tokenContracts = new Map();
  }

  /**
   * Add pool contract for monitoring
   */
  addPoolContract(poolAddress: string, poolABI: any[]) {
    this.poolContracts.set(
      poolAddress,
      new ethers.Contract(poolAddress, poolABI, this.provider)
    );
  }

  /**
   * Add token contract for monitoring
   */
  addTokenContract(tokenAddress: string, tokenABI: any[]) {
    this.tokenContracts.set(
      tokenAddress,
      new ethers.Contract(tokenAddress, tokenABI, this.provider)
    );
  }

  /**
   * Get market overview data
   */
  async getMarketOverview(): Promise<{
    totalValueLocked: bigint;
    totalVolume24h: bigint;
    totalVolume7d: bigint;
    activeTokens: number;
    totalCredentials: number;
    averageReputation: number;
    topGainer: { symbol: string; change: number };
    topLoser: { symbol: string; change: number };
  }> {
    let totalValueLocked = 0n;
    let totalVolume24h = 0n;
    let totalVolume7d = 0n;
    const activeTokens = this.tokenContracts.size;

    // Aggregate TVL from all pools
    for (const [poolAddress, poolContract] of this.poolContracts) {
      try {
        const reserves = await poolContract.getReserves();
        totalValueLocked += reserves[1]; // ETH reserve
      } catch (error) {
        console.error(`Error getting reserves for pool ${poolAddress}:`, error);
      }
    }

    // Get volume data from oracle
    for (const [tokenAddress] of this.tokenContracts) {
      try {
        const volume24h = await this.oracleContract.getVolumeData(tokenAddress, 24 * 60 * 60);
        const volume7d = await this.oracleContract.getVolumeData(tokenAddress, 7 * 24 * 60 * 60);
        totalVolume24h += volume24h.volume;
        totalVolume7d += volume7d.volume;
      } catch (error) {
        console.error(`Error getting volume for token ${tokenAddress}:`, error);
      }
    }

    // Get top credentials for average reputation
    const topCredentials = await this.oracleContract.getTopCredentials(100);
    const totalScore = topCredentials.scores.reduce(
      (sum: bigint, score: bigint) => sum + score,
      0n
    );
    const averageReputation = topCredentials.scores.length > 0
      ? Number(totalScore / BigInt(topCredentials.scores.length))
      : 0;

    // Calculate top gainers/losers (mock for now)
    const topGainer = { symbol: 'MIT-CS', change: 25.5 };
    const topLoser = { symbol: 'BASIC-CERT', change: -12.3 };

    return {
      totalValueLocked,
      totalVolume24h,
      totalVolume7d,
      activeTokens,
      totalCredentials: topCredentials.credentialIds.length,
      averageReputation,
      topGainer,
      topLoser,
    };
  }

  /**
   * Get token analytics data
   */
  async getTokenAnalytics(tokenAddress: string): Promise<{
    price: bigint;
    twap30d: bigint;
    volume24h: bigint;
    liquidity: bigint;
    marketCap: bigint;
    priceChange24h: number;
    holders: number;
    trades24h: number;
  }> {
    // Get current price
    const priceData = await this.oracleContract.getCurrentPrice(tokenAddress);
    const price = priceData.price;

    // Get TWAP
    const twap30d = await this.oracleContract.getTWAP(tokenAddress, 30 * 24 * 60 * 60);

    // Get volume data
    const volumeData = await this.oracleContract.getVolumeData(tokenAddress, 24 * 60 * 60);
    const volume24h = volumeData.volume;
    const trades24h = volumeData.trades;

    // Get liquidity data
    const liquidityData = await this.oracleContract.getLiquidityData(tokenAddress);
    const liquidity = liquidityData.totalLiquidity;

    // Get market cap
    const marketCapData = await this.oracleContract.getMarketCap(tokenAddress);
    const marketCap = marketCapData.marketCap;

    // Calculate 24h price change (mock)
    const priceChange24h = Math.random() * 40 - 20;

    // Get holder count (would need to query token contract)
    const holders = 1000 + Math.floor(Math.random() * 500);

    return {
      price,
      twap30d,
      volume24h,
      liquidity,
      marketCap,
      priceChange24h,
      holders,
      trades24h: Number(trades24h),
    };
  }

  /**
   * Get volume distribution data
   */
  async getVolumeDistribution(): Promise<{
    hourlyVolumes: Array<{ hour: number; volume: bigint }>;
    topTokensByVolume: Array<{ token: string; volume: bigint; percentage: number }>;
    volumeTrend: number;
  }> {
    const hourlyVolumes: Array<{ hour: number; volume: bigint }> = [];
    const tokenVolumes: Map<string, bigint> = new Map();
    let totalVolume = 0n;

    // Aggregate volume data
    for (const [tokenAddress] of this.tokenContracts) {
      try {
        const volumeData = await this.oracleContract.getVolumeData(tokenAddress, 24 * 60 * 60);
        tokenVolumes.set(tokenAddress, volumeData.volume);
        totalVolume += volumeData.volume;
      } catch (error) {
        console.error(`Error getting volume for ${tokenAddress}:`, error);
      }
    }

    // Generate hourly distribution (mock)
    for (let hour = 0; hour < 24; hour++) {
      hourlyVolumes.push({
        hour,
        volume: ethers.parseEther(Math.floor(Math.random() * 100).toString()),
      });
    }

    // Calculate top tokens by volume
    const topTokensByVolume = Array.from(tokenVolumes.entries())
      .sort((a, b) => (Number(b[1]) - Number(a[1])))
      .slice(0, 5)
      .map(([token, volume]) => ({
        token,
        volume,
        percentage: totalVolume > 0n ? Number((volume * 100n) / totalVolume) : 0,
      }));

    // Calculate volume trend (mock)
    const volumeTrend = 15.5;

    return {
      hourlyVolumes,
      topTokensByVolume,
      volumeTrend,
    };
  }

  /**
   * Get liquidity pool analytics
   */
  async getPoolAnalytics(poolAddress: string): Promise<{
    token0: string;
    token1: string;
    reserve0: bigint;
    reserve1: bigint;
    totalSupply: bigint;
    price0: bigint;
    price1: bigint;
    volume24h: bigint;
    fees24h: bigint;
    apy: number;
  }> {
    const poolContract = this.poolContracts.get(poolAddress);
    if (!poolContract) {
      throw new Error('Pool not found');
    }

    // Get basic pool data
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    const reserves = await poolContract.getReserves();
    const totalSupply = await poolContract.totalSupply();

    // Calculate prices
    const price0 = reserves[1] > 0n ? (reserves[0] * ethers.parseEther('1')) / reserves[1] : 0n;
    const price1 = reserves[0] > 0n ? (reserves[1] * ethers.parseEther('1')) / reserves[0] : 0n;

    // Get volume from oracle
    const volumeData = await this.oracleContract.getVolumeData(token0, 24 * 60 * 60);
    const volume24h = volumeData.volume;

    // Calculate fees (0.3% of volume)
    const fees24h = (volume24h * 3n) / 1000n;

    // Calculate APY (simplified)
    const yearlyFees = fees24h * 365n;
    const poolValue = reserves[1] * 2n; // Approximate pool value
    const apy = poolValue > 0n ? Number((yearlyFees * 100n) / poolValue) : 0;

    return {
      token0,
      token1,
      reserve0: reserves[0],
      reserve1: reserves[1],
      totalSupply,
      price0,
      price1,
      volume24h,
      fees24h,
      apy,
    };
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(
    tokenAddress: string,
    startTime: number,
    endTime: number
  ): Promise<{
    prices: Array<{ timestamp: number; price: bigint }>;
    volumes: Array<{ timestamp: number; volume: bigint }>;
  }> {
    const priceHistory = await this.oracleContract.getPriceHistory(
      tokenAddress,
      startTime,
      endTime
    );

    const prices = priceHistory.timestamps.map((timestamp: bigint, index: number) => ({
      timestamp: Number(timestamp),
      price: priceHistory.prices[index],
    }));

    // Volume data would need more complex aggregation
    const volumes = prices.map(p => ({
      timestamp: p.timestamp,
      volume: ethers.parseEther(Math.floor(Math.random() * 1000).toString()),
    }));

    return { prices, volumes };
  }

  /**
   * Generate market summary report
   */
  async generateMarketSummary(): Promise<string> {
    const overview = await this.getMarketOverview();
    const volumeDist = await this.getVolumeDistribution();

    const summary = `
Market Summary Report
=====================
Total Value Locked: ${ethers.formatEther(overview.totalValueLocked)} ETH
24h Volume: ${ethers.formatEther(overview.totalVolume24h)} ETH
7d Volume: ${ethers.formatEther(overview.totalVolume7d)} ETH
Active Tokens: ${overview.activeTokens}
Total Credentials: ${overview.totalCredentials}
Average Reputation: ${overview.averageReputation}

Top Gainer: ${overview.topGainer.symbol} (+${overview.topGainer.change}%)
Top Loser: ${overview.topLoser.symbol} (${overview.topLoser.change}%)

Volume Trend: ${volumeDist.volumeTrend > 0 ? '+' : ''}${volumeDist.volumeTrend}%

Top Tokens by Volume:
${volumeDist.topTokensByVolume.map((t, i) =>
  `${i + 1}. ${t.token.slice(0, 10)}... - ${ethers.formatEther(t.volume)} ETH (${t.percentage}%)`
).join('\n')}
`;

    return summary;
  }
}