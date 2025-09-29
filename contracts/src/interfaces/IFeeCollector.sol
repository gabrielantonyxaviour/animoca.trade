// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeCollector
 * @dev Interface for fee collection and revenue distribution in USDC
 * @notice Replaces emission-based system with fee-based revenue sharing
 */
interface IFeeCollector {

    // ============ Structs ============

    struct FeeConfig {
        uint256 mintingFee;        // Fee percentage for credential minting (basis points)
        uint256 verificationFee;   // Fee percentage for credential verification (basis points)
        uint256 highValueFee;      // Fee percentage for high-value credentials (basis points)
        bool isActive;             // Whether fees are active for this credential type
    }

    struct RevenuePool {
        uint256 totalCollected;    // Total USDC collected in this pool
        uint256 totalDistributed;  // Total USDC distributed from this pool
        uint256 pendingDistribution; // USDC pending distribution
        uint256 lastDistributionTime; // Last distribution timestamp
    }

    struct UserRewards {
        uint256 totalEarned;       // Total USDC earned by user
        uint256 totalClaimed;      // Total USDC claimed by user
        uint256 lastClaimTime;     // Last claim timestamp
        mapping(bytes32 => uint256) credentialShares; // User's share per credential
    }

    // ============ Events ============

    event FeeCollected(
        bytes32 indexed credentialId,
        address indexed payer,
        uint256 amount,
        uint8 feeType, // 0=minting, 1=verification, 2=high-value
        uint256 timestamp
    );

    event RevenueDistributed(
        bytes32 indexed credentialId,
        uint256 totalAmount,
        uint256 holderCount,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed user,
        bytes32 indexed credentialId,
        uint256 amount,
        uint256 timestamp
    );

    event FeeConfigUpdated(
        bytes32 indexed credentialId,
        uint256 mintingFee,
        uint256 verificationFee,
        uint256 highValueFee,
        uint256 timestamp
    );

    event USDCAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // ============ Custom Errors ============

    error InvalidCredential(bytes32 credentialId);
    error InsufficientFee(uint256 required, uint256 provided);
    error NoRewardsAvailable(bytes32 credentialId, address user);
    error InvalidFeePercentage(uint256 percentage);
    error NotCredentialHolder(bytes32 credentialId, address user);
    error TransferFailed(address to, uint256 amount);
    error ClaimTooSoon(bytes32 credentialId, uint256 nextClaimTime);

    // ============ Fee Collection Functions ============

    /**
     * @dev Collects fee for credential minting
     * @param credentialId The credential being minted
     * @param payer The address paying the fee
     * @return feeAmount The amount of USDC collected
     */
    function collectMintingFee(bytes32 credentialId, address payer) external returns (uint256 feeAmount);

    /**
     * @dev Collects fee for credential verification
     * @param credentialId The credential being verified
     * @param payer The address paying the fee
     * @return feeAmount The amount of USDC collected
     */
    function collectVerificationFee(bytes32 credentialId, address payer) external returns (uint256 feeAmount);

    /**
     * @dev Collects fee for high-value credential operations
     * @param credentialId The high-value credential
     * @param payer The address paying the fee
     * @return feeAmount The amount of USDC collected
     */
    function collectHighValueFee(bytes32 credentialId, address payer) external returns (uint256 feeAmount);

    // ============ Revenue Distribution Functions ============

    /**
     * @dev Distributes collected fees to token holders
     * @param credentialId The credential to distribute rewards for
     * @return totalDistributed The total USDC distributed
     */
    function distributeRevenue(bytes32 credentialId) external returns (uint256 totalDistributed);

    /**
     * @dev Batch distributes revenue for multiple credentials
     * @param credentialIds Array of credential IDs to distribute for
     * @return totalDistributed Total USDT distributed across all credentials
     */
    function batchDistributeRevenue(bytes32[] calldata credentialIds) external returns (uint256 totalDistributed);

    /**
     * @dev Claims pending rewards for a user
     * @param credentialId The credential to claim rewards for
     * @return claimedAmount The amount of USDC claimed
     */
    function claimRewards(bytes32 credentialId) external returns (uint256 claimedAmount);

    /**
     * @dev Batch claims rewards for multiple credentials
     * @param credentialIds Array of credential IDs to claim for
     * @return totalClaimed Total USDC claimed across all credentials
     */
    function batchClaimRewards(bytes32[] calldata credentialIds) external returns (uint256 totalClaimed);

    // ============ Fee Configuration Functions ============

    /**
     * @dev Sets fee configuration for a credential type
     * @param credentialId The credential ID
     * @param mintingFee Fee percentage for minting (basis points)
     * @param verificationFee Fee percentage for verification (basis points)
     * @param highValueFee Fee percentage for high-value operations (basis points)
     */
    function setFeeConfig(
        bytes32 credentialId,
        uint256 mintingFee,
        uint256 verificationFee,
        uint256 highValueFee
    ) external;

    /**
     * @dev Gets fee configuration for a credential
     * @param credentialId The credential ID
     * @return config The fee configuration
     */
    function getFeeConfig(bytes32 credentialId) external view returns (FeeConfig memory config);

    /**
     * @dev Calculates fee amount for a given operation
     * @param credentialId The credential ID
     * @param feeType The type of fee (0=minting, 1=verification, 2=high-value)
     * @param baseAmount The base amount to calculate fee from
     * @return feeAmount The calculated fee amount in USDC
     */
    function calculateFee(
        bytes32 credentialId,
        uint8 feeType,
        uint256 baseAmount
    ) external view returns (uint256 feeAmount);

    // ============ View Functions ============

    /**
     * @dev Gets revenue pool information for a credential
     * @param credentialId The credential ID
     * @return pool The revenue pool data
     */
    function getRevenuePool(bytes32 credentialId) external view returns (RevenuePool memory pool);

    /**
     * @dev Gets pending rewards for a user and credential
     * @param credentialId The credential ID
     * @param user The user address
     * @return pendingAmount The pending USDC amount
     */
    function getPendingRewards(bytes32 credentialId, address user) external view returns (uint256 pendingAmount);

    /**
     * @dev Gets user's total rewards information
     * @param user The user address
     * @param credentialId The credential ID
     * @return totalEarned Total USDC earned
     * @return totalClaimed Total USDC claimed
     * @return lastClaimTime Last claim timestamp
     */
    function getUserRewards(address user, bytes32 credentialId) external view returns (
        uint256 totalEarned,
        uint256 totalClaimed,
        uint256 lastClaimTime
    );

    /**
     * @dev Returns the USDC token address
     * @return The USDC contract address
     */
    function getUSDCAddress() external view returns (address);

    /**
     * @dev Sets the USDC token address
     * @param usdcAddress The new USDC contract address
     */
    function setUSDCAddress(address usdcAddress) external;
}