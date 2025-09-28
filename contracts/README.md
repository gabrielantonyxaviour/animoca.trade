# Smart Contracts - Credential Token Ecosystem

This directory contains all smart contracts for the credential token ecosystem.

## Development Setup

**Session 1 Responsibility**: Set up this entire development environment

### Prerequisites
- Node.js 18+
- Foundry (recommended) or Hardhat
- Git

### Installation
```bash
cd contracts
forge install
```

### Build & Test
```bash
forge build
forge test
forge coverage
```

### Deploy
```bash
# Deploy to Sepolia testnet
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

## Directory Structure

```
contracts/
├── src/
│   ├── interfaces/          # Core interface definitions (Session 1)
│   ├── tokens/             # Token contracts (Session 2)
│   ├── pools/              # AMM pool contracts (Session 3)
│   ├── generation/         # Passive generation contracts (Session 6)
│   └── oracle/             # Reputation oracle contracts (Session 7)
├── test/                   # Test files
├── script/                 # Deployment scripts
└── lib/                    # Dependencies
```

## Session Responsibilities

### Session 1: Foundation & Smart Contract Setup ✅
- [x] Set up Foundry development environment
- [ ] Create all interface definitions in `src/interfaces/`
- [ ] Establish testing framework and deployment scripts
- [ ] Export ABIs to frontend integration

### Session 2: Core Token Contracts
- [ ] Implement `CredentialToken.sol` in `src/tokens/`
- [ ] Implement `CredentialTokenFactory.sol` in `src/tokens/`
- [ ] Comprehensive testing with 95%+ coverage
- [ ] Deploy to testnet and update contract addresses

### Session 3: AMM Pool Implementation
- [ ] Implement `PoolFactory.sol` in `src/pools/`
- [ ] Implement `CredentialPool.sol` in `src/pools/`
- [ ] Trading and liquidity provision functionality
- [ ] Integration with token contracts

### Session 6: Passive Token Generation
- [ ] Implement `PassiveTokenGenerator.sol` in `src/generation/`
- [ ] AIR credential validation integration
- [ ] Emission rate calculations and minting logic
- [ ] Background service integration points

### Session 7: Analytics & Reputation System
- [ ] Implement `ReputationOracle.sol` in `src/oracle/`
- [ ] TWAP price calculation and storage
- [ ] Reputation scoring algorithms
- [ ] Historical data aggregation

## Integration Points

### Frontend Integration
- ABIs exported to `/src/types/contracts.ts`
- Contract addresses in `/src/config/contracts.ts`
- TypeScript types for all contract interactions

### Backend Integration
- Event listening for price updates, trades, minting
- API endpoints for contract data queries
- Real-time data streaming

## Testing Requirements

- **Unit Tests**: 95%+ line coverage for all contracts
- **Integration Tests**: Cross-contract interaction testing
- **Gas Testing**: Optimization for deployment and execution costs
- **Security Testing**: Reentrancy, overflow, access control testing

## Security Considerations

- All contracts use OpenZeppelin security patterns
- Access control with role-based permissions
- Reentrancy guards on financial functions
- Input validation and error handling
- Regular security audits (planned for Session 8)

## Contract Addresses

Deployed contract addresses are maintained in `/src/config/contracts.ts` and updated by each session upon successful deployment.