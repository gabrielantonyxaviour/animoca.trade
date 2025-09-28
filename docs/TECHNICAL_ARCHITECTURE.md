# Technical Architecture - Credential Token Ecosystem

## System Overview

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│      Frontend           │    │    Smart Contracts      │    │    Backend Services     │
│                         │    │                         │    │                         │
│ • Token Management UI   │◄──►│ • CredentialTokenFactory│◄──►│ • Price Oracle Service  │
│ • AMM Trading Interface │    │ • CredentialToken (ERC20)│    │ • Analytics Engine      │
│ • Liquidity Pool Mgmt   │    │ • PoolFactory & Pools   │    │ • Token Generation Svc  │
│ • Analytics Dashboard   │    │ • PassiveTokenGenerator │    │ • Notification Service  │
│ • AIR Integration (existing)│ • ReputationOracle       │    │ • API Gateway           │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
         │                               │                               │
         └──────────────── Web3 Integration Layer ────────────────────┘
                                        │
                            ┌─────────────────────────┐
                            │      AIR SDK            │
                            │ • Credential Verification │
                            │ • User Authentication   │
                            │ • Partner Management    │
                            └─────────────────────────┘
```

## Smart Contract Architecture

### Core Contract Relationships

```
CredentialTokenFactory
├── Creates CredentialToken instances (1:1 with credentials)
├── Validates credential ownership via AIR integration
└── Maintains credentialId → tokenAddress mapping

CredentialToken (ERC20)
├── Standard ERC20 functionality
├── Credential metadata (credentialId, emissionRate, maxSupply)
├── Restricted minting (only PassiveTokenGenerator)
└── Integration with reputation scoring

PoolFactory
├── Creates AMM pools for token pairs
├── Standard x*y=k constant product formula
├── Fee collection (0.25% to LPs, 0.05% to protocol)
└── Pool discovery and management

PassiveTokenGenerator
├── Validates credential status via AIR
├── Calculates emission based on time held + credential type
├── Mints tokens directly to credential holders
└── Rate limiting and anti-gaming measures

ReputationOracle
├── Stores historical price data from all pools
├── TWAP calculations with configurable time windows
├── Reputation score computation and storage
└── Cross-pool price aggregation
```

### Data Flow Examples

#### Token Creation Flow
```
1. Frontend → AIR SDK: Validate user owns credential
2. Frontend → CredentialTokenFactory: createToken(credentialId, params)
3. Factory → AIR Integration: Verify credential ownership
4. Factory → New CredentialToken: Deploy with metadata
5. Factory → Event: TokenCreated(credentialId, tokenAddress)
6. Frontend → PoolFactory: createPool(token, ETH, initialLiquidity)
7. PoolFactory → New Pool: Deploy AMM pool
8. Pool → LP Tokens: Mint to liquidity provider
9. Backend → Analytics: Index new token for tracking
10. Frontend → Update UI: Show new token in portfolio
```

#### Trading Flow
```
1. Frontend → Pool Contract: getReserves() for price calculation
2. Frontend → User Interface: Display swap preview with slippage
3. User → Pool Contract: swap(tokenIn, amountIn, minAmountOut)
4. Pool → Token Contracts: Transfer tokens between users
5. Pool → Fee Collection: Distribute 0.25% to LPs, 0.05% to protocol
6. Pool → Event: Swap(user, tokenIn, amountIn, amountOut, timestamp)
7. Backend → Price Oracle: Update price feed with new price
8. Backend → Analytics: Update volume and trading metrics
9. Frontend → Notification: Transaction confirmed
```

#### Passive Token Generation Flow
```
1. Background Service → Credential Registry: Query active credentials
2. Service → AIR API: Batch validate credential statuses
3. Service → PassiveTokenGenerator: calculateEmission(credentialId, timeSinceLastClaim)
4. Generator → Emission Logic: Apply rate multipliers and decay functions
5. Generator → CredentialToken: mint(holderAddress, calculatedAmount)
6. Token → Event: TokenMinted(holder, amount, credentialId, timestamp)
7. Backend → Analytics: Update supply metrics
8. Backend → Notification: Alert user of new tokens available
9. Frontend → Portfolio Update: Show increased token balance
```

## Frontend Architecture

### Current AIR App Integration
```
src/
├── components/
│   ├── issuance/CredentialIssuance.tsx        # Existing - unchanged
│   ├── verification/CredentialVerification.tsx # Existing - unchanged
│   ├── tokens/                                # New - Session 4
│   │   ├── TokenDashboard.tsx                # Portfolio overview
│   │   ├── TokenCreationForm.tsx             # Create new tokens
│   │   ├── TokenPortfolio.tsx                # Holdings management
│   │   └── ClaimTokensInterface.tsx          # Claim generated tokens
│   ├── trading/                              # New - Session 5
│   │   ├── SwapInterface.tsx                 # Token swapping
│   │   ├── PoolManagement.tsx                # LP position management
│   │   ├── LiquidityProvider.tsx             # Add/remove liquidity
│   │   └── TradingCharts.tsx                 # Price charts & history
│   ├── analytics/                            # New - Session 7
│   │   ├── ReputationLeaderboard.tsx         # Top credentials by reputation
│   │   ├── MarketOverview.tsx                # Market metrics & trends
│   │   ├── PriceCharts.tsx                   # Historical price data
│   │   └── VolumeAnalytics.tsx               # Trading volume analysis
│   └── ui/                                   # Shared components
│       ├── TokenCard.tsx                     # Reusable token display
│       ├── PriceDisplay.tsx                  # Price formatting
│       └── LoadingSpinner.tsx                # Loading states
```

### React Router Integration
```typescript
// App.tsx - Extended routing
<Routes>
  <Route path="/" element={<Navigate to="/issue" replace />} />
  <Route path="/issue" element={<CredentialIssuance />} />      // Existing
  <Route path="/verify" element={<CredentialVerification />} /> // Existing
  <Route path="/tokens" element={<TokenDashboard />} />         // New
  <Route path="/tokens/create" element={<TokenCreationForm />} />// New
  <Route path="/trade" element={<SwapInterface />} />           // New
  <Route path="/pools" element={<PoolManagement />} />          // New
  <Route path="/analytics" element={<MarketOverview />} />      // New
