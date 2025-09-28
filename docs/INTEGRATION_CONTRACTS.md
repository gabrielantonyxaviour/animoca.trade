# Integration Contracts - Session Interface Specifications

## Smart Contract Interfaces (Sessions 1-3, 6-7)

### ICredentialToken.sol - Core Token Interface
**Producer**: Session 2 (Core Token Contracts)
**Consumers**: Sessions 4 (Frontend), 6 (Token Generation), 7 (Analytics)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICredentialToken is IERC20 {
    // Metadata functions - Required by frontend (Session 4)
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function getCredentialId() external view returns (bytes32);
    function getEmissionRate() external view returns (uint256);
    function getMaxSupply() external view returns (uint256);
    function getCreator() external view returns (address);
    function getCreatedAt() external view returns (uint256);

    // Minting functions - Required by passive generator (Session 6)
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function setEmissionRate(uint256 newRate) external;

    // Supply tracking - Required by analytics (Session 7)
    function totalSupply() external view returns (uint256);
    function circulatingSupply() external view returns (uint256);

    // Events - Required by all consuming sessions
    event TokenMinted(
        address indexed holder,
        uint256 amount,
        bytes32 indexed credentialId,
        uint256 timestamp
    );
    event TokenBurned(
        address indexed holder,
        uint256 amount,
        uint256 timestamp
    );
    event EmissionRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );
}
```

### ICredentialTokenFactory.sol - Factory Interface
**Producer**: Session 2 (Core Token Contracts)
**Consumers**: Session 4 (Frontend)

```solidity
interface ICredentialTokenFactory {
    // Token creation - Required by frontend (Session 4)
    function createToken(
        bytes32 credentialId,
        string memory name,
        string memory symbol,
        uint256 emissionRate,
        uint256 maxSupply
    ) external returns (address tokenAddress);

    // Token discovery - Required by frontend (Session 4)
    function getTokenByCredential(bytes32 credentialId) external view returns (address);
    function getCredentialByToken(address tokenAddress) external view returns (bytes32);
    function isValidToken(address tokenAddress) external view returns (bool);
    function getAllTokens() external view returns (address[] memory);
    function getTokenCount() external view returns (uint256);

    // Credential validation - Integration with AIR
    function validateCredentialOwnership(
        bytes32 credentialId,
        address claimant
    ) external view returns (bool);

    // Events - Required by frontend and analytics
    event TokenCreated(
        bytes32 indexed credentialId,
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 emissionRate,
        uint256 maxSupply,
        uint256 timestamp
    );
}
```

### ICredentialPool.sol - AMM Pool Interface
**Producer**: Session 3 (AMM Implementation)
**Consumers**: Sessions 5 (Trading UI), 7 (Analytics)

```solidity
interface ICredentialPool {
    // Pool info - Required by trading UI (Session 5)
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint256);
    function price1CumulativeLast() external view returns (uint256);
    function kLast() external view returns (uint256);

    // Trading functions - Required by trading UI (Session 5)
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    // Liquidity functions - Required by trading UI (Session 5)
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    // Price calculation helpers - Required by frontend and analytics
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256 amountOut);
    function getAmountIn(
        uint256 amountOut,
        address tokenOut
    ) external view returns (uint256 amountIn);

    // Fee tracking - Required by analytics (Session 7)
    function getTotalFees() external view returns (uint256 totalFees);
    function getProtocolFees() external view returns (uint256 protocolFees);

    // Events - Required by analytics and trading UI
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to,
        uint256 timestamp
    );
    event Mint(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        uint256 timestamp
    );
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        address indexed to,
        uint256 timestamp
    );
    event Sync(uint256 reserve0, uint256 reserve1);
}
```

### IReputationOracle.sol - Price & Reputation Interface
**Producer**: Session 7 (Analytics System)
**Consumers**: Sessions 5 (Trading UI), 4 (Token Dashboard)

```solidity
interface IReputationOracle {
    // Price data - Required by trading UI (Session 5)
    function getCurrentPrice(address token) external view returns (uint256 price);
    function getTWAP(address token, uint256 timeWindow) external view returns (uint256 twap);
    function getPriceHistory(
        address token,
        uint256 fromTimestamp,
        uint256 toTimestamp
    ) external view returns (uint256[] memory prices, uint256[] memory timestamps);

    // Reputation scoring - Required by frontend (Sessions 4, 5)
    function getReputationScore(bytes32 credentialId) external view returns (uint256 score);
    function getReputationRanking(bytes32 credentialId) external view returns (uint256 rank);
    function getTopCredentials(uint256 limit) external view returns (bytes32[] memory);

    // Volume and liquidity data - Required by analytics UI
    function getVolumeData(
        address token,
        uint256 timeWindow
    ) external view returns (uint256 volume);
    function getLiquidityData(address token) external view returns (uint256 liquidity);

