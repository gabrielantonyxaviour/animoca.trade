# Session 1: Foundation & Smart Contract Setup

## 📋 Session Overview

**Duration**: 3-4 hours
**Prerequisites**: None
**Status**: 🔄 **READY TO START**

## 🎯 Mission Statement

Set up the smart contract development environment and create all core interface definitions that will enable the entire credential-token ecosystem. This session creates the foundation that all subsequent sessions will build upon.

## 📚 Required Reading (COMPLETE BEFORE STARTING)

**CRITICAL**: You MUST read these files in order to understand the complete context:

1. **📖 PROJECT_VISION.md** - Understand what we're building and why
2. **🏗️ TECHNICAL_ARCHITECTURE.md** - Understand the system design
3. **🔌 INTEGRATION_CONTRACTS.md** - Understand exact interface requirements
4. **📋 DESIGN_PATTERNS.md** - Understand coding standards
5. **💰 TOKEN_ECONOMICS.md** - Understand the economic model
6. **📊 CURRENT_STATE.md** - Understand current progress

## 🎯 Context Validation Checklist

Before you start coding, ensure you can answer these questions:

### Business Context
- [ ] What is the core value proposition of credential tokens?
- [ ] How do credential holders make money from this system?
- [ ] What role does your foundation work play in the user journey?

### Technical Context
- [ ] How does the system integrate with existing AIR credentials?
- [ ] What are the 5 core smart contracts you need to create interfaces for?
- [ ] Which sessions depend on your interface definitions?

### Integration Context
- [ ] What exact interface methods must each contract implement?
- [ ] How will frontend sessions consume your contract ABIs?
- [ ] How will your deployment addresses get to the frontend?

## 🚀 Session Deliverables

### 1. Smart Contract Development Environment

#### Foundry Framework Setup
```bash
# Your environment should support these commands
forge build
forge test
forge script
forge coverage
```

**Required Configuration**:
- Solidity version: ^0.8.19 (for gas optimization)
- Test framework: Foundry (preferred) or Hardhat fallback
- Gas reporting enabled
- Coverage reporting enabled
- Testnet deployment configured (Sepolia)

#### Project Structure Creation
```
contracts/
├── foundry.toml                    # Foundry configuration
├── package.json                    # Dependencies and scripts
├── README.md                       # Setup instructions
├── src/
│   ├── interfaces/                 # Core interface definitions
│   │   ├── ICredentialToken.sol
│   │   ├── ICredentialTokenFactory.sol
│   │   ├── ICredentialPool.sol
│   │   ├── IPassiveTokenGenerator.sol
│   │   └── IReputationOracle.sol
│   ├── tokens/                     # Setup for Session 2
│   ├── pools/                      # Setup for Session 3
│   ├── generation/                 # Setup for Session 6
│   └── oracle/                     # Setup for Session 7
├── test/                           # Test framework
│   ├── interfaces/                 # Interface tests
│   ├── mocks/                      # Mock contracts
│   └── utils/                      # Test utilities
├── script/                         # Deployment scripts
│   ├── Deploy.s.sol               # Main deployment script
│   └── DeployInterfaces.s.sol     # Interface deployment
└── lib/                           # Dependencies (forge install)
```

### 2. Core Interface Definitions

You MUST implement these **exact** interfaces from INTEGRATION_CONTRACTS.md:

#### ICredentialToken.sol
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

**CRITICAL**: You must implement ALL interfaces exactly as specified in INTEGRATION_CONTRACTS.md. Any deviations must be documented and justified in your handoff document.

### 3. Test Framework Setup

#### Required Test Structure
```solidity
// Example test pattern you must follow
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/interfaces/ICredentialToken.sol";

contract CredentialTokenInterfaceTest is Test {
    // Mock implementation for testing
    MockCredentialToken token;

    function setUp() public {
        token = new MockCredentialToken();
    }

    function testInterfaceCompliance() public {
        // Test all interface methods are callable
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        // ... test all interface methods
    }

    function testEventEmission() public {
        // Test all events are properly emitted
        vm.expectEmit(true, true, false, true);
        emit ICredentialToken.TokenMinted(address(this), 100, bytes32("test"), block.timestamp);

        token.mint(address(this), 100);
    }
}
```

#### Testing Requirements
- [ ] Interface compilation tests (all interfaces compile without errors)
- [ ] Mock implementations for testing interface compliance
- [ ] Event emission tests for all defined events
- [ ] Gas usage tests for interface methods
- [ ] Integration test stubs for future sessions

### 4. Deployment Infrastructure

#### Deployment Script Template
```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/interfaces/ICredentialToken.sol";
// ... other interface imports

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy interface implementations (when ready)
        // For now, just verify compilation

        vm.stopBroadcast();
    }
}
```

#### Environment Configuration
```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
gas_reports = ["*"]

[profile.ci]
fuzz_runs = 10000

[rpc_endpoints]
sepolia = "${SEPOLIA_RPC_URL}"
mainnet = "${MAINNET_RPC_URL}"

[etherscan]
sepolia = { key = "${ETHERSCAN_API_KEY}" }
```

### 5. Frontend Integration Setup

#### Contract ABI Export
You must create this **exact** file structure for frontend integration:

```typescript
// src/types/contracts.ts (to be created)
// This file will be imported by Sessions 4, 5, 7

export const CONTRACT_ADDRESSES = {
  // Will be populated after deployments
  CREDENTIAL_TOKEN_FACTORY: "",
  PASSIVE_TOKEN_GENERATOR: "",
  REPUTATION_ORACLE: "",
} as const;

export const CONTRACT_ABIS = {
  CredentialToken: [], // Generated from ICredentialToken
  CredentialTokenFactory: [], // Generated from ICredentialTokenFactory
  CredentialPool: [], // Generated from ICredentialPool
  PassiveTokenGenerator: [], // Generated from IPassiveTokenGenerator
  ReputationOracle: [], // Generated from IReputationOracle
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
export type ContractABIs = typeof CONTRACT_ABIS;
```

## 🔄 Integration Requirements

### For Session 2 (Core Token Contracts)
- [ ] Working Foundry environment with all dependencies
- [ ] ICredentialToken interface compiling and tested
- [ ] ICredentialTokenFactory interface compiling and tested
- [ ] Clear implementation guidelines in handoff documentation

### For Session 3 (AMM Implementation)
- [ ] ICredentialPool interface compiling and tested
- [ ] Pool mathematics documented and tested
- [ ] Integration patterns with token contracts defined

### For Session 4 (Token Management UI)
- [ ] Contract ABIs exported to `/src/types/contracts.ts`
- [ ] TypeScript type definitions available
- [ ] Web3 integration patterns documented

### For Session 6 (Passive Generation)
- [ ] IPassiveTokenGenerator interface compiling and tested
- [ ] Minting permission patterns defined
- [ ] AIR integration points documented

### For Session 7 (Analytics System)
- [ ] IReputationOracle interface compiling and tested
- [ ] Event structure documented for price tracking
- [ ] Data aggregation patterns defined

## ⚠️ Critical Decision Points

### 1. Development Framework Choice
**Decision**: Foundry vs Hardhat
- **Recommended**: Foundry (faster, better gas testing)
- **Fallback**: Hardhat (if Foundry setup issues)
- **Requirement**: Document choice and setup instructions

### 2. Solidity Version
**Decision**: 0.8.19+ required
- **Reason**: Gas optimization features needed
- **Requirement**: Must be compatible with OpenZeppelin contracts

### 3. Test Network
**Decision**: Sepolia for initial development
- **Reason**: Stable, well-supported testnet
- **Requirement**: Deployment scripts must support Sepolia

### 4. Interface Modifications
**Decision**: Stick to INTEGRATION_CONTRACTS.md specifications
- **Allowance**: Minor modifications only if absolutely necessary
- **Requirement**: Document all changes with justification

## ✅ Success Criteria

Your session is successful when ALL of these criteria are met:

### Environment Criteria
- [ ] `forge build` compiles all contracts without errors
- [ ] `forge test` runs all tests successfully
- [ ] `forge script` can deploy to Sepolia testnet
- [ ] All dependencies installed and working

### Interface Criteria
- [ ] All 5 core interfaces compile successfully
- [ ] Interface methods match INTEGRATION_CONTRACTS.md exactly
- [ ] All events are properly defined
- [ ] Mock implementations for testing exist

### Testing Criteria
- [ ] Interface compliance tests pass
- [ ] Event emission tests pass
- [ ] Gas usage is within reasonable limits
- [ ] Test coverage is established

### Integration Criteria
- [ ] Contract ABIs exported to frontend types
- [ ] Deployment scripts are functional
- [ ] Documentation is complete for next sessions
- [ ] File structure matches requirements

### Documentation Criteria
- [ ] Setup instructions for environment
- [ ] Any interface deviations documented
- [ ] Next session requirements clearly stated
- [ ] Integration patterns documented

## 📋 Handoff Checklist

When you complete this session, create `session-01-handoff.md` with:

### Required Handoff Information
- [ ] **Environment Setup**: Step-by-step setup instructions
- [ ] **Interface Changes**: Any deviations from original specifications
- [ ] **Testing Results**: Test coverage and results summary
- [ ] **Deployment Status**: Testnet deployment results
- [ ] **Integration Notes**: How Sessions 2-7 should use your work
- [ ] **Blockers/Issues**: Any problems discovered or decisions needed
- [ ] **Next Session Ready**: Confirmation that Session 2 can start

### Files That Must Exist After Session 1
```
contracts/foundry.toml                     ✅ Working configuration
contracts/src/interfaces/*.sol             ✅ All 5 interfaces compiling
contracts/test/interfaces/*.sol            ✅ Interface tests passing
contracts/script/Deploy.s.sol              ✅ Deployment script working
src/types/contracts.ts                     ✅ Frontend integration ready
docs/sessions/session-01-handoff.md       ✅ Complete handoff documentation
```

## 🚨 Emergency Procedures

### If Foundry Setup Fails
1. Document the specific error
2. Attempt Hardhat alternative setup
3. Update handoff documentation with framework choice
4. Ensure all interface requirements still met

### If Interface Compilation Fails
1. Check Solidity version compatibility
2. Verify OpenZeppelin imports
3. Ensure interface method signatures are correct
4. Document any required modifications

### If Testnet Deployment Fails
1. Verify RPC endpoint configuration
2. Check private key and gas settings
3. Document network issues
4. Provide alternative deployment strategies

## 💡 Tips for Success

1. **Read All Documentation First**: Don't skip the required reading
2. **Follow Exact Specifications**: Interfaces must match INTEGRATION_CONTRACTS.md
3. **Test Everything**: Every interface method should have tests
4. **Document Decisions**: Explain any choices or modifications
5. **Think Integration**: Consider how other sessions will use your work

---

## 🔥 Ready to Start Session 1!

You have everything needed to begin. This foundation session enables the entire credential token ecosystem. Take your time to understand the context fully before beginning implementation.

**Next Step**: Begin by reading all required documentation, then set up your development environment following the specifications above.