</Routes>
```

### State Management Patterns
```typescript
// Global state for token ecosystem
interface TokenEcosystemState {
  // User state
  userTokens: Token[];
  userLPPositions: LPPosition[];
  claimableTokens: ClaimableToken[];

  // Market state
  availableTokens: Token[];
  tradingPairs: TradingPair[];
  priceData: PriceData[];

  // UI state
  selectedToken: Token | null;
  isTrading: boolean;
  notifications: Notification[];
}

// Context provider for token functionality
const TokenEcosystemProvider = ({ children }) => {
  const [state, setState] = useState<TokenEcosystemState>(initialState);

  // Contract interaction methods
  const createToken = async (params: CreateTokenParams) => { /* ... */ };
  const swapTokens = async (params: SwapParams) => { /* ... */ };
  const addLiquidity = async (params: LiquidityParams) => { /* ... */ };
  const claimTokens = async (credentialId: string) => { /* ... */ };

  return (
    <TokenEcosystemContext.Provider value={{ state, actions }}>
      {children}
    </TokenEcosystemContext.Provider>
  );
};
```

## Backend Services Architecture

### Service Organization
```
services/
├── price-oracle/              # Price feed aggregation & TWAP calculation
│   ├── src/
│   │   ├── collectors/        # Pool price data collection
│   │   ├── calculators/       # TWAP and reputation scoring
│   │   ├── storage/           # Time-series price storage
│   │   └── api/               # REST API for price data
│   └── package.json
│
├── analytics-engine/          # Market data processing & analytics
│   ├── src/
│   │   ├── aggregators/       # Volume, liquidity, and trading metrics
│   │   ├── rankings/          # Token and credential rankings
│   │   ├── insights/          # Market trend analysis
│   │   └── api/               # GraphQL API for complex queries
│   └── package.json
│
├── token-generator/           # Passive token generation service
│   ├── src/
│   │   ├── validators/        # Credential status validation via AIR
│   │   ├── calculators/       # Emission rate calculations
│   │   ├── minters/           # Smart contract minting execution
│   │   └── scheduler/         # Background job management
│   └── package.json
│
└── notification-service/      # User notifications & alerts
    ├── src/
    │   ├── channels/          # Email, push, SMS notification channels
    │   ├── triggers/          # Event-based notification triggers
    │   ├── templates/         # Notification message templates
    │   └── preferences/       # User notification preferences
    └── package.json
```

### Data Storage Architecture
```
PostgreSQL (Primary Database)
├── users                      # User profiles and preferences
├── tokens                     # Token metadata and configuration
├── pools                      # AMM pool data and liquidity
├── transactions               # Trading and liquidity transactions
├── reputation_scores          # Historical reputation data
└── notifications              # Notification history and preferences

Redis (Cache & Sessions)
├── price_cache                # Real-time price data
├── user_sessions              # Authentication sessions
├── rate_limits                # API rate limiting
└── job_queues                 # Background job processing

