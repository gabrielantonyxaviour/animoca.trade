// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationOracle
 * @dev Interface for price tracking and reputation scoring system
 * @notice Provides TWAP calculations and reputation metrics for credential tokens
 */
interface IReputationOracle {
    // ============ Price Data ============
    // Required by trading UI (Session 5)

    /**
     * @dev Gets the current price for a token
     * @param token The token address
     * @return price Current price in ETH (18 decimals)
     * @return timestamp Last update timestamp
     */
    function getCurrentPrice(address token) external view returns (uint256 price, uint256 timestamp);

    /**
     * @dev Calculates time-weighted average price
     * @param token The token address
     * @param timeWindow Time window in seconds for TWAP calculation
     * @return twap Time-weighted average price
     * @notice Returns 0 if insufficient data for the time window
     */
    function getTWAP(address token, uint256 timeWindow) external view returns (uint256 twap);

    /**
     * @dev Gets historical price data for a token
     * @param token The token address
     * @param fromTimestamp Start timestamp
     * @param toTimestamp End timestamp
     * @return prices Array of prices
     * @return timestamps Array of corresponding timestamps
     * @notice Limited to reasonable array sizes to prevent gas issues
     */
    function getPriceHistory(
        address token,
        uint256 fromTimestamp,
        uint256 toTimestamp
    ) external view returns (uint256[] memory prices, uint256[] memory timestamps);

    // ============ Reputation Scoring ============
    // Required by frontend (Sessions 4, 5)

    /**
     * @dev Gets the reputation score for a credential
     * @param credentialId The credential ID
     * @return score Reputation score (0-1000, where 1000 is highest)
     * @return lastUpdated Timestamp of last score update
     */
    function getReputationScore(bytes32 credentialId) external view returns (
        uint256 score,
        uint256 lastUpdated
    );

    /**
     * @dev Gets the ranking position of a credential
     * @param credentialId The credential ID
     * @return rank Current ranking (1 = highest reputation)
     * @return totalCredentials Total number of ranked credentials
     */
    function getReputationRanking(bytes32 credentialId) external view returns (
        uint256 rank,
        uint256 totalCredentials
    );

    /**
     * @dev Gets top N credentials by reputation score
     * @param limit Maximum number of credentials to return
     * @return credentialIds Array of credential IDs ordered by reputation
     * @return scores Array of corresponding reputation scores
     */
    function getTopCredentials(uint256 limit) external view returns (
        bytes32[] memory credentialIds,
        uint256[] memory scores
    );

    /**
     * @dev Updates reputation score for a credential
     * @param credentialId The credential ID
     * @param tokenAddress Associated token address
     * @notice Only callable by authorized price feed updaters
     */
    function updateReputationScore(bytes32 credentialId, address tokenAddress) external;

    // ============ Volume and Liquidity Data ============
    // Required by analytics UI

    /**
     * @dev Gets trading volume data for a token
     * @param token The token address
     * @param timeWindow Time window in seconds
     * @return volume Total trading volume in the time window
     * @return trades Number of trades in the time window
     */
    function getVolumeData(address token, uint256 timeWindow) external view returns (
        uint256 volume,
        uint256 trades
    );

    /**
     * @dev Gets liquidity data for a token
     * @param token The token address
     * @return totalLiquidity Total liquidity across all pools
     * @return poolCount Number of active pools
     * @return largestPool Address of pool with most liquidity
     */
    function getLiquidityData(address token) external view returns (
        uint256 totalLiquidity,
        uint256 poolCount,
        address largestPool
    );

    /**
     * @dev Gets market cap for a token
     * @param token The token address
     * @return marketCap Current market capitalization
     * @return circulatingSupply Circulating supply used for calculation
     */
    function getMarketCap(address token) external view returns (
        uint256 marketCap,
        uint256 circulatingSupply
    );

    // ============ Price Feed Management ============
    // Required by backend services (Session 7)

    /**
     * @dev Updates price data for a token
     * @param token The token address
     * @param price New price in ETH
     * @param volume Trading volume since last update
     * @param liquidity Current liquidity
     * @notice Only callable by authorized price feed updaters
     */
    function updatePrice(
        address token,
        uint256 price,
        uint256 volume,
        uint256 liquidity
    ) external;

    /**
     * @dev Batch updates prices for multiple tokens
     * @param tokens Array of token addresses
     * @param prices Array of corresponding prices
     * @param volumes Array of corresponding volumes
     * @param liquidities Array of corresponding liquidities
     * @notice Arrays must have equal length
     */
    function batchUpdatePrices(
        address[] calldata tokens,
        uint256[] calldata prices,
        uint256[] calldata volumes,
        uint256[] calldata liquidities
    ) external;

    /**
     * @dev Adds a new price feed updater
     * @param updater Address to grant price update permissions
     * @notice Only callable by admin
     */
    function addPriceFeedUpdater(address updater) external;

    /**
     * @dev Removes a price feed updater
     * @param updater Address to revoke permissions from
     * @notice Only callable by admin
     */
    function removePriceFeedUpdater(address updater) external;

    // ============ Configuration ============

    /**
     * @dev Sets the reputation calculation parameters
     * @param twapWindow Default TWAP window for reputation calculation
     * @param volumeWeight Weight given to volume in reputation score
     * @param liquidityWeight Weight given to liquidity in reputation score
     * @param stabilityWeight Weight given to price stability in reputation score
     * @notice Only callable by admin
     */
    function setReputationParameters(
        uint256 twapWindow,
        uint256 volumeWeight,
        uint256 liquidityWeight,
        uint256 stabilityWeight
    ) external;

    /**
     * @dev Sets the maximum age for price data
     * @param maxAge Maximum age in seconds before price data is considered stale
     * @notice Only callable by admin
     */
    function setMaxPriceAge(uint256 maxAge) external;

    // ============ Events ============
    // Required by real-time UI updates

    /**
     * @dev Emitted when price data is updated
     * @param token Token address
     * @param price New price
     * @param volume Trading volume
     * @param timestamp Update timestamp
     */
    event PriceUpdate(
        address indexed token,
        uint256 price,
        uint256 volume,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation score is updated
     * @param credentialId Credential ID
     * @param oldScore Previous reputation score
     * @param newScore New reputation score
     * @param timestamp Update timestamp
     */
    event ReputationUpdate(
        bytes32 indexed credentialId,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reputation parameters are updated
     * @param twapWindow New TWAP window
     * @param volumeWeight New volume weight
     * @param liquidityWeight New liquidity weight
     * @param stabilityWeight New stability weight
     * @param timestamp Update timestamp
     */
    event ReputationParametersUpdated(
        uint256 twapWindow,
        uint256 volumeWeight,
        uint256 liquidityWeight,
        uint256 stabilityWeight,
        uint256 timestamp
    );

    // ============ Custom Errors ============

    /**
     * @dev Thrown when price data is too old
     */
    error StalePrice(address token, uint256 lastUpdate);

    /**
     * @dev Thrown when insufficient price history exists
     */
    error InsufficientPriceHistory(address token, uint256 requestedWindow);

    /**
     * @dev Thrown when caller is not authorized to update prices
     */
    error UnauthorizedPriceUpdater(address caller);

    /**
     * @dev Thrown when array lengths don't match in batch operations
     */
    error ArrayLengthMismatch();

    /**
     * @dev Thrown when invalid parameters are provided
     */
    error InvalidParameters(string reason);
}