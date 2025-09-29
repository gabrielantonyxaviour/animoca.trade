# USDC-Based Fee Revenue Distribution System

## Overview

This document describes the transformation of the AIR Credential Token ecosystem from an emission-based system to a USDC-based fee collection and revenue distribution system. The new system enables token holders to earn USDC from verification activities, creating "turn credentials into liquid markets."

## System Architecture

### Core Components

1. **MockUSDC.sol** - Test USDC token with unlimited free minting
2. **FeeCollector.sol** - Replaces PassiveTokenGenerator with USDC fee collection
3. **CredentialAMM.sol** - USDC-based AMM for credential token liquidity
4. **CredentialTokenFactory.sol** - Updated to integrate with fee-based system
5. **CredentialToken.sol** - Unchanged, maintains ERC20 functionality

### Key Features

#### 🏦 Fee-Based Revenue Model
- **Minting Fees**: Paid in USDC when creating credential tokens
- **Verification Fees**: Paid in USDC for credential verification
- **High-Value Fees**: Premium fees for high-value credentials
- **Configurable Rates**: Different fee percentages per credential type

#### 💰 Revenue Distribution
- Token holders earn USDC proportional to their holdings
- Automatic distribution based on token supply
- 24-hour claim cooldown period
- Revenue pools track collection and distribution

#### 🔄 USDC-Based AMM
- All trading pairs use USDC as base currency
- Liquidity providers earn USDC trading fees
- Automated market making with constant product formula
- Slippage protection and deadline enforcement

#### ⚙️ Configuration System
- Global and credential-specific fee settings
- Protocol fee percentage for AMM operations
- Fee recipient management
- Emergency controls for admin functions

## Contract Addresses

After deployment, update these addresses in your configuration:

```solidity
// Example deployment addresses (update after deployment)
MockUSDC: 0x...
CredentialTokenFactory: 0x...
FeeCollector: 0x...
CredentialAMM: 0x...
```

## Deployment Guide

### Quick Local Deployment

```bash
# Set up environment
export PRIVATE_KEY=0x...

# Deploy system
forge script script/QuickDeploy.s.sol --broadcast --rpc-url <RPC_URL>

# Run tests
forge test -vv
```

### Comprehensive Deployment

```bash
# Deploy to Sepolia testnet
forge script script/DeployUSDCSystem.s.sol:DeployToSepolia \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Deploy to mainnet (uses real USDC)
forge script script/DeployUSDCSystem.s.sol:DeployToMainnet \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify
```

### Test Deployment

```bash
# Test the deployed system
export FACTORY_ADDRESS=0x...
export FEE_COLLECTOR_ADDRESS=0x...
export AMM_ADDRESS=0x...
export USDC_ADDRESS=0x...

forge script script/DeployUSDCSystem.s.sol:TestDeployment --broadcast
```

## Usage Examples

### Creating a Credential Token

```solidity
// User must have USDC and approve FeeCollector
usdc.approve(feeCollectorAddress, requiredFee);

// Create token (automatically collects minting fee)
address tokenAddress = factory.createToken(
    credentialId,
    "My Credential Token",
    "MCT",
    10 * 10**18,     // 10 tokens per day emission rate
    1000000 * 10**18 // 1M max supply
);
```

### Setting Up AMM Pool

```solidity
// Token creator or others can provide liquidity
credentialToken.approve(ammAddress, tokenAmount);
usdc.approve(ammAddress, usdcAmount);

uint256 liquidityMinted = amm.createPool(
    credentialId,
    tokenAddress,
    1000 * 10**18, // 1000 tokens
    1000 * 10**6   // 1000 USDC
);
```

### Earning Revenue from Verification

```solidity
// Verification fees are collected
uint256 feeAmount = feeCollector.collectVerificationFee(credentialId, payer);

// Revenue is distributed to token holders
uint256 distributed = feeCollector.distributeRevenue(credentialId);

// Token holders claim their share
uint256 rewards = feeCollector.claimRewards(credentialId);
```

### Trading Tokens

```solidity
// Buy tokens with USDC
usdc.approve(ammAddress, usdcAmount);
uint256 tokensReceived = amm.swapUSDCForTokens(
    credentialId,
    100 * 10**6,           // 100 USDC
    minimumTokensOut,
    block.timestamp + 3600 // 1 hour deadline
);

// Sell tokens for USDC
credentialToken.approve(ammAddress, tokenAmount);
uint256 usdcReceived = amm.swapTokensForUSDC(
    credentialId,
    tokenAmount,
    minimumUSDCOut,
    block.timestamp + 3600
);
```

## Fee Structure

### Default Global Fees

