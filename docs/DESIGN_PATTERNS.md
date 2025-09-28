# Design Patterns & Development Standards

## Smart Contract Patterns

### Security Patterns

#### Access Control Pattern
```solidity
// Use OpenZeppelin's AccessControl for role-based permissions
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CredentialToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyMinter() {
        require(hasRole(MINTER_ROLE, msg.sender), "Not authorized to mint");
        _;
    }
}
```

#### Reentrancy Protection Pattern
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CredentialPool is ReentrancyGuard {
    function swap(uint256 amountIn, uint256 minAmountOut)
        external
        nonReentrant
    {
        // Swap logic here
    }
}
```

#### Rate Limiting Pattern
```solidity
contract PassiveTokenGenerator {
    mapping(bytes32 => uint256) public lastClaimTime;
    uint256 public constant MIN_CLAIM_INTERVAL = 1 hours;

    modifier rateLimited(bytes32 credentialId) {
        require(
            block.timestamp >= lastClaimTime[credentialId] + MIN_CLAIM_INTERVAL,
            "Claim too frequent"
        );
        _;
        lastClaimTime[credentialId] = block.timestamp;
    }
}
```

### Gas Optimization Patterns

#### Batch Operations Pattern
```solidity
// Batch multiple operations to save gas
function batchMint(
    address[] calldata recipients,
    uint256[] calldata amounts
) external onlyMinter {
    require(recipients.length == amounts.length, "Array length mismatch");

    for (uint256 i = 0; i < recipients.length; i++) {
        _mint(recipients[i], amounts[i]);
    }
}
```

#### Storage Optimization Pattern
```solidity
// Pack structs to minimize storage slots
struct TokenMetadata {
    uint128 emissionRate;     // 16 bytes
    uint128 maxSupply;        // 16 bytes - Total: 32 bytes (1 slot)

    address creator;          // 20 bytes
    uint96 createdAt;         // 12 bytes - Total: 32 bytes (1 slot)
}
```

#### Event Optimization Pattern
```solidity
// Use indexed parameters for filtering, but limit to 3 per event
event TokenCreated(
    bytes32 indexed credentialId,
    address indexed tokenAddress,
    address indexed creator,
    uint256 emissionRate,        // Not indexed to save gas
    uint256 timestamp           // Not indexed to save gas
);
```

### Error Handling Patterns

#### Custom Error Pattern (Gas Efficient)
```solidity
// Custom errors are more gas efficient than require strings
error InvalidCredential(bytes32 credentialId);
error InsufficientBalance(uint256 requested, uint256 available);
error UnauthorizedAccess(address caller, bytes32 role);