    // Events - Required by real-time UI updates
    event PriceUpdate(
        address indexed token,
        uint256 price,
        uint256 volume,
        uint256 timestamp
    );
    event ReputationUpdate(
        bytes32 indexed credentialId,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );
}
```

## Frontend Integration Interfaces (Sessions 4-5, 7)

### Token Management Hook Interface
**Producer**: Session 4 (Token Management UI)
**Consumers**: Sessions 5 (Trading UI), 7 (Analytics UI)

```typescript
interface UseTokenManagement {
  // Token data
  userTokens: Token[];
  availableTokens: Token[];
  isLoading: boolean;
  error: string | null;

  // Token operations
  createToken: (params: CreateTokenParams) => Promise<TransactionResponse>;
  claimTokens: (credentialId: string) => Promise<TransactionResponse>;
  getTokenMetadata: (tokenAddress: string) => Promise<TokenMetadata>;

  // Token discovery
  searchTokens: (query: string) => Promise<Token[]>;
  getTokensByCredentialType: (type: string) => Promise<Token[]>;
}

interface CreateTokenParams {
  credentialId: string;
  name: string;
  symbol: string;
  emissionRate: number;
  maxSupply: number;
  initialLiquidity: {
    tokenAmount: number;
    ethAmount: number;
  };
}

interface Token {
  address: string;
  credentialId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  emissionRate: number;
  maxSupply: number;
  creator: string;
  createdAt: Date;
  currentPrice?: number;
  marketCap?: number;
  volume24h?: number;
  reputationScore?: number;
}
```

### AMM Trading Hook Interface
**Producer**: Session 5 (Trading Interface)
**Consumers**: Sessions 4 (Token Dashboard), 7 (Analytics)

```typescript
interface UseAMMTrading {
  // Pool data
  pools: Pool[];
  selectedPool: Pool | null;
  isLoading: boolean;
  error: string | null;

  // Trading operations
  swap: (params: SwapParams) => Promise<TransactionResponse>;
  addLiquidity: (params: AddLiquidityParams) => Promise<TransactionResponse>;
  removeLiquidity: (params: RemoveLiquidityParams) => Promise<TransactionResponse>;

  // Price calculations
  getSwapPreview: (params: SwapPreviewParams) => Promise<SwapPreview>;
  getLiquidityPreview: (params: LiquidityPreviewParams) => Promise<LiquidityPreview>;

  // Pool management
  createPool: (params: CreatePoolParams) => Promise<TransactionResponse>;
  getUserLPPositions: (userAddress: string) => Promise<LPPosition[]>;
}

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippageTolerance: number;
  deadline: number;
}

interface AddLiquidityParams {
  poolAddress: string;
  amount0: number;
  amount1: number;
  slippageTolerance: number;
  deadline: number;
}

interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: bigint;
  reserve1: bigint;
  totalLiquidity: bigint;
  volume24h: number;
  fees24h: number;
  priceHistory: PricePoint[];
}
```

### Analytics Hook Interface
**Producer**: Session 7 (Analytics System)
**Consumers**: Sessions 4 (Dashboard), 5 (Trading UI)

```typescript
interface UseAnalytics {
  // Market data
  marketOverview: MarketOverview;
  topTokens: TokenRanking[];
  priceData: Map<string, PriceData[]>;
  volumeData: Map<string, VolumeData[]>;

  // Reputation data
  reputationLeaderboard: ReputationRanking[];
  getTokenReputation: (credentialId: string) => Promise<ReputationData>;

  // Historical data
  getPriceHistory: (tokenAddress: string, timeframe: string) => Promise<PriceData[]>;
  getVolumeHistory: (tokenAddress: string, timeframe: string) => Promise<VolumeData[]>;

  // Real-time updates
  subscribeToPriceUpdates: (tokenAddress: string, callback: (price: number) => void) => () => void;
  subscribeToMarketUpdates: (callback: (data: MarketUpdate) => void) => () => void;
}

interface MarketOverview {
  totalMarketCap: number;
  totalVolume24h: number;
  totalTokens: number;
  totalPools: number;
  topGainer: TokenRanking;
  topLoser: TokenRanking;
}

interface ReputationRanking {
  credentialId: string;
  tokenAddress: string;
  reputationScore: number;
  rank: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}
```

## Backend Service Interfaces (Sessions 6-7)

### Token Generation Service Interface
**Producer**: Session 6 (Passive Generation System)
**Consumers**: Sessions 4 (Dashboard), 7 (Analytics)

```typescript
interface TokenGenerationService {
  // Credential validation
  validateCredential(credentialId: string, holder: string): Promise<boolean>;
  getCredentialStatus(credentialId: string): Promise<CredentialStatus>;
  batchValidateCredentials(requests: ValidationRequest[]): Promise<ValidationResult[]>;