- **Minting Fee**: 1.0% (100 basis points)
- **Verification Fee**: 0.5% (50 basis points)
- **High Value Fee**: 2.0% (200 basis points)
- **AMM Protocol Fee**: 5.0% (500 basis points)
- **Trading Fee**: 0.3% (30 basis points)

### Fee Calculation

Fees are calculated as a percentage of a base amount:

```solidity
feeAmount = (baseAmount * feePercentage) / 10000;
```

For testing, the base amount is set to 10 USDC, so:
- Minting fee = 10 USDC * 1% = 0.1 USDC
- Verification fee = 10 USDC * 0.5% = 0.05 USDC
- High value fee = 10 USDC * 2% = 0.2 USDC

## Testing

The comprehensive test suite covers:

✅ **MockUSDC Functionality**
- Free minting and transfers
- Batch operations
- Admin controls

✅ **Fee Collection System**
- Minting, verification, and high-value fees
- Revenue distribution calculations
- Reward claiming with cooldowns

✅ **AMM Operations**
- Pool creation and liquidity management
- Token swapping with slippage protection
- Trading fee collection and distribution

✅ **Integration Scenarios**
- Full user journey from token creation to revenue earning
- Multiple user interactions
- Error conditions and edge cases

### Running Tests

```bash
# Run all tests
forge test

# Run specific test contract
forge test --match-contract USDCSystemTest

# Run with detailed output
forge test -vvv

# Run specific test function
forge test --match-test testFullUserJourney -vvv
```

## Security Considerations

### ✅ Implemented Protections

- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Access Control**: Owner-only admin functions
- **Input Validation**: Parameter bounds checking
- **Slippage Protection**: AMM trade safeguards
- **Deadline Enforcement**: Time-bound transactions
- **Claim Cooldowns**: Prevents gaming rewards

### 🔐 Admin Functions

The following functions are restricted to contract owners:

**FeeCollector**:
- `setFeeConfig()` - Configure credential-specific fees
- `setGlobalFees()` - Set default fee percentages
- `setUSDCAddress()` - Update USDC token address
- `emergencyWithdraw()` - Emergency USDC withdrawal

**CredentialAMM**:
- `setTradingFee()` - Configure trading fees per pool
- `setProtocolFeePercentage()` - Set protocol fee rate
- `setFeeRecipient()` - Update fee recipient address
- `setUSDCAddress()` - Update USDC token address

**CredentialTokenFactory**:
- `setFeeCollector()` - Configure FeeCollector address
- `setUSDCToken()` - Set USDC token address
- `setTokenMinter()` - Authorize token minters
- `setCredentialVerifier()` - Set verification contract

### ⚠️ Production Considerations

For mainnet deployment:

1. **Use Real USDC**: Replace MockUSDC with actual USDC token (0xA0b86a33E6441F8F10c8E8C7C9C6C06Cb0E73d4D)
2. **Multisig Ownership**: Transfer ownership to multisig wallets
3. **Conservative Fees**: Start with lower fee percentages
4. **Circuit Breakers**: Implement emergency pause functionality
5. **Oracle Integration**: Add price feeds for dynamic fee calculation
6. **Audit**: Complete security audit before mainnet launch

## Migration from Previous System

### Key Changes

1. **PassiveTokenGenerator** → **FeeCollector**
   - Emission-based rewards → Fee-based revenue
   - ETH payments → USDC payments
   - Time-based claiming → Activity-based earning

2. **Token Creation**
   - Now requires USDC fee payment
   - Automatic FeeCollector integration
   - USDC approval required

3. **Revenue Model**
   - Token holders earn from verification fees
   - Proportional distribution based on holdings
   - Sustainable revenue from platform activity

### Frontend Integration

Update your frontend to:

1. **Handle USDC Approvals**: Users must approve USDC spending
2. **Display Fee Information**: Show fee costs before transactions
3. **Revenue Dashboard**: Show claimable USDC rewards
4. **AMM Interface**: USDC-based trading interface
5. **Pool Management**: Liquidity provision with USDC pairs

## Support and Documentation

- **Repository**: [GitHub Repository]
- **Documentation**: See `/docs` folder for detailed specifications
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **Technical Architecture**: `docs/TECHNICAL_ARCHITECTURE.md`
- **Token Economics**: `docs/TOKEN_ECONOMICS.md`

## Next Steps

1. **Deploy to Testnet**: Use Sepolia for initial testing
2. **Frontend Integration**: Update UI for USDC-based flows
3. **User Testing**: Gather feedback on new fee model
4. **Security Audit**: Professional security review
5. **Mainnet Launch**: Production deployment with real USDC

---

**Note**: This system represents a fundamental shift to a sustainable, fee-based revenue model where token holders earn USDC from platform verification activities, creating true value for credential token ownership.