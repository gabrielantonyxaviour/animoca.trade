// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPassiveTokenGenerator
 * @dev Interface for the service that handles passive token generation for credential holders
 * @notice Manages emission rates, validation, and automated minting
 */
interface IPassiveTokenGenerator {
    // ============ Generation Functions ============
    // Required by backend service (Session 6)

    /**
     * @dev Claims accumulated tokens for a credential holder
     * @param credentialId The credential ID to claim tokens for
     * @return amountMinted The amount of tokens minted to the holder
     * @notice Validates credential ownership and calculates emission since last claim
     */
    function claimTokens(bytes32 credentialId) external returns (uint256 amountMinted);

    /**
     * @dev Batch claims tokens for multiple credentials
     * @param credentialIds Array of credential IDs to claim for
     * @return totalMinted Total amount of tokens minted across all claims
     * @notice More gas efficient than individual claims
     */
    function batchClaimTokens(bytes32[] calldata credentialIds) external returns (uint256 totalMinted);

    /**
     * @dev Calculates claimable tokens for a credential without claiming
     * @param credentialId The credential ID to check
     * @return claimableAmount Amount of tokens that can be claimed
     * @return nextClaimTime Timestamp when next claim will be available
     */
    function getClaimableTokens(bytes32 credentialId) external view returns (
        uint256 claimableAmount,
        uint256 nextClaimTime
    );

    // ============ Emission Management ============
    // Required by token contracts and analytics

    /**
     * @dev Calculates emission amount based on time held and credential type
     * @param credentialId The credential ID
     * @param holder The credential holder address
     * @param lastClaimTimestamp The timestamp of the last claim
     * @return emissionAmount Tokens to be minted
     * @return effectiveRate The rate used for calculation (after multipliers)
     */
    function calculateEmission(
        bytes32 credentialId,
        address holder,
        uint256 lastClaimTimestamp
    ) external view returns (uint256 emissionAmount, uint256 effectiveRate);

    /**
     * @dev Gets the current emission multiplier for a credential type
     * @param credentialId The credential ID
     * @return multiplier The emission rate multiplier (1x = 100, 1.5x = 150, etc.)
     */
    function getEmissionMultiplier(bytes32 credentialId) external view returns (uint256 multiplier);

    /**
     * @dev Updates emission multiplier for a credential type
     * @param credentialId The credential ID
     * @param newMultiplier The new multiplier value
     * @notice Only callable by authorized admin
     */
    function setEmissionMultiplier(bytes32 credentialId, uint256 newMultiplier) external;

    // ============ Validation Functions ============
    // Integration with AIR credential system

    /**
     * @dev Validates that a credential is active and holder owns it
     * @param credentialId The credential ID to validate
     * @param holder The address claiming to hold the credential
     * @return isValid True if credential is valid and owned by holder
     * @return credentialStatus Status code from AIR system
     */
    function validateCredential(
        bytes32 credentialId,
        address holder
    ) external view returns (bool isValid, uint256 credentialStatus);

    /**
     * @dev Batch validates multiple credentials
     * @param credentialIds Array of credential IDs
     * @param holders Array of holder addresses (must match credentialIds length)
     * @return validationResults Array of validation results
     */
    function batchValidateCredentials(
        bytes32[] calldata credentialIds,
        address[] calldata holders
    ) external view returns (bool[] memory validationResults);

    // ============ Rate Limiting ============
    // Anti-gaming and spam prevention

    /**
     * @dev Gets the minimum time between claims for a credential
     * @param credentialId The credential ID
     * @return minInterval Minimum seconds between claims
     */
    function getMinClaimInterval(bytes32 credentialId) external view returns (uint256 minInterval);

    /**
     * @dev Updates minimum claim interval for a credential type
     * @param credentialId The credential ID
     * @param newInterval New minimum interval in seconds
     * @notice Only callable by authorized admin
     */
    function setMinClaimInterval(bytes32 credentialId, uint256 newInterval) external;

    /**
     * @dev Gets the last claim timestamp for a credential holder
     * @param credentialId The credential ID
     * @param holder The holder address
     * @return lastClaimTime Timestamp of last claim
     */
    function getLastClaimTime(
        bytes32 credentialId,
        address holder
    ) external view returns (uint256 lastClaimTime);

    // ============ Statistics ============
    // Required by analytics (Session 7)

    /**
     * @dev Gets generation statistics for a credential
     * @param credentialId The credential ID
     * @return totalMinted Total tokens minted for this credential
     * @return activeHolders Number of active holders
     * @return averageEmissionRate Average emission rate over time
     */
    function getCredentialStats(bytes32 credentialId) external view returns (
        uint256 totalMinted,
        uint256 activeHolders,
        uint256 averageEmissionRate
    );

    /**
     * @dev Gets global generation statistics
     * @return totalCredentials Number of credentials with tokens
     * @return totalTokensMinted Total tokens minted across all credentials
     * @return totalActiveHolders Total number of active credential holders
     */
    function getGlobalStats() external view returns (
        uint256 totalCredentials,
        uint256 totalTokensMinted,
        uint256 totalActiveHolders
    );

    // ============ Events ============
    // Required by frontend and analytics

    /**
     * @dev Emitted when tokens are claimed by a credential holder
     * @param credentialId The credential ID
     * @param holder The holder address
     * @param amount Amount of tokens minted
     * @param timestamp Claim timestamp
     */
    event TokensClaimed(
        bytes32 indexed credentialId,
        address indexed holder,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when emission multiplier is updated
     * @param credentialId The credential ID
     * @param oldMultiplier Previous multiplier
     * @param newMultiplier New multiplier
     * @param timestamp Update timestamp
     */
    event EmissionMultiplierUpdated(
        bytes32 indexed credentialId,
        uint256 oldMultiplier,
        uint256 newMultiplier,
        uint256 timestamp
    );

    /**
     * @dev Emitted when claim interval is updated
     * @param credentialId The credential ID
     * @param oldInterval Previous interval
     * @param newInterval New interval
     * @param timestamp Update timestamp
     */
    event ClaimIntervalUpdated(
        bytes32 indexed credentialId,
        uint256 oldInterval,
        uint256 newInterval,
        uint256 timestamp
    );

    // ============ Custom Errors ============

    /**
     * @dev Thrown when credential is invalid or revoked
     */
    error InvalidCredential(bytes32 credentialId);

    /**
     * @dev Thrown when caller doesn't own the credential
     */
    error NotCredentialHolder(bytes32 credentialId, address caller);

    /**
     * @dev Thrown when claiming too soon after last claim
     */
    error ClaimTooSoon(bytes32 credentialId, uint256 nextClaimTime);

    /**
     * @dev Thrown when no tokens are available to claim
     */
    error NoTokensTolaim(bytes32 credentialId);

    /**
     * @dev Thrown when arrays have mismatched lengths
     */
    error ArrayLengthMismatch();
}