const express = require('express');
const promClient = require('prom-client');
const { createPublicClient, http, parseEventLogs } = require('viem');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PROMETHEUS_PORT || 9091;

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://devnet-rpc.mocachain.org';
const CHAIN_ID = parseInt(process.env.CHAIN_ID) || 5151;
const CREDENTIAL_TOKEN_FACTORY = process.env.CREDENTIAL_TOKEN_FACTORY;
const POOL_FACTORY = process.env.POOL_FACTORY;
const PASSIVE_TOKEN_GENERATOR = process.env.PASSIVE_TOKEN_GENERATOR;
const REPUTATION_ORACLE = process.env.REPUTATION_ORACLE;

// Initialize Prometheus metrics registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const tokensCreatedTotal = new promClient.Counter({
  name: 'blockchain_tokens_created_total',
  help: 'Total number of credential tokens created',
  labelNames: ['token_type', 'creator']
});

const tradesTotal = new promClient.Counter({
  name: 'blockchain_trades_total',
  help: 'Total number of trades executed',
  labelNames: ['pool_address', 'token_symbol']
});

const tradingVolumeTotal = new promClient.Counter({
  name: 'blockchain_trading_volume_eth_total',
  help: 'Total trading volume in ETH',
  labelNames: ['pool_address', 'token_symbol']
});

const activePools = new promClient.Gauge({
  name: 'blockchain_active_pools_total',
  help: 'Number of active trading pools',
});

const averageGasPrice = new promClient.Gauge({
  name: 'blockchain_average_gas_price',
  help: 'Average gas price in Gwei',
});

const contractCallsTotal = new promClient.Counter({
  name: 'blockchain_contract_calls_total',
  help: 'Total contract calls made',
  labelNames: ['contract', 'method']
});

const contractCallsSuccessTotal = new promClient.Counter({
  name: 'blockchain_contract_calls_success_total',
  help: 'Total successful contract calls',
  labelNames: ['contract', 'method']
});

const contractCallFailures = new promClient.Counter({
  name: 'blockchain_contract_call_failures_total',
  help: 'Total failed contract calls',
  labelNames: ['contract', 'method', 'error']
});

const gasUsedTotal = new promClient.Counter({
  name: 'blockchain_gas_used_total',
  help: 'Total gas used by contract interactions',
  labelNames: ['contract', 'method']
});

const tokenTradingVolume = new promClient.Counter({
  name: 'blockchain_token_trading_volume_total',
  help: 'Trading volume per token',
  labelNames: ['token_address', 'token_symbol']
});

const blockNumber = new promClient.Gauge({
  name: 'blockchain_latest_block_number',
  help: 'Latest block number processed'
});

const reputationScores = new promClient.Gauge({
  name: 'blockchain_reputation_scores',
  help: 'Reputation scores for tokens',
  labelNames: ['token_address', 'token_symbol']
});

// Register metrics
register.registerMetric(tokensCreatedTotal);
register.registerMetric(tradesTotal);
register.registerMetric(tradingVolumeTotal);
register.registerMetric(activePools);
register.registerMetric(averageGasPrice);
register.registerMetric(contractCallsTotal);
register.registerMetric(contractCallsSuccessTotal);
register.registerMetric(contractCallFailures);
register.registerMetric(gasUsedTotal);
register.registerMetric(tokenTradingVolume);
register.registerMetric(blockNumber);
register.registerMetric(reputationScores);

// Viem client setup
const client = createPublicClient({
  transport: http(RPC_URL),
  chain: {
    id: CHAIN_ID,
    name: 'Moca Devnet',
    network: 'moca-devnet',
    nativeCurrency: {
      decimals: 18,
      name: 'MOCA',
      symbol: 'MOCA',
    },
    rpcUrls: {
      default: {
        http: [RPC_URL],
      },
      public: {
        http: [RPC_URL],
      },
    },
  },
});

// Contract ABIs (simplified)
const TOKEN_FACTORY_ABI = [
  {
    anonymous: true,
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'creator', type: 'address', indexed: true }
    ],
    name: 'TokenCreated',
    type: 'event'
  }
];

const POOL_FACTORY_ABI = [
  {
    anonymous: true,
    inputs: [
      { name: 'pool', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true }
    ],
    name: 'PoolCreated',
    type: 'event'
  }
];

// Monitoring state
let lastProcessedBlock = 0;
let monitoringActive = true;

// Blockchain monitoring functions
async function updateBlockNumber() {
  try {
    const latestBlock = await client.getBlockNumber();
    blockNumber.set(Number(latestBlock));
    return latestBlock;
  } catch (error) {
    console.error('Error getting latest block:', error);
    return null;
  }
}