contract CredentialToken {
    function mint(address to, uint256 amount) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert UnauthorizedAccess(msg.sender, MINTER_ROLE);
        }

        if (totalSupply() + amount > maxSupply) {
            revert InsufficientBalance(amount, maxSupply - totalSupply());
        }

        _mint(to, amount);
    }
}
```

## Frontend Patterns

### React Component Patterns

#### Container/Presentation Pattern
```typescript
// Container component (business logic)
const TokenDashboardContainer: React.FC = () => {
  const { userTokens, isLoading, claimTokens } = useTokenManagement();
  const { userAddress } = useAuth();

  const handleClaimTokens = async (credentialId: string) => {
    try {
      await claimTokens(credentialId);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <TokenDashboardPresentation
      tokens={userTokens}
      isLoading={isLoading}
      onClaimTokens={handleClaimTokens}
      userAddress={userAddress}
    />
  );
};

// Presentation component (UI only)
interface TokenDashboardPresentationProps {
  tokens: Token[];
  isLoading: boolean;
  onClaimTokens: (credentialId: string) => void;
  userAddress: string | null;
}

const TokenDashboardPresentation: React.FC<TokenDashboardPresentationProps> = ({
  tokens,
  isLoading,
  onClaimTokens,
  userAddress
}) => {
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {tokens.map(token => (
        <TokenCard
          key={token.address}
          token={token}
          onClaim={() => onClaimTokens(token.credentialId)}
          userAddress={userAddress}
        />
      ))}
    </div>
  );
};
```

#### Custom Hook Pattern
```typescript
// Encapsulate complex logic in reusable hooks
interface UseTokenManagementReturn {
  userTokens: Token[];
  isLoading: boolean;
  error: string | null;
  createToken: (params: CreateTokenParams) => Promise<void>;
  claimTokens: (credentialId: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
}

export const useTokenManagement = (): UseTokenManagementReturn => {
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { contract: factory } = useContract(FACTORY_ADDRESS, FACTORY_ABI, true);
  const { userAddress } = useAuth();

  const createToken = useCallback(async (params: CreateTokenParams) => {
    if (!factory || !userAddress) throw new Error("Not connected");

    setIsLoading(true);
    setError(null);

    try {
      const tx = await factory.createToken(
        params.credentialId,
        params.name,
        params.symbol,
        params.emissionRate,
        params.maxSupply
      );
      await tx.wait();
      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [factory, userAddress]);

  const claimTokens = useCallback(async (credentialId: string) => {
    // Implementation
  }, []);

  const refreshTokens = useCallback(async () => {
    // Implementation
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      refreshTokens();
    }
  }, [userAddress, refreshTokens]);

  return {
    userTokens,
    isLoading,
    error,
    createToken,
    claimTokens,
    refreshTokens
  };
};
```

#### Error Boundary Pattern
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class TokenEcosystemErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Token ecosystem error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Something went wrong with the token system
          </h2>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Web3 Integration Patterns

#### Contract Hook Pattern
```typescript
// Reusable contract hook with error handling
export const useContract = <T extends Contract>(
  address: string | undefined,
  abi: any,
  withSigner = false
): { contract: T | null; isLoading: boolean; error: string | null } => {
  const { provider } = useWeb3React();
  const signer = useSigner();
  const [contract, setContract] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !provider) {
      setContract(null);
      setIsLoading(false);
      return;
    }

    try {
      const contractProvider = withSigner ? signer : provider;
      if (!contractProvider) {
        setError("Provider not available");
        setIsLoading(false);
        return;
      }

      const newContract = new ethers.Contract(address, abi, contractProvider) as T;
      setContract(newContract);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
      setContract(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, abi, provider, signer, withSigner]);

  return { contract, isLoading, error };
};
```

#### Transaction Hook Pattern
```typescript
interface UseTransactionReturn {
  execute: (txFunction: () => Promise<TransactionResponse>) => Promise<TransactionReceipt>;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
}

export const useTransaction = (): UseTransactionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const execute = useCallback(async (txFunction: () => Promise<TransactionResponse>) => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const tx = await txFunction();
      setTxHash(tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      return receipt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error, txHash };
};
```

### State Management Patterns

#### Context Provider Pattern
```typescript
interface TokenEcosystemContextType {
  // State
  tokens: Token[];
  pools: Pool[];
  userPositions: LPPosition[];

  // Actions
  createToken: (params: CreateTokenParams) => Promise<void>;
  swapTokens: (params: SwapParams) => Promise<void>;
  addLiquidity: (params: AddLiquidityParams) => Promise<void>;

  // Computed values
  totalPortfolioValue: number;
  topTokens: Token[];
}

const TokenEcosystemContext = createContext<TokenEcosystemContextType | null>(null);

export const TokenEcosystemProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<LPPosition[]>([]);

  // Actions
  const createToken = useCallback(async (params: CreateTokenParams) => {
    // Implementation
  }, []);

  // Computed values
  const totalPortfolioValue = useMemo(() => {
    return tokens.reduce((total, token) => total + (token.balance * token.price), 0);
  }, [tokens]);

  const value = useMemo(() => ({
    tokens,
    pools,
    userPositions,
    createToken,
    swapTokens,
    addLiquidity,
    totalPortfolioValue,
    topTokens
  }), [tokens, pools, userPositions, createToken, totalPortfolioValue]);

