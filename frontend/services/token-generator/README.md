# Token Generator Service

Backend service for managing passive token generation for credential holders.

## Overview

This service provides the interface between the frontend application and the PassiveTokenGenerator smart contract. It handles token claiming, emission calculations, statistics tracking, and validation.

## Structure

```
token-generator/
├── index.ts                 # Main export file
├── TokenGeneratorService.ts # Core service implementation
├── types.ts                 # TypeScript type definitions
├── hooks.ts                 # React hooks for integration
├── utils.ts                 # Utility functions
├── constants.ts            # Constants and configurations
└── README.md              # This file
```

## Features

### Core Functionality

- **Token Claiming**: Single and batch claiming of accumulated tokens
- **Emission Calculation**: Calculate token emissions based on the formula
- **Statistics Tracking**: Credential and global statistics
- **Validation**: Credential ownership validation
- **Rate Limiting**: Enforces minimum claim intervals

### Emission Formula

```
Daily Emission = Base Rate × Credential Multiplier × Time Decay × Anti-Inflation Factor
```

- **Base Rate**: 10-50 tokens/day (configurable)
- **Credential Multiplier**: 0.8x to 5x based on credential type
- **Time Decay**: 1% monthly reduction
- **Anti-Inflation Factor**: 0.8x to 1.2x market-based adjustment

## Usage

### Basic Setup

```typescript
import { TokenGeneratorService } from './services/token-generator';

// Initialize service
const service = new TokenGeneratorService(provider);
await service.initialize(signer);
```

### Using React Hooks

```typescript
import { useClaimTokens, useClaimableTokens } from './services/token-generator';

function ClaimComponent({ credentialId }) {
  const { claimTokens, loading, error } = useClaimTokens();
  const { data: claimable } = useClaimableTokens(credentialId, 60000); // Refresh every minute

  const handleClaim = async () => {
    const result = await claimTokens(credentialId);
    console.log(`Claimed ${result.amountClaimed} tokens`);
  };

  return (
    <div>
      <p>Claimable: {claimable?.claimableAmount}</p>
      <button onClick={handleClaim} disabled={loading}>
        Claim Tokens
      </button>
    </div>
  );
}
```

### Batch Claims

```typescript
const { batchClaimTokens } = useBatchClaimTokens();

const credentialIds = ['CRED_001', 'CRED_002', 'CRED_003'];
const result = await batchClaimTokens(credentialIds);
console.log(`Total claimed: ${result.totalClaimed}`);
```

## Smart Contract Integration

The service integrates with two main contracts:

1. **PassiveTokenGenerator**: Handles token generation and claiming
2. **CredentialTokenFactory**: Manages token creation and minter authorization

## Configuration

Update contract addresses in `constants.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  mainnet: {
    factory: '0x...',
    generator: '0x...',
  },
  // ... other networks
};
```

## Testing

To test the contracts:

```bash
cd contracts
forge test --match-path test/GenerationTests.t.sol -vvv
```

## Credential Type Multipliers

| Category | Type | Multiplier |
|----------|------|------------|
| **Education** | High School | 1.0x |
| | Bachelor's | 1.5x |
| | Master's | 2.0x |
| | PhD | 3.0x |
| **Professional** | Basic Cert | 1.2x |
| | Advanced Cert | 1.8x |
| | Expert Cert | 2.5x |
| | Leadership | 4.0x |
| **Skills** | Basic | 0.8x |
| | Intermediate | 1.2x |
| | Advanced | 1.8x |
| | Master | 2.5x |
| **Rare** | Competition | 3.5x |
| | Award | 4.5x |
| | Patent | 5.0x |

## Anti-Gaming Measures

1. **Minimum 24-hour claim interval**: Prevents rapid claiming
2. **Credential validation**: Only valid credential holders can claim
3. **Time decay**: Reduces emissions over time to prevent inflation
4. **Max supply caps**: Each token has a maximum supply limit
5. **Rate limiting**: Prevents spam and gaming attempts

## Future Enhancements

- [ ] AIR credential verification integration
- [ ] Advanced emission formulas
- [ ] Cross-chain support
- [ ] Delegation mechanisms
- [ ] Staking rewards
- [ ] Governance integration

## Dependencies

- ethers.js v5+
- React 18+
- wagmi (for wallet connection)
- TypeScript 4.5+

## License

MIT