async function monitorTokenCreation(fromBlock, toBlock) {
  if (!CREDENTIAL_TOKEN_FACTORY) return;

  try {
    const logs = await client.getLogs({
      address: CREDENTIAL_TOKEN_FACTORY,
      events: TOKEN_FACTORY_ABI,
      fromBlock,
      toBlock
    });

    const parsedLogs = parseEventLogs({
      abi: TOKEN_FACTORY_ABI,
      logs
    });

    for (const log of parsedLogs) {
      if (log.eventName === 'TokenCreated') {
        tokensCreatedTotal.inc({
          token_type: 'credential',
          creator: log.args.creator
        });

        contractCallsTotal.inc({
          contract: 'TokenFactory',
          method: 'createToken'
        });

        contractCallsSuccessTotal.inc({
          contract: 'TokenFactory',
          method: 'createToken'
        });
      }
    }
  } catch (error) {
    console.error('Error monitoring token creation:', error);
    contractCallFailures.inc({
      contract: 'TokenFactory',
      method: 'createToken',
      error: error.message.substring(0, 50)
    });
  }
}

async function monitorPoolCreation(fromBlock, toBlock) {
  if (!POOL_FACTORY) return;

  try {
    const logs = await client.getLogs({
      address: POOL_FACTORY,
      events: POOL_FACTORY_ABI,
      fromBlock,
      toBlock
    });

    const parsedLogs = parseEventLogs({
      abi: POOL_FACTORY_ABI,
      logs
    });

    for (const log of parsedLogs) {
      if (log.eventName === 'PoolCreated') {
        // Increment active pools count
        activePools.inc();

        contractCallsTotal.inc({
          contract: 'PoolFactory',
          method: 'createPool'
        });

        contractCallsSuccessTotal.inc({
          contract: 'PoolFactory',
          method: 'createPool'
        });
      }
    }
  } catch (error) {
    console.error('Error monitoring pool creation:', error);
    contractCallFailures.inc({
      contract: 'PoolFactory',
      method: 'createPool',
      error: error.message.substring(0, 50)
    });
  }
}

async function updateGasPrice() {
  try {
    const gasPrice = await client.getGasPrice();
    const gasPriceGwei = Number(gasPrice) / 1e9;
    averageGasPrice.set(gasPriceGwei);
  } catch (error) {
    console.error('Error getting gas price:', error);
  }
}

async function processBlocks() {
  if (!monitoringActive) return;

  try {
    const currentBlock = await updateBlockNumber();
    if (!currentBlock) return;

    const fromBlock = BigInt(Math.max(lastProcessedBlock + 1, Number(currentBlock) - 100));
    const toBlock = currentBlock;

    if (fromBlock <= toBlock) {
      await Promise.all([
        monitorTokenCreation(fromBlock, toBlock),
        monitorPoolCreation(fromBlock, toBlock)
      ]);

      lastProcessedBlock = Number(toBlock);
    }

    await updateGasPrice();
  } catch (error) {
    console.error('Error processing blocks:', error);
  }
}

// API endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    monitoring_active: monitoringActive,
    last_processed_block: lastProcessedBlock,
    rpc_url: RPC_URL,
    chain_id: CHAIN_ID
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/status', (req, res) => {
  res.json({
    service: 'blockchain-monitor',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    contracts: {
      credential_token_factory: CREDENTIAL_TOKEN_FACTORY,
      pool_factory: POOL_FACTORY,
      passive_token_generator: PASSIVE_TOKEN_GENERATOR,
      reputation_oracle: REPUTATION_ORACLE
    },
    metrics: {
      tokens_created: tokensCreatedTotal.get(),
      trades_total: tradesTotal.get(),
      active_pools: activePools.get(),
      last_processed_block: lastProcessedBlock
    }
  });
});

// Start monitoring
async function startMonitoring() {
  console.log('Starting blockchain monitoring service...');
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Contracts:`);
  console.log(`  TokenFactory: ${CREDENTIAL_TOKEN_FACTORY}`);
  console.log(`  PoolFactory: ${POOL_FACTORY}`);
  console.log(`  PassiveTokenGenerator: ${PASSIVE_TOKEN_GENERATOR}`);
  console.log(`  ReputationOracle: ${REPUTATION_ORACLE}`);

  // Initial block processing
  await processBlocks();

  // Schedule regular monitoring
  cron.schedule('*/30 * * * * *', processBlocks); // Every 30 seconds

  console.log('Blockchain monitoring started');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  monitoringActive = false;
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  monitoringActive = false;
  process.exit(0);
});

// Start the service
app.listen(PORT, () => {
  console.log(`Blockchain monitoring service listening on port ${PORT}`);
  startMonitoring();
});