  return (
    <TokenEcosystemContext.Provider value={value}>
      {children}
    </TokenEcosystemContext.Provider>
  );
};

export const useTokenEcosystem = () => {
  const context = useContext(TokenEcosystemContext);
  if (!context) {
    throw new Error("useTokenEcosystem must be used within TokenEcosystemProvider");
  }
  return context;
};
```

## Backend Service Patterns

### Service Layer Pattern
```typescript
// Base service class with common functionality
abstract class BaseService {
  protected logger: Logger;
  protected config: Config;

  constructor(logger: Logger, config: Config) {
    this.logger = logger;
    this.config = config;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;

        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw new Error("Should not reach here");
  }

  protected async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timeout")), timeoutMs)
      )
    ]);
  }
}

// Specific service implementation
class TokenGenerationService extends BaseService {
  private readonly airClient: AIRClient;
  private readonly contractProvider: ContractProvider;

  constructor(
    logger: Logger,
    config: Config,
    airClient: AIRClient,
    contractProvider: ContractProvider
  ) {
    super(logger, config);
    this.airClient = airClient;
    this.contractProvider = contractProvider;
  }

  async generateTokensForCredential(credentialId: string): Promise<GenerationResult> {
    return this.withRetry(async () => {
      // Validate credential
      const isValid = await this.withTimeout(
        () => this.airClient.validateCredential(credentialId),
        5000
      );

      if (!isValid) {
        throw new Error(`Invalid credential: ${credentialId}`);
      }

      // Calculate emission
      const emission = await this.calculateEmission(credentialId);

      // Mint tokens
      const txHash = await this.contractProvider.mintTokens(credentialId, emission.amount);

      this.logger.info("Tokens generated successfully", {
        credentialId,
        amount: emission.amount,
        txHash
      });

      return { credentialId, amount: emission.amount, txHash };
    });
  }

  private async calculateEmission(credentialId: string): Promise<EmissionCalculation> {
    // Implementation
  }
}
```

### Repository Pattern
```typescript
// Generic repository interface
interface Repository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
  delete(id: K): Promise<boolean>;
}

// Token repository implementation
class TokenRepository implements Repository<TokenRecord, string> {
  constructor(private db: DatabaseConnection) {}

  async findById(address: string): Promise<TokenRecord | null> {
    const query = `
      SELECT * FROM tokens
      WHERE address = $1
    `;
    const result = await this.db.query(query, [address]);
    return result.rows[0] || null;
  }

