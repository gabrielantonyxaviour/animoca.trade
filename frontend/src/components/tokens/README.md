# Token Management Components

**Session 4 Responsibility**: Implement all components in this directory

## Component Overview

This directory contains all frontend components for token management functionality, including token creation, portfolio management, and passive token claiming.

## Components to Implement

### TokenDashboard.tsx
**Main dashboard for user's token portfolio**

**Features**:
- Display all tokens associated with user's credentials
- Show current balances, prices, and values
- Quick actions (claim, trade, manage)
- Portfolio performance metrics

**Props Interface**:
```typescript
interface TokenDashboardProps {
  airService: AirService | null;
  userAddress: string | null;
  isLoading: boolean;
  onTokenCreate?: () => void;
  onTokenClaim?: (credentialId: string) => void;
}
```

### TokenCreationForm.tsx
**Form for creating new tokens from credentials**

**Features**:
- Credential selection from user's AIR credentials
- Token configuration (name, symbol, emission rate, max supply)
- Initial liquidity provision setup
- Transaction handling and confirmation

**Props Interface**:
```typescript
interface TokenCreationFormProps {
  userCredentials: Credential[];
  onTokenCreate: (params: CreateTokenParams) => Promise<void>;
  isLoading: boolean;
  onSuccess?: (tokenAddress: string) => void;
}
```

### TokenPortfolio.tsx
**Detailed portfolio view with analytics**

**Features**:
- Comprehensive token holdings overview
- Performance charts and historical data
- Reputation scores and rankings
- Detailed token metadata

**Props Interface**:
```typescript
interface TokenPortfolioProps {
  tokens: Token[];
  totalValue: number;
  priceData: Map<string, PriceData[]>;
  onTokenSelect?: (token: Token) => void;
}
```

### ClaimTokensInterface.tsx
**Interface for claiming passively generated tokens**

**Features**:
- Display claimable tokens for each credential
- Batch claiming functionality
- Claiming history and statistics
- Next claim timing information

**Props Interface**:
```typescript
interface ClaimTokensInterfaceProps {
  claimableTokens: ClaimableToken[];
  onClaim: (credentialIds: string[]) => Promise<void>;
  isLoading: boolean;
  onSuccess?: (claimedAmount: number) => void;
}
```

### TokenCard.tsx
**Reusable token display component**

**Features**:
- Token metadata display (name, symbol, balance, price)
- Quick action buttons (claim, trade, details)
- Reputation score indicator
- Price change indicators

**Props Interface**:
```typescript
interface TokenCardProps {
  token: Token;
  userBalance?: number;
  showActions?: boolean;
  onClaim?: () => void;
  onTrade?: () => void;
  onViewDetails?: () => void;
}
```

## Integration Requirements

### AIR SDK Integration
```typescript
// Use existing AIR service for credential validation
const { airService, isLoggedIn, userAddress } = useAuth();

// Get user's credentials
const getUserCredentials = async () => {
  const credentials = await airService.getUserCredentials();
  return credentials.filter(cred => cred.status === 'ACTIVE');
};
```

### Contract Integration
```typescript
// Use contract hooks for Web3 interactions
const { contract: factory } = useContract(
  CONTRACT_ADDRESSES.CREDENTIAL_TOKEN_FACTORY,
  CONTRACT_ABIS.CredentialTokenFactory,
  true // with signer
);

const createToken = async (params: CreateTokenParams) => {
  const tx = await factory.createToken(
    params.credentialId,
    params.name,
    params.symbol,
    params.emissionRate,
    params.maxSupply
  );
  return tx.wait();
};
```

### State Management
```typescript
// Use React hooks for component state
const useTokenManagement = () => {
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [claimableTokens, setClaimableTokens] = useState<ClaimableToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Token operations
  const createToken = async (params: CreateTokenParams) => { /* */ };
  const claimTokens = async (credentialIds: string[]) => { /* */ };
  const refreshPortfolio = async () => { /* */ };

  return {
    userTokens,
    claimableTokens,
    isLoading,
    createToken,
    claimTokens,
    refreshPortfolio
  };
};
```

## Routing Integration

### New Routes to Add
```typescript
// In App.tsx, add these routes
<Route path="/tokens" element={<TokenDashboard />} />
<Route path="/tokens/create" element={<TokenCreationForm />} />
<Route path="/tokens/portfolio" element={<TokenPortfolio />} />
<Route path="/tokens/claim" element={<ClaimTokensInterface />} />
```

### Navigation Updates
```typescript
// Update navigation in NavBarLogin.tsx or main nav
<nav>
  <Link to="/issue">Issuance</Link>
  <Link to="/verify">Verification</Link>
  <Link to="/tokens">Tokens</Link> {/* New */}
  <Link to="/trade">Trade</Link>     {/* Session 5 */}
</nav>
```

## Design Patterns

### Component Structure
```typescript
// Follow this pattern for all components
const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  // Hooks
  const [state, setState] = useState();
  const { data, loading, error } = useCustomHook();

  // Event handlers
  const handleAction = useCallback(() => {
    onAction?.(data);
  }, [onAction, data]);

  // Render guards
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
};
```

### Error Handling
```typescript
// Use error boundaries and proper error states
const TokenManagementErrorBoundary: React.FC<{children}> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<TokenErrorFallback />}
      onError={(error) => console.error('Token component error:', error)}
    >
      {children}
    </ErrorBoundary>
  );
};
```

### Loading States
```typescript
// Consistent loading patterns
const LoadingState = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);
```

## Styling Guidelines

### Tailwind CSS Classes
```typescript
// Consistent styling patterns
const cardClasses = "bg-white rounded-lg shadow-lg p-6 border border-gray-200";
const buttonClasses = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors";
const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500";
```

### Color Scheme
- Primary: Blue tones (existing brand colors)
- Success: Green for positive actions
- Warning: Yellow for caution states
- Error: Red for error states
- Neutral: Gray scale for backgrounds and text

## Testing Requirements

### Component Tests
```typescript
// Example test structure
describe('TokenDashboard', () => {
  const mockProps = {
    tokens: mockTokenData,
    userAddress: '0x123',
    isLoading: false,
    onTokenCreate: jest.fn()
  };

  it('displays token portfolio correctly', () => {
    render(<TokenDashboard {...mockProps} />);
    expect(screen.getByText('Token Portfolio')).toBeInTheDocument();
  });

  it('handles token creation', async () => {
    render(<TokenDashboard {...mockProps} />);
    fireEvent.click(screen.getByText('Create Token'));
    expect(mockProps.onTokenCreate).toHaveBeenCalled();
  });
});
```

### Coverage Requirements
- **Unit Tests**: 80%+ coverage for all components
- **Integration Tests**: Key user flows tested
- **Accessibility Tests**: WCAG compliance verification

## Success Criteria

Session 4 is complete when:
- [ ] All token management components implemented
- [ ] Integration with existing AIR system working
- [ ] Contract interactions functional
- [ ] Responsive design across devices
- [ ] Comprehensive test coverage
- [ ] Documentation complete for Session 5 integration

## Handoff to Session 5

Provide these deliverables for Session 5 (Trading Interface):
- Reusable TokenCard component
- Token selection patterns
- Web3 integration hooks
- UI component library
- State management patterns