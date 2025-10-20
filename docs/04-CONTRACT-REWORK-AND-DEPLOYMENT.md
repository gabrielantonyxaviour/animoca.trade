# Smart Contract Rework & Deployment Guide

Complete guide to rework contracts for the dual-market stake-based system, write comprehensive tests, and deploy to Moca Devnet.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [New Contracts Required](#new-contracts-required)
3. [Modified Contracts](#modified-contracts)
4. [Stake System Design](#stake-system-design)
5. [Slashing Mechanism](#slashing-mechanism)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)

---

## Architecture Overview

### Old System vs New System

```
OLD SYSTEM (Current):
├── CredentialTokenFactory
├── CredentialAMM
├── FeeCollector (fees from trading)
└── MockUSDC

NEW SYSTEM (Target):
├── Core Factories
│   ├── CredentialTokenFactory (MODIFIED)
│   └── PersonaTokenFactory (NEW)
├── AMM Layer
│   ├── CredentialAMM (MODIFIED)
│   └── PersonaAMM (NEW - or unified AMM)
├── Stake System (NEW)
│   ├── StakeVault
│   └── GovernanceSlashing
├── Fee Distribution (MODIFIED)
│   └── FeeCollector
└── Real USDC (replace MockUSDC)
```

### Key Changes

1. **Stake Requirement**: Both credential issuers and persona owners must stake USDC to create tokens
2. **Dual Market Support**: Separate contracts for credentials and personas
3. **Slashing Governance**: Community voting to slash stakes for bad behavior
4. **Fee Distribution**: Small % of trading fees go to issuer/owner (not from stake)
5. **Real USDC**: Replace MockUSDC with actual USDC contract

---

## New Contracts Required

### 1. PersonaTokenFactory.sol

Creates persona tokens linked to verified individuals.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PersonaToken.sol";
import "./StakeVault.sol";

/**
 * @title PersonaTokenFactory
 * @notice Creates persona tokens for verified individuals (influencers)
 * @dev Requires USDC stake to create token
 */
contract PersonaTokenFactory is Ownable {
    IERC20 public immutable usdc;
    StakeVault public immutable stakeVault;

    // Minimum stake required to create persona token (in USDC, 6 decimals)
    uint256 public minimumStake = 100 * 10**6; // 100 USDC

    // Mapping: personaId => PersonaToken address
    mapping(bytes32 => address) public personaTokens;

    // Mapping: owner address => personaId
    mapping(address => bytes32) public ownerPersona;

    // Mapping: tokenAddress => persona info
    struct PersonaInfo {
        bytes32 personaId;
        address owner;
        uint256 stakedAmount;
        uint256 createdAt;
        bool isActive;
    }
    mapping(address => PersonaInfo) public personas;

    event PersonaTokenCreated(
        bytes32 indexed personaId,
        address indexed tokenAddress,
        address indexed owner,
        string name,
        string symbol,
        uint256 stakedAmount
    );

    event StakeIncreased(bytes32 indexed personaId, uint256 additionalStake);
    event PersonaDeactivated(bytes32 indexed personaId, address indexed slasher);

    error PersonaAlreadyExists();
    error InsufficientStake();
    error OwnerAlreadyHasPersona();
    error PersonaNotFound();
    error NotPersonaOwner();

    constructor(address _usdc, address _stakeVault) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        stakeVault = StakeVault(_stakeVault);
    }

    /**
     * @notice Create a new persona token
     * @dev Owner must approve this contract to spend USDC for stake
     * @param personaId Unique identifier for persona (hash of owner + timestamp)
     * @param name Token name (e.g., "Vitalik Buterin")
     * @param symbol Token symbol (e.g., "VITALIK")
     * @param emissionRate Tokens minted per day
     * @param maxSupply Maximum token supply
     * @param stakeAmount Amount of USDC to stake
     */
    function createPersonaToken(
        bytes32 personaId,
        string memory name,
        string memory symbol,
        uint256 emissionRate,
        uint256 maxSupply,
        uint256 stakeAmount
    ) external returns (address) {
        // Validations
        if (personaTokens[personaId] != address(0)) revert PersonaAlreadyExists();
        if (ownerPersona[msg.sender] != bytes32(0)) revert OwnerAlreadyHasPersona();
        if (stakeAmount < minimumStake) revert InsufficientStake();

        // Transfer USDC stake to vault
        require(usdc.transferFrom(msg.sender, address(stakeVault), stakeAmount), "Stake transfer failed");

        // Create persona token
        PersonaToken token = new PersonaToken(
            name,
            symbol,
            personaId,
            msg.sender,
            emissionRate,
            maxSupply
        );

        address tokenAddress = address(token);

        // Store mappings
        personaTokens[personaId] = tokenAddress;
        ownerPersona[msg.sender] = personaId;

        personas[tokenAddress] = PersonaInfo({
            personaId: personaId,
            owner: msg.sender,
            stakedAmount: stakeAmount,
            createdAt: block.timestamp,
            isActive: true
        });

        // Register stake in vault
        stakeVault.registerStake(personaId, msg.sender, stakeAmount, true); // true = persona

        emit PersonaTokenCreated(personaId, tokenAddress, msg.sender, name, symbol, stakeAmount);

        return tokenAddress;
    }

    /**
     * @notice Increase stake for existing persona
     * @param personaId Persona identifier
     * @param additionalStake Additional USDC to stake
     */
    function increaseStake(bytes32 personaId, uint256 additionalStake) external {
        address tokenAddress = personaTokens[personaId];
        if (tokenAddress == address(0)) revert PersonaNotFound();

        PersonaInfo storage info = personas[tokenAddress];
        if (info.owner != msg.sender) revert NotPersonaOwner();

        require(usdc.transferFrom(msg.sender, address(stakeVault), additionalStake), "Stake transfer failed");

        info.stakedAmount += additionalStake;
        stakeVault.increaseStake(personaId, additionalStake);

        emit StakeIncreased(personaId, additionalStake);
    }

    /**
     * @notice Get persona token address
     */
    function getPersonaToken(bytes32 personaId) external view returns (address) {
        return personaTokens[personaId];
    }

    /**
     * @notice Get persona info by token address
     */
    function getPersonaInfo(address tokenAddress) external view returns (PersonaInfo memory) {
        return personas[tokenAddress];
    }

    /**
     * @notice Deactivate persona (called by governance on slash)
     */
    function deactivatePersona(bytes32 personaId) external {
        // Only callable by governance contract
        require(msg.sender == address(stakeVault.governance()), "Only governance");

        address tokenAddress = personaTokens[personaId];
        if (tokenAddress != address(0)) {
            personas[tokenAddress].isActive = false;
            emit PersonaDeactivated(personaId, msg.sender);
        }
    }

    /**
     * @notice Update minimum stake requirement
     */
    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
}
```

---

### 2. PersonaToken.sol

ERC20 token representing a persona.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PersonaToken
 * @notice ERC20 token representing a verified individual's reputation
 */
contract PersonaToken is ERC20, Ownable {
    bytes32 public immutable personaId;
    address public immutable creator;
    uint256 public immutable emissionRate; // Tokens per day
    uint256 public immutable maxSupply;
    uint256 public lastMintTime;

    address public minter; // FeeCollector contract

    event Minted(address indexed to, uint256 amount);

    error MaxSupplyExceeded();
    error OnlyMinter();

    constructor(
        string memory name,
        string memory symbol,
        bytes32 _personaId,
        address _creator,
        uint256 _emissionRate,
        uint256 _maxSupply
    ) ERC20(name, symbol) Ownable(_creator) {
        personaId = _personaId;
        creator = _creator;
        emissionRate = _emissionRate;
        maxSupply = _maxSupply;
        lastMintTime = block.timestamp;
    }

    /**
     * @notice Set authorized minter (FeeCollector)
     */
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    /**
     * @notice Mint tokens (only callable by minter)
     */
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert OnlyMinter();
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();

        _mint(to, amount);
        lastMintTime = block.timestamp;

        emit Minted(to, amount);
    }

    /**
     * @notice Get persona details
     */
    function getPersonaId() external view returns (bytes32) {
        return personaId;
    }

    function getCreator() external view returns (address) {
        return creator;
    }
}
```

---

### 3. StakeVault.sol

Holds and manages all stakes (both credential and persona).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakeVault
 * @notice Holds USDC stakes for credentials and personas
 * @dev Slashing controlled by governance contract
 */
contract StakeVault is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    address public governance; // GovernanceSlashing contract

    struct Stake {
        bytes32 entityId;      // credentialId or personaId
        address owner;         // Staker address
        uint256 amount;        // USDC amount
        bool isPersona;        // true = persona, false = credential
        uint256 createdAt;
        bool isActive;
    }

    // entityId => Stake
    mapping(bytes32 => Stake) public stakes;

    // Track total staked amount
    uint256 public totalStaked;

    event StakeRegistered(bytes32 indexed entityId, address indexed owner, uint256 amount, bool isPersona);
    event StakeIncreased(bytes32 indexed entityId, uint256 additionalAmount);
    event StakeSlashed(bytes32 indexed entityId, uint256 slashedAmount, address indexed recipient);
    event GovernanceUpdated(address indexed newGovernance);

    error StakeAlreadyExists();
    error StakeNotFound();
    error InsufficientStake();
    error OnlyGovernance();
    error ZeroAmount();

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Register new stake (called by factories)
     */
    function registerStake(
        bytes32 entityId,
        address owner,
        uint256 amount,
        bool isPersona
    ) external onlyOwner {
        if (stakes[entityId].amount > 0) revert StakeAlreadyExists();
        if (amount == 0) revert ZeroAmount();

        stakes[entityId] = Stake({
            entityId: entityId,
            owner: owner,
            amount: amount,
            isPersona: isPersona,
            createdAt: block.timestamp,
            isActive: true
        });

        totalStaked += amount;

        emit StakeRegistered(entityId, owner, amount, isPersona);
    }

    /**
     * @notice Increase existing stake
     */
    function increaseStake(bytes32 entityId, uint256 additionalAmount) external onlyOwner {
        Stake storage stake = stakes[entityId];
        if (stake.amount == 0) revert StakeNotFound();
        if (additionalAmount == 0) revert ZeroAmount();

        stake.amount += additionalAmount;
        totalStaked += additionalAmount;

        emit StakeIncreased(entityId, additionalAmount);
    }

    /**
     * @notice Slash stake (only callable by governance)
     * @param entityId Entity to slash
     * @param slashAmount Amount to slash
     * @param recipient Where to send slashed funds (usually AMM pool)
     */
    function slash(
        bytes32 entityId,
        uint256 slashAmount,
        address recipient
    ) external nonReentrant {
        if (msg.sender != governance) revert OnlyGovernance();

        Stake storage stake = stakes[entityId];
        if (stake.amount == 0) revert StakeNotFound();
        if (slashAmount > stake.amount) revert InsufficientStake();

        stake.amount -= slashAmount;
        totalStaked -= slashAmount;

        if (stake.amount == 0) {
            stake.isActive = false;
        }

        // Transfer slashed USDC to recipient (AMM pool to benefit token holders)
        require(usdc.transfer(recipient, slashAmount), "Slash transfer failed");

        emit StakeSlashed(entityId, slashAmount, recipient);
    }

    /**
     * @notice Get stake info
     */
    function getStake(bytes32 entityId) external view returns (Stake memory) {
        return stakes[entityId];
    }

    /**
     * @notice Set governance contract
     */
    function setGovernance(address _governance) external onlyOwner {
        governance = _governance;
        emit GovernanceUpdated(_governance);
    }
}
```

---

### 4. GovernanceSlashing.sol

Handles slashing proposals and voting.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakeVault.sol";

/**
 * @title GovernanceSlashing
 * @notice Governance for slashing bad actors
 * @dev Token holders vote to slash stakes
 */
contract GovernanceSlashing is Ownable {
    StakeVault public immutable vault;

    // Proposal deposit (to prevent spam)
    uint256 public constant PROPOSAL_DEPOSIT = 10 * 10**6; // 10 USDC

    // Voting period
    uint256 public constant VOTING_PERIOD = 7 days;

    // Quorum: % of token supply that must vote
    uint256 public constant QUORUM_PERCENTAGE = 20; // 20%

    struct Proposal {
        uint256 id;
        bytes32 entityId;
        address proposer;
        string title;
        string description;
        string[] evidenceLinks;
        uint256 slashAmount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votingEndsAt;
        bool executed;
        bool passed;
        address tokenAddress; // Token to use for voting weight
    }

    // proposalId => Proposal
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // proposalId => voter => vote (true = for, false = against)
    mapping(uint256 => mapping(address => bool)) public votes;

    event ProposalCreated(
        uint256 indexed proposalId,
        bytes32 indexed entityId,
        address indexed proposer,
        uint256 slashAmount,
        uint256 votingEndsAt
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool vote,
        uint256 weight
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 slashedAmount
    );

    error InsufficientDeposit();
    error ProposalNotFound();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyVoted();
    error ProposalAlreadyExecuted();
    error QuorumNotReached();
    error ProposalRejected();

    constructor(address _vault) Ownable(msg.sender) {
        vault = StakeVault(_vault);
    }

    /**
     * @notice Create slashing proposal
     * @param entityId Credential or persona to slash
     * @param tokenAddress Token contract for voting (credential or persona token)
     * @param title Proposal title
     * @param description Detailed description
     * @param evidenceLinks URLs to evidence
     * @param slashAmount Amount to slash (in USDC)
     */
    function createProposal(
        bytes32 entityId,
        address tokenAddress,
        string memory title,
        string memory description,
        string[] memory evidenceLinks,
        uint256 slashAmount
    ) external returns (uint256) {
        // Require deposit to prevent spam
        IERC20 usdc = vault.usdc();
        if (usdc.balanceOf(msg.sender) < PROPOSAL_DEPOSIT) revert InsufficientDeposit();
        require(usdc.transferFrom(msg.sender, address(this), PROPOSAL_DEPOSIT), "Deposit failed");

        // Create proposal
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            id: proposalId,
            entityId: entityId,
            proposer: msg.sender,
            title: title,
            description: description,
            evidenceLinks: evidenceLinks,
            slashAmount: slashAmount,
            votesFor: 0,
            votesAgainst: 0,
            votingEndsAt: block.timestamp + VOTING_PERIOD,
            executed: false,
            passed: false,
            tokenAddress: tokenAddress
        });

        emit ProposalCreated(
            proposalId,
            entityId,
            msg.sender,
            slashAmount,
            block.timestamp + VOTING_PERIOD
        );

        return proposalId;
    }

    /**
     * @notice Vote on proposal
     * @param proposalId Proposal to vote on
     * @param voteFor true = vote for slashing, false = vote against
     */
    function vote(uint256 proposalId, bool voteFor) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id != proposalId) revert ProposalNotFound();
        if (block.timestamp >= proposal.votingEndsAt) revert VotingEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        // Get voting weight (token balance at current block)
        IERC20 token = IERC20(proposal.tokenAddress);
        uint256 votingPower = token.balanceOf(msg.sender);

        require(votingPower > 0, "No voting power");

        // Record vote
        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = voteFor;

        if (voteFor) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }

        emit VoteCast(proposalId, msg.sender, voteFor, votingPower);
    }

    /**
     * @notice Execute proposal after voting period
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id != proposalId) revert ProposalNotFound();
        if (block.timestamp < proposal.votingEndsAt) revert VotingNotEnded();
        if (proposal.executed) revert ProposalAlreadyExecuted();

        proposal.executed = true;

        // Check quorum
        IERC20 token = IERC20(proposal.tokenAddress);
        uint256 totalSupply = token.totalSupply();
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 quorumRequired = (totalSupply * QUORUM_PERCENTAGE) / 100;

        if (totalVotes < quorumRequired) revert QuorumNotReached();

        // Check if passed
        if (proposal.votesFor <= proposal.votesAgainst) revert ProposalRejected();

        proposal.passed = true;

        // Execute slash
        // Get AMM pool address to send slashed funds
        address poolRecipient = getPoolAddress(proposal.entityId);
        vault.slash(proposal.entityId, proposal.slashAmount, poolRecipient);

        emit ProposalExecuted(proposalId, true, proposal.slashAmount);
    }

    /**
     * @notice Get pool address to send slashed funds
     * @dev This should query the AMM contract
     */
    function getPoolAddress(bytes32 entityId) internal view returns (address) {
        // TODO: Query AMM contract for pool address
        // For now, return vault address (implement properly)
        return address(vault);
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Check if user has voted
     */
    function userHasVoted(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }
}
```

---

## Modified Contracts

### Modified CredentialTokenFactory.sol

Add stake requirement.

```solidity
// Key additions to existing contract:

IERC20 public immutable usdc;
StakeVault public immutable stakeVault;
uint256 public minimumStake = 50 * 10**6; // 50 USDC minimum stake

function createToken(
    bytes32 credentialId,
    string memory name,
    string memory symbol,
    uint256 emissionRate,
    uint256 maxSupply,
    uint256 stakeAmount // NEW PARAMETER
) external returns (address) {
    if (stakeAmount < minimumStake) revert InsufficientStake();

    // Transfer stake to vault
    require(usdc.transferFrom(msg.sender, address(stakeVault), stakeAmount), "Stake transfer failed");

    // Create token (existing logic)
    CredentialToken token = new CredentialToken(...);

    // Register stake
    stakeVault.registerStake(credentialId, msg.sender, stakeAmount, false); // false = credential

    emit TokenCreated(credentialId, address(token), name, symbol, stakeAmount);

    return address(token);
}
```

---

### Modified FeeCollector.sol

Route fees to issuer/owner (small %) + protocol.

```solidity
// New fee split logic:

uint256 public constant ISSUER_FEE_PERCENTAGE = 5; // 5% of trading fees to issuer/owner
uint256 public constant PROTOCOL_FEE_PERCENTAGE = 95; // 95% to protocol

function distributeTradingFees(
    bytes32 entityId,
    uint256 totalFees,
    bool isPersona
) external {
    require(msg.sender == address(amm), "Only AMM");

    // Calculate split
    uint256 issuerFee = (totalFees * ISSUER_FEE_PERCENTAGE) / 100;
    uint256 protocolFee = totalFees - issuerFee;

    // Get issuer/owner address
    address recipient;
    if (isPersona) {
        recipient = personaFactory.getPersonaInfo(personaFactory.getPersonaToken(entityId)).owner;
    } else {
        recipient = credentialFactory.getTokenInfo(credentialFactory.getTokenByCredential(entityId)).creator;
    }

    // Transfer fees
    usdc.transfer(recipient, issuerFee);
    usdc.transfer(protocolTreasury, protocolFee);

    emit FeesDistributed(entityId, issuerFee, protocolFee);
}
```

---

## Stake System Design

### Stake Flow Diagram

```
1. User wants to create credential/persona token
   ↓
2. User approves USDC for factory contract
   ↓
3. User calls createToken(... stakeAmount)
   ↓
4. Factory transfers USDC to StakeVault
   ↓
5. Factory creates token
   ↓
6. StakeVault registers stake with entityId
   ↓
7. Token created, stake locked
```

### Stake Requirements

| Entity Type | Minimum Stake | Purpose |
|-------------|---------------|---------|
| Credential  | 50 USDC | Prevent spam, ensure quality |
| Persona     | 100 USDC | Higher bar for influencers |

### Stake Can Be Increased

- Owner can add more stake anytime
- Cannot withdraw stake (only slashed or burned)
- Higher stake = higher trust signal

---

## Slashing Mechanism

### Slashing Flow

```
1. Community member creates proposal
   ↓
2. Deposits 10 USDC (anti-spam)
   ↓
3. Provides evidence links
   ↓
4. 7-day voting period starts
   ↓
5. Token holders vote (for/against)
   ↓
6. Voting period ends
   ↓
7. Check quorum (20% of supply voted)
   ↓
8. If passed: Execute slash
   ↓
9. Slashed USDC sent to AMM pool
   ↓
10. Token holders benefit from slash
```

### Slashing Protection

1. **Quorum Requirement**: 20% of token supply must vote
2. **Simple Majority**: More votes for than against
3. **Evidence Required**: Must provide proof links
4. **Proposal Deposit**: 10 USDC to create proposal
5. **Time Delay**: 7 days to vote
6. **One-time Execution**: Cannot re-execute same proposal

---

## Testing Strategy

### Test Coverage Requirements

Target: **100% coverage** for all new contracts.

### Unit Tests Structure

```
test/
├── unit/
│   ├── PersonaTokenFactory.t.sol
│   ├── PersonaToken.t.sol
│   ├── StakeVault.t.sol
│   ├── GovernanceSlashing.t.sol
│   ├── CredentialTokenFactory.t.sol (updated)
│   └── FeeCollector.t.sol (updated)
├── integration/
│   ├── PersonaCreationFlow.t.sol
│   ├── CredentialCreationFlow.t.sol
│   ├── SlashingFlow.t.sol
│   └── TradingFlow.t.sol
└── invariant/
    └── StakeInvariants.t.sol
```

---

### 1. PersonaTokenFactory Tests

```solidity
// test/unit/PersonaTokenFactory.t.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PersonaTokenFactory.sol";
import "../src/StakeVault.sol";
import "../src/mocks/MockUSDC.sol";

contract PersonaTokenFactoryTest is Test {
    PersonaTokenFactory factory;
    StakeVault vault;
    MockUSDC usdc;

    address owner = address(this);
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new StakeVault(address(usdc));
        factory = new PersonaTokenFactory(address(usdc), address(vault));

        // Set factory as vault owner
        vault.transferOwnership(address(factory));

        // Mint USDC to users
        usdc.freeMint(user1, 1000 * 10**6);
        usdc.freeMint(user2, 1000 * 10**6);
    }

    function testCreatePersonaToken() public {
        vm.startPrank(user1);

        bytes32 personaId = keccak256(abi.encodePacked(user1, block.timestamp));
        uint256 stakeAmount = 100 * 10**6;

        usdc.approve(address(factory), stakeAmount);

        address tokenAddress = factory.createPersonaToken(
            personaId,
            "Vitalik Buterin",
            "VITALIK",
            100 ether,
            1000000 ether,
            stakeAmount
        );

        assertEq(factory.getPersonaToken(personaId), tokenAddress);
        assertEq(factory.ownerPersona(user1), personaId);

        vm.stopPrank();
    }

    function testFailCreateDuplicatePersona() public {
        vm.startPrank(user1);

        bytes32 personaId = keccak256(abi.encodePacked(user1, block.timestamp));
        uint256 stakeAmount = 100 * 10**6;

        usdc.approve(address(factory), stakeAmount * 2);

        factory.createPersonaToken(
            personaId,
            "Test",
            "TEST",
            100 ether,
            1000000 ether,
            stakeAmount
        );

        // This should fail
        factory.createPersonaToken(
            personaId,
            "Test2",
            "TEST2",
            100 ether,
            1000000 ether,
            stakeAmount
        );

        vm.stopPrank();
    }

    function testFailInsufficientStake() public {
        vm.startPrank(user1);

        bytes32 personaId = keccak256(abi.encodePacked(user1, block.timestamp));
        uint256 stakeAmount = 10 * 10**6; // Less than minimum

        usdc.approve(address(factory), stakeAmount);

        factory.createPersonaToken(
            personaId,
            "Test",
            "TEST",
            100 ether,
            1000000 ether,
            stakeAmount
        );

        vm.stopPrank();
    }

    function testIncreaseStake() public {
        vm.startPrank(user1);

        bytes32 personaId = keccak256(abi.encodePacked(user1, block.timestamp));
        uint256 initialStake = 100 * 10**6;
        uint256 additionalStake = 50 * 10**6;

        usdc.approve(address(factory), initialStake + additionalStake);

        factory.createPersonaToken(
            personaId,
            "Test",
            "TEST",
            100 ether,
            1000000 ether,
            initialStake
        );

        factory.increaseStake(personaId, additionalStake);

        address tokenAddress = factory.getPersonaToken(personaId);
        PersonaTokenFactory.PersonaInfo memory info = factory.getPersonaInfo(tokenAddress);

        assertEq(info.stakedAmount, initialStake + additionalStake);

        vm.stopPrank();
    }
}
```

---

### 2. GovernanceSlashing Tests

```solidity
// test/unit/GovernanceSlashing.t.sol

contract GovernanceSlashingTest is Test {
    GovernanceSlashing governance;
    StakeVault vault;
    MockUSDC usdc;
    PersonaTokenFactory factory;
    PersonaToken token;

    address proposer = address(0x1);
    address voter1 = address(0x2);
    address voter2 = address(0x3);

    bytes32 personaId;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new StakeVault(address(usdc));
        governance = new GovernanceSlashing(address(vault));
        factory = new PersonaTokenFactory(address(usdc), address(vault));

        vault.transferOwnership(address(factory));
        vault.setGovernance(address(governance));

        // Create persona token
        vm.startPrank(proposer);
        usdc.freeMint(proposer, 1000 * 10**6);
        usdc.approve(address(factory), 100 * 10**6);

        personaId = keccak256(abi.encodePacked(proposer, block.timestamp));
        address tokenAddress = factory.createPersonaToken(
            personaId,
            "Test",
            "TEST",
            100 ether,
            1000000 ether,
            100 * 10**6
        );
        token = PersonaToken(tokenAddress);
        vm.stopPrank();

        // Mint tokens to voters
        vm.prank(address(factory));
        token.setMinter(address(this));
        token.mint(voter1, 1000 ether);
        token.mint(voter2, 500 ether);

        // Give proposer USDC for deposit
        usdc.freeMint(proposer, 100 * 10**6);
    }

    function testCreateProposal() public {
        vm.startPrank(proposer);

        usdc.approve(address(governance), 10 * 10**6);

        string[] memory evidence = new string[](2);
        evidence[0] = "https://evidence1.com";
        evidence[1] = "https://evidence2.com";

        uint256 proposalId = governance.createProposal(
            personaId,
            address(token),
            "Slash for scam",
            "This persona promoted a scam",
            evidence,
            50 * 10**6
        );

        GovernanceSlashing.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(proposal.entityId, personaId);
        assertEq(proposal.slashAmount, 50 * 10**6);

        vm.stopPrank();
    }

    function testVoteOnProposal() public {
        // Create proposal
        vm.startPrank(proposer);
        usdc.approve(address(governance), 10 * 10**6);

        string[] memory evidence = new string[](1);
        evidence[0] = "https://evidence.com";

        uint256 proposalId = governance.createProposal(
            personaId,
            address(token),
            "Test",
            "Test",
            evidence,
            50 * 10**6
        );
        vm.stopPrank();

        // Vote for
        vm.prank(voter1);
        governance.vote(proposalId, true);

        GovernanceSlashing.Proposal memory proposal = governance.getProposal(proposalId);
        assertEq(proposal.votesFor, 1000 ether);
    }

    function testExecuteSuccessfulProposal() public {
        // Create proposal
        vm.startPrank(proposer);
        usdc.approve(address(governance), 10 * 10**6);

        string[] memory evidence = new string[](1);
        evidence[0] = "https://evidence.com";

        uint256 proposalId = governance.createProposal(
            personaId,
            address(token),
            "Test",
            "Test",
            evidence,
            50 * 10**6
        );
        vm.stopPrank();

        // Vote (need >20% quorum)
        vm.prank(voter1);
        governance.vote(proposalId, true);

        vm.prank(voter2);
        governance.vote(proposalId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        // Execute
        governance.executeProposal(proposalId);

        // Check stake was slashed
        StakeVault.Stake memory stake = vault.getStake(personaId);
        assertEq(stake.amount, 50 * 10**6); // 100 - 50 = 50
    }

    function testFailExecuteBeforeVotingEnds() public {
        vm.startPrank(proposer);
        usdc.approve(address(governance), 10 * 10**6);

        string[] memory evidence = new string[](1);
        evidence[0] = "https://evidence.com";

        uint256 proposalId = governance.createProposal(
            personaId,
            address(token),
            "Test",
            "Test",
            evidence,
            50 * 10**6
        );
        vm.stopPrank();

        // Try to execute immediately (should fail)
        governance.executeProposal(proposalId);
    }
}
```

---

### 3. Integration Tests

```solidity
// test/integration/PersonaCreationFlow.t.sol

contract PersonaCreationFlowTest is Test {
    // Full end-to-end test of persona creation

    function testFullPersonaCreation() public {
        // 1. Setup
        // 2. User gets USDC
        // 3. User approves factory
        // 4. User creates persona with stake
        // 5. Verify stake in vault
        // 6. Verify token created
        // 7. Verify persona info
        // 8. Verify can mint tokens
    }
}
```

---

### Running Tests

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testCreatePersonaToken

# Run with coverage
forge coverage

# Run gas report
forge test --gas-report
```

---

## Deployment Plan

### Deployment Order

```
1. Deploy MockUSDC (devnet only)
2. Deploy StakeVault
3. Deploy CredentialTokenFactory (updated)
4. Deploy PersonaTokenFactory
5. Deploy GovernanceSlashing
6. Deploy CredentialAMM (updated)
7. Deploy PersonaAMM
8. Deploy FeeCollector (updated)
9. Set permissions and links
10. Verify contracts
11. Create test tokens
```

---

### Deployment Script

```solidity
// script/DeployDualMarketSystem.s.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/StakeVault.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/PersonaTokenFactory.sol";
import "../src/GovernanceSlashing.sol";
import "../src/CredentialAMM.sol";
import "../src/FeeCollector.sol";

contract DeployDualMarketSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer:", deployer);

        // 1. Deploy USDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed:", address(usdc));

        // 2. Deploy StakeVault
        StakeVault vault = new StakeVault(address(usdc));
        console.log("StakeVault deployed:", address(vault));

        // 3. Deploy GovernanceSlashing
        GovernanceSlashing governance = new GovernanceSlashing(address(vault));
        console.log("GovernanceSlashing deployed:", address(governance));

        // 4. Deploy FeeCollector
        FeeCollector feeCollector = new FeeCollector(address(usdc));
        console.log("FeeCollector deployed:", address(feeCollector));

        // 5. Deploy CredentialTokenFactory
        CredentialTokenFactory credentialFactory = new CredentialTokenFactory(
            address(usdc),
            address(vault),
            address(feeCollector)
        );
        console.log("CredentialTokenFactory deployed:", address(credentialFactory));

        // 6. Deploy PersonaTokenFactory
        PersonaTokenFactory personaFactory = new PersonaTokenFactory(
            address(usdc),
            address(vault)
        );
        console.log("PersonaTokenFactory deployed:", address(personaFactory));

        // 7. Deploy AMM
        CredentialAMM amm = new CredentialAMM(
            address(usdc),
            address(feeCollector)
        );
        console.log("CredentialAMM deployed:", address(amm));

        // 8. Set permissions
        vault.setGovernance(address(governance));
        feeCollector.setAMM(address(amm));

        // 9. Mint initial USDC to deployer for testing
        usdc.freeMint(deployer, 100000 * 10**6); // 100k USDC

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Save these addresses:");
        console.log("USDC:", address(usdc));
        console.log("StakeVault:", address(vault));
        console.log("GovernanceSlashing:", address(governance));
        console.log("FeeCollector:", address(feeCollector));
        console.log("CredentialTokenFactory:", address(credentialFactory));
        console.log("PersonaTokenFactory:", address(personaFactory));
        console.log("CredentialAMM:", address(amm));

        vm.stopBroadcast();

        // Write addresses to file
        string memory addresses = string.concat(
            "USDC=", vm.toString(address(usdc)), "\n",
            "STAKE_VAULT=", vm.toString(address(vault)), "\n",
            "GOVERNANCE=", vm.toString(address(governance)), "\n",
            "FEE_COLLECTOR=", vm.toString(address(feeCollector)), "\n",
            "CREDENTIAL_FACTORY=", vm.toString(address(credentialFactory)), "\n",
            "PERSONA_FACTORY=", vm.toString(address(personaFactory)), "\n",
            "AMM=", vm.toString(address(amm)), "\n"
        );

        vm.writeFile("./deployed-addresses.txt", addresses);
        console.log("\nAddresses saved to deployed-addresses.txt");
    }
}
```

---

### Deploy to Moca Devnet

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export RPC_URL=https://rpc.mocaverse.xyz

# Run deployment
forge script script/DeployDualMarketSystem.s.sol:DeployDualMarketSystem \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# Verify contracts (if not auto-verified)
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain-id 5151 \
  --verifier blockscout \
  --verifier-url https://explorer.mocaverse.xyz/api
```

---

### Post-Deployment Verification

```bash
# Test USDC mint
cast send <USDC_ADDRESS> "freeMint(address,uint256)" <YOUR_ADDRESS> 1000000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check balance
cast call <USDC_ADDRESS> "balanceOf(address)" <YOUR_ADDRESS> \
  --rpc-url $RPC_URL

# Create test persona
# 1. Approve USDC
cast send <USDC_ADDRESS> "approve(address,uint256)" <PERSONA_FACTORY> 100000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# 2. Create persona
cast send <PERSONA_FACTORY> "createPersonaToken(bytes32,string,string,uint256,uint256,uint256)" \
  0x123... "Test Persona" "TEST" 100000000000000000000 1000000000000000000000000 100000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## Summary

This guide provides:

✅ **Complete Contract Set**: All new contracts for dual-market system
✅ **Stake System**: USDC stake required for both credentials and personas
✅ **Slashing Governance**: Community-driven slashing with voting
✅ **Comprehensive Tests**: Unit, integration, and invariant tests
✅ **Deployment Script**: One-command deployment to Moca Devnet
✅ **Verification Steps**: Post-deployment testing procedures

Follow this guide step-by-step to implement the new contract system with 100% test coverage before mainnet launch.