  async findByCredentialId(credentialId: string): Promise<TokenRecord | null> {
    const query = `
      SELECT * FROM tokens
      WHERE credential_id = $1
    `;
    const result = await this.db.query(query, [credentialId]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<TokenRecord[]> {
    const query = `
      SELECT * FROM tokens
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  async create(token: Omit<TokenRecord, 'id'>): Promise<TokenRecord> {
    const query = `
      INSERT INTO tokens (
        address, credential_id, name, symbol, decimals,
        total_supply, max_supply, emission_rate, creator
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      token.address,
      token.credential_id,
      token.name,
      token.symbol,
      token.decimals,
      token.total_supply,
      token.max_supply,
      token.emission_rate,
      token.creator
    ];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async update(address: string, updates: Partial<TokenRecord>): Promise<TokenRecord> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const query = `
      UPDATE tokens
      SET ${setClause}, updated_at = NOW()
      WHERE address = $1
      RETURNING *
    `;

    const values = [address, ...Object.values(updates)];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async delete(address: string): Promise<boolean> {
    const query = `DELETE FROM tokens WHERE address = $1`;
    const result = await this.db.query(query, [address]);
    return result.rowCount > 0;
  }
}
```

## Testing Patterns

### Smart Contract Testing
```typescript
// Foundry test pattern
contract CredentialTokenTest is Test {
    CredentialToken public token;
    address public constant ALICE = address(0x1);
    address public constant BOB = address(0x2);
    bytes32 public constant CREDENTIAL_ID = keccak256("test-credential");

    function setUp() public {
        token = new CredentialToken(
            "Test Token",
            "TEST",
            CREDENTIAL_ID,
            1000 * 10**18, // emission rate
            1000000 * 10**18 // max supply
        );
    }

    function testMintSuccess() public {
        uint256 amount = 100 * 10**18;

        vm.prank(token.owner());
        token.grantRole(token.MINTER_ROLE(), address(this));

        token.mint(ALICE, amount);

        assertEq(token.balanceOf(ALICE), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testMintFailsWithoutRole() public {
        uint256 amount = 100 * 10**18;

        vm.expectRevert();
        token.mint(ALICE, amount);
    }

    function testEmissionRateUpdate() public {
        uint256 newRate = 2000 * 10**18;

        vm.prank(token.owner());
        token.setEmissionRate(newRate);

        assertEq(token.getEmissionRate(), newRate);
    }
}
```

### Frontend Component Testing
```typescript
// React Testing Library pattern
describe('TokenDashboard', () => {
  const mockTokens: Token[] = [
    {
      address: '0x123',
      credentialId: 'cred-1',
      name: 'Test Token',
      symbol: 'TEST',
      balance: 100,
      currentPrice: 1.5,
      reputationScore: 85
    }
  ];

  const mockProps = {
    tokens: mockTokens,
    isLoading: false,
    onClaimTokens: jest.fn(),
    userAddress: '0xuser'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays token information correctly', () => {
    render(<TokenDashboard {...mockProps} />);

    expect(screen.getByText('Test Token (TEST)')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('$1.50')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('calls onClaimTokens when claim button is clicked', async () => {
    render(<TokenDashboard {...mockProps} />);

    const claimButton = screen.getByText('Claim Tokens');
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockProps.onClaimTokens).toHaveBeenCalledWith('cred-1');
    });
  });

  it('shows loading state', () => {
    render(<TokenDashboard {...mockProps} isLoading={true} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### API Testing
```typescript
// Backend service testing pattern
describe('TokenGenerationService', () => {
  let service: TokenGenerationService;
  let mockAirClient: jest.Mocked<AIRClient>;
  let mockContractProvider: jest.Mocked<ContractProvider>;

  beforeEach(() => {
    mockAirClient = {
      validateCredential: jest.fn(),
      getCredentialMetadata: jest.fn()
    };

    mockContractProvider = {
      mintTokens: jest.fn(),
      getTokenContract: jest.fn()
    };

    service = new TokenGenerationService(
      mockLogger,
      mockConfig,
      mockAirClient,
      mockContractProvider
    );
  });

  it('generates tokens for valid credential', async () => {
    const credentialId = 'test-credential';
    mockAirClient.validateCredential.mockResolvedValue(true);
    mockContractProvider.mintTokens.mockResolvedValue('0x123hash');

    const result = await service.generateTokensForCredential(credentialId);

    expect(result.credentialId).toBe(credentialId);
    expect(result.txHash).toBe('0x123hash');
    expect(mockAirClient.validateCredential).toHaveBeenCalledWith(credentialId);
  });

  it('throws error for invalid credential', async () => {
    const credentialId = 'invalid-credential';
    mockAirClient.validateCredential.mockResolvedValue(false);

    await expect(
      service.generateTokensForCredential(credentialId)
    ).rejects.toThrow('Invalid credential');
  });
});
```

## Performance Patterns

### Caching Pattern
```typescript
// Redis caching with TTL
class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage in service
class PriceService {
  constructor(
    private cache: CacheService,
    private priceOracle: PriceOracle
  ) {}

  async getPrice(tokenAddress: string): Promise<number> {
    const cacheKey = `price:${tokenAddress}`;

    // Try cache first
    const cached = await this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    // Fetch from oracle
    const price = await this.priceOracle.getCurrentPrice(tokenAddress);

    // Cache for 1 minute
    await this.cache.set(cacheKey, price, 60);

    return price;
  }
}
```

These patterns ensure consistent, maintainable, and performant code across all sessions while following best practices for security, testing, and performance.