Time-Series Database (Price Data)
├── price_feeds                # Raw price data from pools
├── volume_data                # Trading volume metrics
├── liquidity_data             # Pool liquidity over time
└── twap_calculations          # Time-weighted average prices

IPFS (Decentralized Storage)
├── token_metadata             # Token images and descriptions
├── credential_metadata        # Credential-related assets
└── reputation_proofs          # Cryptographic reputation proofs
```

## Integration Patterns

### AIR SDK Integration
```typescript
// Credential validation pattern for smart contracts
interface AIRIntegration {
  // Validate credential ownership (used in token creation)
  validateCredentialOwnership(
    credentialId: string,
    holderAddress: string
  ): Promise<boolean>;

  // Check credential status (used in passive generation)
  getCredentialStatus(credentialId: string): Promise<'ACTIVE' | 'REVOKED' | 'EXPIRED'>;

  // Get credential metadata (used in token configuration)
  getCredentialMetadata(credentialId: string): Promise<CredentialMetadata>;

  // Batch operations for efficiency
  batchValidateCredentials(
    requests: CredentialValidationRequest[]
  ): Promise<CredentialValidationResponse[]>;
}
```

### Web3 Integration Patterns
```typescript
// Standard contract interaction pattern
export const useContract = <T extends Contract>(
  address: string,
  abi: any,
  withSigner = false
): T | null => {
  const { provider } = useWeb3();
  const signer = useSigner();

  return useMemo(() => {
    if (!address || !provider) return null;
    const contractProvider = withSigner ? signer : provider;
    return new ethers.Contract(address, abi, contractProvider) as T;
  }, [address, abi, provider, signer, withSigner]);
};

// Transaction handling pattern
export const useContractTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransaction = async (
    contractMethod: () => Promise<TransactionResponse>,
    options?: TransactionOptions
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const tx = await contractMethod();
      const receipt = await tx.wait();

      // Handle success (notifications, state updates)
      return receipt;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeTransaction, isLoading, error };
};
```

### Event Handling & Real-time Updates
```typescript
// Event listener pattern for contract events
export const useContractEvents = (
  contract: Contract | null,
  eventName: string,
  filter?: any[]
) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!contract) return;

    const eventFilter = contract.filters[eventName](...(filter || []));

    const handleEvent = (event: Event) => {
      setEvents(prev => [event, ...prev]);
    };

    contract.on(eventFilter, handleEvent);

    return () => {
      contract.off(eventFilter, handleEvent);
    };
  }, [contract, eventName, filter]);

  return events;
};

// WebSocket connection for real-time price feeds
export const usePriceStream = (tokenAddress: string) => {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_ENDPOINT}/prices/${tokenAddress}`);

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'PRICE_UPDATE') {
        setPrice(data.price);
      }
    };

    return () => ws.close();
  }, [tokenAddress]);

  return price;
};
```

## Security Considerations

### Smart Contract Security
```solidity
// Access control patterns
modifier onlyCredentialHolder(bytes32 credentialId) {
    require(
        AIRRegistry.validateCredentialOwnership(credentialId, msg.sender),
        "Not credential holder"
    );
    _;
}

// Reentrancy protection
modifier nonReentrant() {
    require(_notEntered, "ReentrancyGuard: reentrant call");
    _notEntered = false;
    _;
    _notEntered = true;
}

// Rate limiting for token generation
modifier rateLimited(bytes32 credentialId) {
    require(
        block.timestamp >= lastClaim[credentialId] + MIN_CLAIM_INTERVAL,
        "Claim too frequent"
    );
    _;
}
```

### Frontend Security
```typescript
// Input validation and sanitization
const validateTokenCreationInput = (input: TokenCreationInput): ValidationResult => {
  const errors: string[] = [];

  if (!input.name || input.name.length < 3) {
    errors.push("Token name must be at least 3 characters");
  }

  if (!input.symbol || !/^[A-Z]{2,10}$/.test(input.symbol)) {
    errors.push("Token symbol must be 2-10 uppercase letters");
  }

  if (input.emissionRate <= 0 || input.emissionRate > MAX_EMISSION_RATE) {
    errors.push("Invalid emission rate");
  }

  return { isValid: errors.length === 0, errors };
};

// Transaction signing with user confirmation
const signTransaction = async (transaction: TransactionRequest) => {
  // Display transaction details to user
  const confirmed = await showTransactionPreview(transaction);
  if (!confirmed) throw new Error("Transaction cancelled by user");

  // Sign with additional security checks
  return await signer.sendTransaction(transaction);
};
```

This architecture provides a robust, scalable foundation for the credential token ecosystem while integrating seamlessly with the existing AIR infrastructure.