  // Emission calculations
  calculateEmission(
    credentialId: string,
    holder: string,
    lastClaimTimestamp: number
  ): Promise<EmissionResult>;

  // Token operations
  mintTokens(credentialId: string, holder: string, amount: number): Promise<string>;
  getClaimableTokens(holder: string): Promise<ClaimableToken[]>;

  // Background processing
  processGenerationRound(): Promise<GenerationRoundResult>;
  getGenerationStats(): Promise<GenerationStats>;
}

interface EmissionResult {
  amount: number;
  rate: number;
  timeHeld: number;
  multiplier: number;
  nextClaimableAt: number;
}

interface ClaimableToken {
  credentialId: string;
  tokenAddress: string;
  amount: number;
  earnedSince: Date;
  lastClaimAt: Date;
}
```

### Analytics Service Interface
**Producer**: Session 7 (Analytics System)
**Consumers**: Frontend Sessions 4, 5

```typescript
interface AnalyticsService {
  // Price data
  getCurrentPrices(): Promise<Map<string, number>>;
  getPriceHistory(tokenAddress: string, timeframe: TimeFrame): Promise<PriceData[]>;
  calculateTWAP(tokenAddress: string, windowHours: number): Promise<number>;

  // Volume and liquidity
  getVolumeData(tokenAddress: string, timeframe: TimeFrame): Promise<VolumeData[]>;
  getLiquidityMetrics(poolAddress: string): Promise<LiquidityMetrics>;
  getMarketDepth(poolAddress: string): Promise<MarketDepth>;

  // Reputation calculations
  calculateReputationScore(credentialId: string): Promise<number>;
  getReputationHistory(credentialId: string): Promise<ReputationHistory[]>;
  updateReputationRankings(): Promise<void>;

  // Market insights
  getMarketOverview(): Promise<MarketOverview>;
  detectTrendingTokens(): Promise<TrendingToken[]>;
  generateMarketReport(): Promise<MarketReport>;
}

interface PriceData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiquidityMetrics {
  totalLiquidity: number;
  utilization: number;
  impermanentLoss: number;
  feeAPR: number;
}
```

## Data Schema Contracts

### Database Schema Requirements

```typescript
// Token table schema (Session 2 → Sessions 4, 5, 7)
interface TokenRecord {
  address: string;                    // Primary key
  credential_id: string;              // Unique index
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;               // BigInt as string
  max_supply: string;                 // BigInt as string
  emission_rate: number;
  creator: string;
  created_at: Date;
  updated_at: Date;
}

// Pool table schema (Session 3 → Sessions 5, 7)
interface PoolRecord {
  address: string;                    // Primary key
  token0: string;                     // Foreign key to tokens
  token1: string;                     // Foreign key to tokens
  reserve0: string;                   // BigInt as string
  reserve1: string;                   // BigInt as string
  total_liquidity: string;            // BigInt as string
  fee_tier: number;                   // 3000 = 0.3%
  created_at: Date;
  updated_at: Date;
}

// Price history schema (Session 7 → Sessions 4, 5)
interface PriceRecord {
  id: number;                         // Primary key
  token_address: string;              // Foreign key to tokens
  price: number;
  volume: number;
  timestamp: Date;
  block_number: number;
}

// Reputation score schema (Session 7 → Sessions 4, 5)
interface ReputationRecord {
  credential_id: string;              // Primary key
  token_address: string;              // Foreign key to tokens
  score: number;
  rank: number;
  twap_30d: number;
  volume_24h: number;
  market_cap: number;
  updated_at: Date;
}
```

### Event Schema Contracts

```typescript
// Standard event format for cross-service communication
interface BlockchainEvent {
  event: string;                      // Event name
  address: string;                    // Contract address
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
  args: Record<string, any>;          // Event arguments
}

// Token creation event (Session 2 → Sessions 4, 6, 7)
interface TokenCreatedEvent extends BlockchainEvent {
  event: 'TokenCreated';
  args: {
    credentialId: string;
    tokenAddress: string;
    creator: string;
    name: string;
    symbol: string;
    emissionRate: number;
    maxSupply: string;
  };
}

// Swap event (Session 3 → Sessions 5, 7)
interface SwapEvent extends BlockchainEvent {
  event: 'Swap';
  args: {
    sender: string;
    amount0In: string;
    amount1In: string;
    amount0Out: string;
    amount1Out: string;
    to: string;
  };
}

// Token minted event (Session 6 → Sessions 4, 7)
interface TokenMintedEvent extends BlockchainEvent {
  event: 'TokenMinted';
  args: {
    holder: string;
    amount: string;
    credentialId: string;
  };
}
```

These interfaces provide exact specifications that each session must implement, ensuring seamless integration across the entire system.