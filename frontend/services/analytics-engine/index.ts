export { PriceCollector } from './priceCollector';
export { ReputationEngine } from './reputationEngine';
export { DataAggregator } from './dataAggregator';

/**
 * Analytics Engine Configuration
 */
export interface AnalyticsEngineConfig {
  providerUrl: string;
  oracleAddress: string;
  oracleABI: any[];
  signerPrivateKey?: string;
  priceUpdateInterval?: number;
  reputationUpdateInterval?: number;
}

/**
 * Main Analytics Engine Class
 * Orchestrates all analytics services
 */
export class AnalyticsEngine {
  private priceCollector: PriceCollector | null = null;
  private reputationEngine: ReputationEngine | null = null;
  private dataAggregator: DataAggregator;

  constructor(private config: AnalyticsEngineConfig) {
    // Initialize data aggregator (read-only, no signer needed)
    this.dataAggregator = new DataAggregator(
      config.providerUrl,
      config.oracleAddress,
      config.oracleABI
    );

    // Initialize price collector if signer is provided
    if (config.signerPrivateKey) {
      this.priceCollector = new PriceCollector(
        config.providerUrl,
        config.oracleAddress,
        config.oracleABI,
        config.signerPrivateKey
      );

      this.reputationEngine = new ReputationEngine(
        config.providerUrl,
        config.oracleAddress,
        config.oracleABI,
        config.signerPrivateKey
      );
    }
  }

  /**
   * Start all analytics services
   */
  async start() {
    console.log('Starting Analytics Engine...');

    if (this.priceCollector) {
      await this.priceCollector.start(
        this.config.priceUpdateInterval || 60000 // Default: 1 minute
      );
    }

    if (this.reputationEngine) {
      await this.reputationEngine.start(
        this.config.reputationUpdateInterval || 3600000 // Default: 1 hour
      );
    }

    console.log('Analytics Engine started successfully');
  }

  /**
   * Stop all analytics services
   */
  stop() {
    console.log('Stopping Analytics Engine...');

    if (this.priceCollector) {
      this.priceCollector.stop();
    }

    if (this.reputationEngine) {
      this.reputationEngine.stop();
    }

    console.log('Analytics Engine stopped');
  }

  /**
   * Register a new pool for monitoring
   */
  registerPool(poolAddress: string, poolABI: any[]) {
    if (this.priceCollector) {
      this.priceCollector.addPool(poolAddress, poolABI);
    }
    this.dataAggregator.addPoolContract(poolAddress, poolABI);
  }

  /**
   * Register a new token for monitoring
   */
  registerToken(tokenAddress: string, tokenABI: any[]) {
    this.dataAggregator.addTokenContract(tokenAddress, tokenABI);
  }

  /**
   * Register a credential-token mapping
   */
  registerCredential(credentialId: string, tokenAddress: string) {
    if (this.reputationEngine) {
      this.reputationEngine.registerCredential(credentialId, tokenAddress);
    }
  }

  /**
   * Get data aggregator for read operations
   */
  getDataAggregator(): DataAggregator {
    return this.dataAggregator;
  }

  /**
   * Get reputation engine for reputation queries
   */
  getReputationEngine(): ReputationEngine | null {
    return this.reputationEngine;
  }

  /**
   * Get price collector for price data operations
   */
  getPriceCollector(): PriceCollector | null {
    return this.priceCollector;
  }
}