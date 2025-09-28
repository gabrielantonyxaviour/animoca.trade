import { ethers } from 'ethers';

/**
 * Reputation Calculation Engine
 * Calculates and updates reputation scores for credentials
 */
export class ReputationEngine {
  private provider: ethers.Provider;
  private oracleContract: ethers.Contract;
  private credentialTokenMap: Map<string, string>; // credentialId -> tokenAddress
  private calculationInterval: NodeJS.Timer | null = null;

  constructor(
    providerUrl: string,
    oracleAddress: string,
    oracleABI: any[],
    private signerPrivateKey: string
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    const signer = new ethers.Wallet(signerPrivateKey, this.provider);
    this.oracleContract = new ethers.Contract(oracleAddress, oracleABI, signer);
    this.credentialTokenMap = new Map();
  }

  /**
   * Start reputation calculation engine
   */
  async start(intervalMs: number = 3600000) { // Default: hourly
    console.log('Starting reputation calculation engine...');

    // Initial calculation
    await this.calculateAllReputations();

    // Set up periodic calculation
    this.calculationInterval = setInterval(async () => {
      try {
        await this.calculateAllReputations();
      } catch (error) {
        console.error('Error calculating reputations:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop reputation calculation engine
   */
  stop() {
    if (this.calculationInterval) {
      clearInterval(this.calculationInterval);
      this.calculationInterval = null;
      console.log('Reputation calculation engine stopped');
    }
  }

  /**
   * Register a credential-token mapping
   */
  registerCredential(credentialId: string, tokenAddress: string) {
    this.credentialTokenMap.set(credentialId, tokenAddress);
    console.log(`Registered credential ${credentialId} with token ${tokenAddress}`);
  }

  /**
   * Calculate reputation for all registered credentials
   */
  private async calculateAllReputations() {
    console.log('Calculating reputation scores for all credentials...');

    for (const [credentialId, tokenAddress] of this.credentialTokenMap) {
      try {
        await this.updateCredentialReputation(credentialId, tokenAddress);
      } catch (error) {
        console.error(`Error updating reputation for ${credentialId}:`, error);
      }
    }
  }

  /**
   * Update reputation score for a specific credential
   */
  private async updateCredentialReputation(credentialId: string, tokenAddress: string) {
    try {
      const tx = await this.oracleContract.updateReputationScore(
        credentialId,
        tokenAddress
      );
      await tx.wait();
      console.log(`Reputation updated for credential ${credentialId}`);
    } catch (error) {
      console.error(`Error updating reputation for ${credentialId}:`, error);
    }
  }

  /**
   * Get reputation score for a credential
   */
  async getReputationScore(credentialId: string): Promise<{
    score: number;
    lastUpdated: Date;
  }> {
    const result = await this.oracleContract.getReputationScore(credentialId);
    return {
      score: Number(result.score),
      lastUpdated: new Date(Number(result.lastUpdated) * 1000),
    };
  }

  /**
   * Get reputation ranking for a credential
   */
  async getReputationRanking(credentialId: string): Promise<{
    rank: number;
    totalCredentials: number;
  }> {
    const result = await this.oracleContract.getReputationRanking(credentialId);
    return {
      rank: Number(result.rank),
      totalCredentials: Number(result.totalCredentials),
    };
  }

  /**
   * Get top credentials by reputation
   */
  async getTopCredentials(limit: number = 10): Promise<Array<{
    credentialId: string;
    score: number;
  }>> {
    const result = await this.oracleContract.getTopCredentials(limit);
    const credentials = [];

    for (let i = 0; i < result.credentialIds.length; i++) {
      credentials.push({
        credentialId: result.credentialIds[i],
        score: Number(result.scores[i]),
      });
    }

    return credentials;
  }

  /**
   * Calculate reputation components (for analysis)
   */
  async analyzeReputationComponents(tokenAddress: string): Promise<{
    twap30d: bigint;
    volumeWeight: number;
    liquidityMultiplier: number;
    stabilityBonus: number;
    finalScore: number;
  }> {
    // Get TWAP
    const twap30d = await this.oracleContract.getTWAP(tokenAddress, 30 * 24 * 60 * 60);

    // Get volume data
    const volumeData = await this.oracleContract.getVolumeData(tokenAddress, 24 * 60 * 60);
    const volume24h = volumeData.volume;

    // Calculate volume weight
    const volumeWeight = this.calculateVolumeWeight(volume24h);

    // Get liquidity data
    const liquidityData = await this.oracleContract.getLiquidityData(tokenAddress);
    const liquidity = liquidityData.totalLiquidity;

    // Calculate liquidity multiplier
    const liquidityMultiplier = this.calculateLiquidityMultiplier(liquidity);

    // Calculate stability bonus (simplified)
    const stabilityBonus = await this.calculateStabilityBonus(tokenAddress);

    // Calculate final score
    const logTwap = Math.log2(Number(twap30d) / 1e14) * 100;
    const finalScore = (logTwap * volumeWeight * liquidityMultiplier * stabilityBonus) / 1000000;

    return {
      twap30d,
      volumeWeight,
      liquidityMultiplier,
      stabilityBonus,
      finalScore: Math.min(1000, finalScore),
    };
  }

  /**
   * Calculate volume weight based on 24h volume
   */
  private calculateVolumeWeight(volume24h: bigint): number {
    const vol = Number(volume24h) / 1e18;

    if (vol < 100) return 0.5;
    if (vol < 500) return 0.7;
    if (vol < 1000) return 0.9;
    if (vol < 5000) return 1.1;
    if (vol < 10000) return 1.3;
    if (vol < 25000) return 1.5;
    return 2.0;
  }

  /**
   * Calculate liquidity multiplier
   */
  private calculateLiquidityMultiplier(liquidity: bigint): number {
    const liq = Number(liquidity) / 1e18;

    if (liq < 500) return 1.0;
    if (liq < 1000) return 1.05;
    if (liq < 5000) return 1.1;
    if (liq < 10000) return 1.2;
    if (liq < 25000) return 1.3;
    if (liq < 50000) return 1.4;
    return 1.5;
  }

  /**
   * Calculate stability bonus based on price volatility
   */
  private async calculateStabilityBonus(tokenAddress: string): Promise<number> {
    try {
      // Get price history for last 30 days
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (30 * 24 * 60 * 60);

      const priceHistory = await this.oracleContract.getPriceHistory(
        tokenAddress,
        startTime,
        endTime
      );

      if (priceHistory.prices.length < 2) return 1.0;

      // Calculate volatility
      const prices = priceHistory.prices.map((p: bigint) => Number(p) / 1e18);
      const mean = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

      let variance = 0;
      for (const price of prices) {
        variance += Math.pow(price - mean, 2);
      }
      variance = variance / prices.length;

      const volatilityPct = (Math.sqrt(variance) / mean) * 100;

      // Return stability bonus based on volatility
      if (volatilityPct > 50) return 0.8;
      if (volatilityPct > 25) return 0.9;
      if (volatilityPct > 10) return 1.0;
      if (volatilityPct > 5) return 1.1;
      return 1.2;

    } catch (error) {
      console.error('Error calculating stability bonus:', error);
      return 1.0;
    }
  }

  /**
   * Generate reputation report
   */
  async generateReputationReport(): Promise<{
    topCredentials: any[];
    averageScore: number;
    scoreDistribution: any;
  }> {
    const topCredentials = await this.getTopCredentials(20);

    // Calculate average score
    const totalScore = topCredentials.reduce((sum, cred) => sum + cred.score, 0);
    const averageScore = totalScore / topCredentials.length;

    // Calculate score distribution
    const distribution = {
      elite: 0,      // 900+
      premium: 0,    // 800-900
      verified: 0,   // 700-800
      standard: 0,   // 500-700
      new: 0,        // <500
    };

    for (const cred of topCredentials) {
      if (cred.score >= 900) distribution.elite++;
      else if (cred.score >= 800) distribution.premium++;
      else if (cred.score >= 700) distribution.verified++;
      else if (cred.score >= 500) distribution.standard++;
      else distribution.new++;
    }

    return {
      topCredentials,
      averageScore,
      scoreDistribution: distribution,
    };
  }
}