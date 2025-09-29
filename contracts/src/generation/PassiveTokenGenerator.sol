// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IPassiveTokenGenerator.sol";
import "../interfaces/ICredentialTokenFactory.sol";
import "../interfaces/ICredentialToken.sol";
import "../interfaces/IReputationOracle.sol";

/**
 * @title PassiveTokenGenerator
 * @dev Main contract for passive token generation for credential holders
 * @notice Implements the emission formula and manages token generation
 */
contract PassiveTokenGenerator is IPassiveTokenGenerator, Ownable, ReentrancyGuard {
    // ============ Constants ============

    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_CLAIM_INTERVAL = 86400; // 24 hours minimum
    uint256 private constant MONTHLY_DECAY_BASIS = 100; // 1% = 100 basis points

    // ============ State Variables ============

    /// @dev Factory contract for credential tokens
    ICredentialTokenFactory private immutable factory;

    /// @dev Reputation oracle for market data
    IReputationOracle private reputationOracle;

    /// @dev Base emission rate (10-50 tokens per day, scaled by PRECISION)
    uint256 private baseEmissionRate;

    /// @dev Anti-inflation factor (0.8x to 1.2x, represented as basis points)
    uint256 private antiInflationFactor;

    /// @dev Contract deployment timestamp for time decay calculation
    uint256 private immutable deploymentTime;

    /// @dev Credential type to emission multiplier mapping (scaled by 100, e.g., 150 = 1.5x)
    mapping(bytes32 => uint256) private credentialMultipliers;

    /// @dev Credential ID + holder to last claim timestamp
    mapping(bytes32 => mapping(address => uint256)) private lastClaimTime;

    /// @dev Credential ID to minimum claim interval
    mapping(bytes32 => uint256) private minClaimIntervals;

    /// @dev Credential ID to total minted amount
    mapping(bytes32 => uint256) private credentialTotalMinted;

    /// @dev Credential ID to active holders count
    mapping(bytes32 => uint256) private credentialActiveHolders;

    /// @dev Track if holder is active for a credential
    mapping(bytes32 => mapping(address => bool)) private isActiveHolder;

    /// @dev Global statistics
    uint256 private globalTotalMinted;
    uint256 private totalActiveHolders;
    uint256 private totalCredentialsWithTokens;

    // ============ Credential Type Categories ============

    enum CredentialCategory {
        EDUCATION,
        PROFESSIONAL,
        SKILL,
        RARE
    }

    struct CredentialType {
        CredentialCategory category;
        uint256 multiplier; // Scaled by 100 (e.g., 150 = 1.5x)
        string description;
    }

    mapping(bytes32 => CredentialType) private credentialTypes;

    // ============ Constructor ============

    constructor(address factory_) Ownable(msg.sender) {
        if (factory_ == address(0)) revert InvalidCredential(bytes32(0));

        factory = ICredentialTokenFactory(factory_);
        deploymentTime = block.timestamp;
        baseEmissionRate = 10 * PRECISION; // 10 tokens per day default
        antiInflationFactor = BASIS_POINTS; // 1.0x default

        _initializeCredentialTypes();
    }

    // ============ Admin Functions ============

    /**
     * @dev Sets the base emission rate
     * @param rate The new base rate (tokens per day, scaled by PRECISION)
     */
    function setBaseEmissionRate(uint256 rate) external onlyOwner {
        if (rate < 10 * PRECISION || rate > 50 * PRECISION) {
            revert InvalidCredential(bytes32(0));
        }
        baseEmissionRate = rate;
    }

    /**
     * @dev Sets the anti-inflation factor
     * @param factor The new factor (in basis points, 10000 = 1.0x)
     */
    function setAntiInflationFactor(uint256 factor) external onlyOwner {
        if (factor < 8000 || factor > 12000) { // 0.8x to 1.2x
            revert InvalidCredential(bytes32(0));
        }
        antiInflationFactor = factor;
    }

    /**
     * @dev Initializes default credential type multipliers
     */
    function _initializeCredentialTypes() private {
        // Education credentials
        _setCredentialType("HIGH_SCHOOL", CredentialCategory.EDUCATION, 100, "High School Diploma");
        _setCredentialType("BACHELORS", CredentialCategory.EDUCATION, 150, "Bachelor's Degree");
        _setCredentialType("MASTERS", CredentialCategory.EDUCATION, 200, "Master's Degree");
        _setCredentialType("PHD", CredentialCategory.EDUCATION, 300, "PhD/Doctorate");

        // Professional certifications
        _setCredentialType("BASIC_CERT", CredentialCategory.PROFESSIONAL, 120, "Basic Certification");
        _setCredentialType("ADVANCED_CERT", CredentialCategory.PROFESSIONAL, 180, "Advanced Certification");
        _setCredentialType("EXPERT_CERT", CredentialCategory.PROFESSIONAL, 250, "Expert Certification");
        _setCredentialType("LEADER_CERT", CredentialCategory.PROFESSIONAL, 400, "Industry Leadership");

        // Skills & achievements
        _setCredentialType("BASIC_SKILL", CredentialCategory.SKILL, 80, "Basic Skill Badge");
        _setCredentialType("INTER_SKILL", CredentialCategory.SKILL, 120, "Intermediate Skill");
        _setCredentialType("ADVANCED_SKILL", CredentialCategory.SKILL, 180, "Advanced Skill");
        _setCredentialType("MASTER_SKILL", CredentialCategory.SKILL, 250, "Master Level");

        // Rare/unique credentials
        _setCredentialType("COMPETITION", CredentialCategory.RARE, 350, "Competition Winner");
        _setCredentialType("AWARD", CredentialCategory.RARE, 450, "Industry Award");
        _setCredentialType("PATENT", CredentialCategory.RARE, 500, "Patent Holder");
    }

    /**
     * @dev Helper to set credential type configuration
     */
    function _setCredentialType(
        string memory typeId,
        CredentialCategory category,
        uint256 multiplier,
        string memory description
    ) private {
        bytes32 hash = keccak256(abi.encodePacked(typeId));
        credentialTypes[hash] = CredentialType(category, multiplier, description);
        credentialMultipliers[hash] = multiplier;
    }

    // ============ Generation Functions ============

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function claimTokens(bytes32 credentialId) external override nonReentrant returns (uint256 amountMinted) {
        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress == address(0)) revert InvalidCredential(credentialId);

        // Validate credential ownership
        if (!factory.validateCredentialOwnership(credentialId, msg.sender)) {
            revert NotCredentialHolder(credentialId, msg.sender);
        }

        // Check minimum claim interval
        uint256 lastClaim = lastClaimTime[credentialId][msg.sender];
        uint256 minInterval = _getEffectiveMinInterval(credentialId);

        if (lastClaim > 0 && block.timestamp < lastClaim + minInterval) {
            revert ClaimTooSoon(credentialId, lastClaim + minInterval);
        }

        // Calculate emission amount
        (uint256 emission, ) = calculateEmission(credentialId, msg.sender, lastClaim);

        if (emission == 0) {
            revert NoTokensTolaim(credentialId);
        }

        // Update state
        lastClaimTime[credentialId][msg.sender] = block.timestamp;

        if (!isActiveHolder[credentialId][msg.sender]) {
            isActiveHolder[credentialId][msg.sender] = true;
            credentialActiveHolders[credentialId]++;
            totalActiveHolders++;
        }

        credentialTotalMinted[credentialId] += emission;
        globalTotalMinted += emission;

        if (credentialTotalMinted[credentialId] == emission) {
            totalCredentialsWithTokens++;
        }

        // Mint tokens
        ICredentialToken token = ICredentialToken(tokenAddress);
        token.mint(msg.sender, emission);

        emit TokensClaimed(credentialId, msg.sender, emission, block.timestamp);

        return emission;
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function batchClaimTokens(bytes32[] calldata credentialIds) external override nonReentrant returns (uint256 totalMinted) {
        if (credentialIds.length == 0) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < credentialIds.length; i++) {
            bytes32 credentialId = credentialIds[i];
            address tokenAddress = factory.getTokenByCredential(credentialId);

            if (tokenAddress == address(0)) continue;

            // Validate credential ownership
            if (!factory.validateCredentialOwnership(credentialId, msg.sender)) continue;

            // Check minimum claim interval
            uint256 lastClaim = lastClaimTime[credentialId][msg.sender];
            uint256 minInterval = _getEffectiveMinInterval(credentialId);

            if (lastClaim > 0 && block.timestamp < lastClaim + minInterval) continue;

            // Calculate emission amount
            (uint256 emission, ) = calculateEmission(credentialId, msg.sender, lastClaim);

            if (emission == 0) continue;

            // Update state
            lastClaimTime[credentialId][msg.sender] = block.timestamp;

            if (!isActiveHolder[credentialId][msg.sender]) {
                isActiveHolder[credentialId][msg.sender] = true;
                credentialActiveHolders[credentialId]++;
                totalActiveHolders++;
            }

            credentialTotalMinted[credentialId] += emission;
            globalTotalMinted += emission;

            if (credentialTotalMinted[credentialId] == emission) {
                totalCredentialsWithTokens++;
            }

            // Mint tokens
            ICredentialToken token = ICredentialToken(tokenAddress);
            token.mint(msg.sender, emission);

            totalMinted += emission;

            emit TokensClaimed(credentialId, msg.sender, emission, block.timestamp);
        }

        return totalMinted;
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getClaimableTokens(bytes32 credentialId) external view override returns (
        uint256 claimableAmount,
        uint256 nextClaimTime
    ) {
        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress == address(0)) {
            return (0, 0);
        }

        if (!factory.validateCredentialOwnership(credentialId, msg.sender)) {
            return (0, 0);
        }

        uint256 lastClaim = lastClaimTime[credentialId][msg.sender];
        uint256 minInterval = _getEffectiveMinInterval(credentialId);

        if (lastClaim > 0 && block.timestamp < lastClaim + minInterval) {
            return (0, lastClaim + minInterval);
        }

        (uint256 emission, ) = calculateEmission(credentialId, msg.sender, lastClaim);

        nextClaimTime = block.timestamp + minInterval;

        return (emission, nextClaimTime);
    }

    // ============ Emission Calculation ============

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function calculateEmission(
        bytes32 credentialId,
        address holder,
        uint256 lastClaimTimestamp
    ) public view override returns (uint256 emissionAmount, uint256 effectiveRate) {
        if (holder == address(0)) return (0, 0);

        // Get token details
        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress == address(0)) return (0, 0);

        ICredentialToken token = ICredentialToken(tokenAddress);

        // Use token creation time if never claimed
        uint256 startTime = lastClaimTimestamp;
        if (startTime == 0) {
            startTime = token.getCreatedAt();
        }

        if (startTime >= block.timestamp) return (0, 0);

        uint256 timeElapsed = block.timestamp - startTime;
        uint256 daysElapsed = timeElapsed / SECONDS_PER_DAY;

        if (daysElapsed == 0) return (0, 0);

        // Get base rate from token
        uint256 tokenBaseRate = token.getEmissionRate();

        // Apply credential multiplier
        uint256 multiplier = _getEffectiveMultiplier(credentialId);

        // Calculate time decay (1% monthly reduction)
        uint256 monthsSinceDeployment = (block.timestamp - deploymentTime) / (30 days);
        uint256 timeDecayFactor = BASIS_POINTS;

        if (monthsSinceDeployment > 0) {
            // Apply compound decay: (0.99)^months
            for (uint256 i = 0; i < monthsSinceDeployment && timeDecayFactor > 0; i++) {
                timeDecayFactor = (timeDecayFactor * (BASIS_POINTS - MONTHLY_DECAY_BASIS)) / BASIS_POINTS;
            }
        }

        // Calculate effective rate
        effectiveRate = (tokenBaseRate * multiplier * timeDecayFactor * antiInflationFactor)
            / (100 * BASIS_POINTS * BASIS_POINTS);

        // Calculate emission amount
        emissionAmount = (effectiveRate * daysElapsed) / 1; // Already in correct precision

        // Check against max supply
        uint256 maxSupply = token.getMaxSupply();
        uint256 currentSupply = token.totalSupply();

        if (currentSupply + emissionAmount > maxSupply) {
            emissionAmount = maxSupply > currentSupply ? maxSupply - currentSupply : 0;
        }

        return (emissionAmount, effectiveRate);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getEmissionMultiplier(bytes32 credentialId) external view override returns (uint256 multiplier) {
        return _getEffectiveMultiplier(credentialId);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function setEmissionMultiplier(bytes32 credentialId, uint256 newMultiplier) external override onlyOwner {
        if (newMultiplier < 80 || newMultiplier > 500) { // 0.8x to 5x
            revert InvalidCredential(credentialId);
        }

        uint256 oldMultiplier = credentialMultipliers[credentialId];
        credentialMultipliers[credentialId] = newMultiplier;

        emit EmissionMultiplierUpdated(credentialId, oldMultiplier, newMultiplier, block.timestamp);
    }

    /**
     * @dev Gets the effective multiplier for a credential
     */
    function _getEffectiveMultiplier(bytes32 credentialId) private view returns (uint256) {
        uint256 multiplier = credentialMultipliers[credentialId];
        return multiplier > 0 ? multiplier : 100; // Default 1.0x
    }

    // ============ Validation Functions ============

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function validateCredential(
        bytes32 credentialId,
        address holder
    ) external view override returns (bool isValid, uint256 credentialStatus) {
        isValid = factory.validateCredentialOwnership(credentialId, holder);
        credentialStatus = isValid ? 1 : 0; // Simplified for now
        return (isValid, credentialStatus);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function batchValidateCredentials(
        bytes32[] calldata credentialIds,
        address[] calldata holders
    ) external view override returns (bool[] memory validationResults) {
        if (credentialIds.length != holders.length) revert ArrayLengthMismatch();

        validationResults = new bool[](credentialIds.length);

        for (uint256 i = 0; i < credentialIds.length; i++) {
            validationResults[i] = factory.validateCredentialOwnership(credentialIds[i], holders[i]);
        }

        return validationResults;
    }

    // ============ Rate Limiting ============

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getMinClaimInterval(bytes32 credentialId) external view override returns (uint256 minInterval) {
        return _getEffectiveMinInterval(credentialId);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function setMinClaimInterval(bytes32 credentialId, uint256 newInterval) external override onlyOwner {
        if (newInterval < MIN_CLAIM_INTERVAL) {
            revert InvalidCredential(credentialId);
        }

        uint256 oldInterval = minClaimIntervals[credentialId];
        minClaimIntervals[credentialId] = newInterval;

        emit ClaimIntervalUpdated(credentialId, oldInterval, newInterval, block.timestamp);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getLastClaimTime(
        bytes32 credentialId,
        address holder
    ) external view override returns (uint256 lastClaimTimestamp) {
        return lastClaimTime[credentialId][holder];
    }

    /**
     * @dev Gets the effective minimum interval for a credential
     */
    function _getEffectiveMinInterval(bytes32 credentialId) private view returns (uint256) {
        uint256 interval = minClaimIntervals[credentialId];
        return interval > 0 ? interval : MIN_CLAIM_INTERVAL;
    }

    // ============ Statistics ============

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getCredentialStats(bytes32 credentialId) external view override returns (
        uint256 totalMinted,
        uint256 activeHolders,
        uint256 averageEmissionRate
    ) {
        totalMinted = credentialTotalMinted[credentialId];
        activeHolders = credentialActiveHolders[credentialId];

        // Calculate average emission rate
        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress != address(0)) {
            ICredentialToken token = ICredentialToken(tokenAddress);
            uint256 tokenRate = token.getEmissionRate();
            uint256 multiplier = _getEffectiveMultiplier(credentialId);
            averageEmissionRate = (tokenRate * multiplier) / 100;
        }

        return (totalMinted, activeHolders, averageEmissionRate);
    }

    /**
     * @inheritdoc IPassiveTokenGenerator
     */
    function getGlobalStats() external view override returns (
        uint256 totalCredentials,
        uint256 totalTokensMinted,
        uint256 totalActiveHoldersCount
    ) {
        return (
            totalCredentialsWithTokens,
            globalTotalMinted,
            totalActiveHolders
        );
    }

    // ============ Reputation Oracle Functions ============

    /**
     * @dev Sets the reputation oracle address
     * @param oracle_ The new reputation oracle address
     */
    function setReputationOracle(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert InvalidCredential(bytes32(0));
        reputationOracle = IReputationOracle(oracle_);
        emit ReputationOracleSet(oracle_);
    }

    /**
     * @dev Returns the reputation oracle address
     * @return The current reputation oracle address
     */
    function getReputationOracle() external view returns (address) {
        return address(reputationOracle);
    }

    // ============ Events ============

    /**
     * @dev Emitted when reputation oracle is set
     * @param oracle The oracle address
     */
    event ReputationOracleSet(address indexed oracle);

    // ============ View Functions ============

    /**
     * @dev Returns the factory address
     */
    function getFactory() external view returns (address) {
        return address(factory);
    }

    /**
     * @dev Returns the base emission rate
     */
    function getBaseEmissionRate() external view returns (uint256) {
        return baseEmissionRate;
    }

    /**
     * @dev Returns the anti-inflation factor
     */
    function getAntiInflationFactor() external view returns (uint256) {
        return antiInflationFactor;
    }

    /**
     * @dev Returns credential type information
     */
    function getCredentialType(bytes32 typeId) external view returns (
        CredentialCategory category,
        uint256 multiplier,
        string memory description
    ) {
        CredentialType memory credType = credentialTypes[typeId];
        return (credType.category, credType.multiplier, credType.description);
    }
}