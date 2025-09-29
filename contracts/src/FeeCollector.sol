// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeCollector.sol";
import "./interfaces/ICredentialTokenFactory.sol";
import "./interfaces/ICredentialToken.sol";

/**
 * @title FeeCollector
 * @dev Fee collection and USDC revenue distribution system for credential holders
 * @notice Replaces emission-based system with fee-based revenue sharing
 */
contract FeeCollector is IFeeCollector, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_CLAIM_INTERVAL = 86400; // 24 hours
    uint256 private constant MAX_FEE_PERCENTAGE = 1000; // 10%

    // ============ State Variables ============

    /// @dev Factory contract for credential tokens
    ICredentialTokenFactory private immutable factory;

    /// @dev USDC token contract
    IERC20 private usdcToken;

    /// @dev Fee configurations for each credential type
    mapping(bytes32 => FeeConfig) private feeConfigs;

    /// @dev Revenue pools for each credential
    mapping(bytes32 => RevenuePool) private revenuePools;

    /// @dev User rewards tracking
    mapping(address => mapping(bytes32 => UserRewards)) private userRewards;

    /// @dev Last claim time per user per credential
    mapping(address => mapping(bytes32 => uint256)) private lastClaimTime;

    /// @dev Total shares per credential (represents token supply)
    mapping(bytes32 => uint256) private totalShares;

    /// @dev Global fee percentages (used if credential-specific not set)
    uint256 private globalMintingFee = 100; // 1%
    uint256 private globalVerificationFee = 50; // 0.5%
    uint256 private globalHighValueFee = 200; // 2%

    // ============ Constructor ============

    constructor(address factory_, address usdcToken_) Ownable(msg.sender) {
        if (factory_ == address(0)) revert InvalidCredential(bytes32(0));
        if (usdcToken_ == address(0)) revert InvalidCredential(bytes32(0));

        factory = ICredentialTokenFactory(factory_);
        usdcToken = IERC20(usdcToken_);
    }

    // ============ Fee Collection Functions ============

    /**
     * @inheritdoc IFeeCollector
     */
    function collectMintingFee(bytes32 credentialId, address payer) external override nonReentrant returns (uint256 feeAmount) {
        FeeConfig memory config = _getEffectiveFeeConfig(credentialId);
        if (!config.isActive) revert InvalidCredential(credentialId);

        feeAmount = _calculateBaseFee(config.mintingFee);
        if (feeAmount == 0) return 0;

        _collectFee(credentialId, payer, feeAmount, 0);
        return feeAmount;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function collectVerificationFee(bytes32 credentialId, address payer) external override nonReentrant returns (uint256 feeAmount) {
        FeeConfig memory config = _getEffectiveFeeConfig(credentialId);
        if (!config.isActive) revert InvalidCredential(credentialId);

        feeAmount = _calculateBaseFee(config.verificationFee);
        if (feeAmount == 0) return 0;

        _collectFee(credentialId, payer, feeAmount, 1);
        return feeAmount;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function collectHighValueFee(bytes32 credentialId, address payer) external override nonReentrant returns (uint256 feeAmount) {
        FeeConfig memory config = _getEffectiveFeeConfig(credentialId);
        if (!config.isActive) revert InvalidCredential(credentialId);

        feeAmount = _calculateBaseFee(config.highValueFee);
        if (feeAmount == 0) return 0;

        _collectFee(credentialId, payer, feeAmount, 2);
        return feeAmount;
    }

    /**
     * @dev Internal function to collect fees
     */
    function _collectFee(bytes32 credentialId, address payer, uint256 amount, uint8 feeType) private {
        usdcToken.safeTransferFrom(payer, address(this), amount);

        RevenuePool storage pool = revenuePools[credentialId];
        pool.totalCollected += amount;
        pool.pendingDistribution += amount;

        emit FeeCollected(credentialId, payer, amount, feeType, block.timestamp);
    }

    // ============ Revenue Distribution Functions ============

    /**
     * @inheritdoc IFeeCollector
     */
    function distributeRevenue(bytes32 credentialId) external override nonReentrant returns (uint256 totalDistributed) {
        RevenuePool storage pool = revenuePools[credentialId];
        if (pool.pendingDistribution == 0) return 0;

        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress == address(0)) revert InvalidCredential(credentialId);

        ICredentialToken token = ICredentialToken(tokenAddress);
        uint256 totalSupply = token.totalSupply();
        if (totalSupply == 0) return 0;

        totalDistributed = pool.pendingDistribution;
        pool.totalDistributed += totalDistributed;
        pool.pendingDistribution = 0;
        pool.lastDistributionTime = block.timestamp;

        // Update total shares for this credential
        totalShares[credentialId] = totalSupply;

        emit RevenueDistributed(credentialId, totalDistributed, totalSupply, block.timestamp);

        return totalDistributed;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function batchDistributeRevenue(bytes32[] calldata credentialIds) external override nonReentrant returns (uint256 totalDistributed) {
        for (uint256 i = 0; i < credentialIds.length; i++) {
            bytes32 credentialId = credentialIds[i];
            RevenuePool storage pool = revenuePools[credentialId];
            if (pool.pendingDistribution == 0) continue;

            address tokenAddress = factory.getTokenByCredential(credentialId);
            if (tokenAddress == address(0)) continue;

            ICredentialToken token = ICredentialToken(tokenAddress);
            uint256 totalSupply = token.totalSupply();
            if (totalSupply == 0) continue;

            uint256 distributed = pool.pendingDistribution;
            pool.totalDistributed += distributed;
            pool.pendingDistribution = 0;
            pool.lastDistributionTime = block.timestamp;

            totalShares[credentialId] = totalSupply;
            totalDistributed += distributed;

            emit RevenueDistributed(credentialId, distributed, totalSupply, block.timestamp);
        }
        return totalDistributed;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function claimRewards(bytes32 credentialId) external override nonReentrant returns (uint256 claimedAmount) {
        if (lastClaimTime[msg.sender][credentialId] + MIN_CLAIM_INTERVAL > block.timestamp) {
            revert ClaimTooSoon(credentialId, lastClaimTime[msg.sender][credentialId] + MIN_CLAIM_INTERVAL);
        }

        claimedAmount = getPendingRewards(credentialId, msg.sender);
        if (claimedAmount == 0) revert NoRewardsAvailable(credentialId, msg.sender);

        // Validate credential ownership
        if (!factory.validateCredentialOwnership(credentialId, msg.sender)) {
            revert NotCredentialHolder(credentialId, msg.sender);
        }

        UserRewards storage rewards = userRewards[msg.sender][credentialId];
        rewards.totalClaimed += claimedAmount;
        rewards.lastClaimTime = block.timestamp;
        lastClaimTime[msg.sender][credentialId] = block.timestamp;

        usdcToken.safeTransfer(msg.sender, claimedAmount);

        emit RewardsClaimed(msg.sender, credentialId, claimedAmount, block.timestamp);

        return claimedAmount;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function batchClaimRewards(bytes32[] calldata credentialIds) external override nonReentrant returns (uint256 totalClaimed) {
        for (uint256 i = 0; i < credentialIds.length; i++) {
            bytes32 credentialId = credentialIds[i];

            if (lastClaimTime[msg.sender][credentialId] + MIN_CLAIM_INTERVAL > block.timestamp) {
                continue; // Skip if cooldown not met
            }

            uint256 claimedAmount = getPendingRewards(credentialId, msg.sender);
            if (claimedAmount == 0) continue;

            // Validate credential ownership
            if (!factory.validateCredentialOwnership(credentialId, msg.sender)) {
                continue; // Skip if not owner
            }

            UserRewards storage rewards = userRewards[msg.sender][credentialId];
            rewards.totalClaimed += claimedAmount;
            rewards.lastClaimTime = block.timestamp;
            lastClaimTime[msg.sender][credentialId] = block.timestamp;

            totalClaimed += claimedAmount;

            emit RewardsClaimed(msg.sender, credentialId, claimedAmount, block.timestamp);
        }

        if (totalClaimed > 0) {
            usdcToken.safeTransfer(msg.sender, totalClaimed);
        }

        return totalClaimed;
    }

    // ============ Fee Configuration Functions ============

    /**
     * @inheritdoc IFeeCollector
     */
    function setFeeConfig(
        bytes32 credentialId,
        uint256 mintingFee,
        uint256 verificationFee,
        uint256 highValueFee
    ) external override onlyOwner {
        if (mintingFee > MAX_FEE_PERCENTAGE || verificationFee > MAX_FEE_PERCENTAGE || highValueFee > MAX_FEE_PERCENTAGE) {
            revert InvalidFeePercentage(mintingFee);
        }

        feeConfigs[credentialId] = FeeConfig({
            mintingFee: mintingFee,
            verificationFee: verificationFee,
            highValueFee: highValueFee,
            isActive: true
        });

        emit FeeConfigUpdated(credentialId, mintingFee, verificationFee, highValueFee, block.timestamp);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getFeeConfig(bytes32 credentialId) external view override returns (FeeConfig memory config) {
        return _getEffectiveFeeConfig(credentialId);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function calculateFee(
        bytes32 credentialId,
        uint8 feeType,
        uint256 baseAmount
    ) external view override returns (uint256 feeAmount) {
        FeeConfig memory config = _getEffectiveFeeConfig(credentialId);
        uint256 feePercentage;

        if (feeType == 0) {
            feePercentage = config.mintingFee;
        } else if (feeType == 1) {
            feePercentage = config.verificationFee;
        } else if (feeType == 2) {
            feePercentage = config.highValueFee;
        } else {
            return 0;
        }

        return (baseAmount * feePercentage) / BASIS_POINTS;
    }

    // ============ View Functions ============

    /**
     * @inheritdoc IFeeCollector
     */
    function getRevenuePool(bytes32 credentialId) external view override returns (RevenuePool memory pool) {
        return revenuePools[credentialId];
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getPendingRewards(bytes32 credentialId, address user) public view override returns (uint256 pendingAmount) {
        address tokenAddress = factory.getTokenByCredential(credentialId);
        if (tokenAddress == address(0)) return 0;

        ICredentialToken token = ICredentialToken(tokenAddress);
        uint256 userBalance = token.balanceOf(user);
        uint256 totalSupply = token.totalSupply();

        if (userBalance == 0 || totalSupply == 0) return 0;

        RevenuePool memory pool = revenuePools[credentialId];
        if (pool.totalDistributed == 0) return 0;

        UserRewards storage rewards = userRewards[user][credentialId];
        uint256 userShare = (pool.totalDistributed * userBalance) / totalSupply;

        return userShare > rewards.totalClaimed ? userShare - rewards.totalClaimed : 0;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getUserRewards(address user, bytes32 credentialId) external view override returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 lastClaimTime_
    ) {
        UserRewards storage rewards = userRewards[user][credentialId];
        totalEarned = rewards.totalEarned;
        totalClaimed = rewards.totalClaimed;
        lastClaimTime_ = rewards.lastClaimTime;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getUSDCAddress() external view override returns (address) {
        return address(usdcToken);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function setUSDCAddress(address usdcAddress) external override onlyOwner {
        if (usdcAddress == address(0)) revert InvalidCredential(bytes32(0));
        address oldAddress = address(usdcToken);
        usdcToken = IERC20(usdcAddress);
        emit USDCAddressUpdated(oldAddress, usdcAddress);
    }

    // ============ Internal Helper Functions ============

    /**
     * @dev Gets effective fee configuration (uses global if credential-specific not set)
     */
    function _getEffectiveFeeConfig(bytes32 credentialId) private view returns (FeeConfig memory config) {
        config = feeConfigs[credentialId];

        if (!config.isActive) {
            // Use global defaults
            config = FeeConfig({
                mintingFee: globalMintingFee,
                verificationFee: globalVerificationFee,
                highValueFee: globalHighValueFee,
                isActive: true
            });
        }

        return config;
    }

    /**
     * @dev Calculates base fee amount (can be overridden for dynamic pricing)
     */
    function _calculateBaseFee(uint256 feePercentage) private pure returns (uint256) {
        // For now, use a fixed base amount of 10 USDC (10 * 10^6)
        uint256 baseAmount = 10 * 10**6;
        return (baseAmount * feePercentage) / BASIS_POINTS;
    }

    // ============ Admin Functions ============

    /**
     * @dev Sets global fee percentages
     */
    function setGlobalFees(
        uint256 mintingFee,
        uint256 verificationFee,
        uint256 highValueFee
    ) external onlyOwner {
        if (mintingFee > MAX_FEE_PERCENTAGE || verificationFee > MAX_FEE_PERCENTAGE || highValueFee > MAX_FEE_PERCENTAGE) {
            revert InvalidFeePercentage(mintingFee);
        }

        globalMintingFee = mintingFee;
        globalVerificationFee = verificationFee;
        globalHighValueFee = highValueFee;
    }

    /**
     * @dev Gets global fee percentages
     */
    function getGlobalFees() external view returns (uint256 mintingFee, uint256 verificationFee, uint256 highValueFee) {
        return (globalMintingFee, globalVerificationFee, globalHighValueFee);
    }

    /**
     * @dev Emergency function to withdraw USDC (only owner)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        usdcToken.safeTransfer(owner(), amount);
    }

    /**
     * @dev Returns the factory address
     */
    function getFactory() external view returns (address) {
        return address(factory);
    }
}