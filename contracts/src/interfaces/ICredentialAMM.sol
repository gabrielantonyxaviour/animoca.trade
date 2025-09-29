// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICredentialAMM
 * @dev Interface for USDC-based AMM liquidity pools for credential tokens
 * @notice Provides liquidity pools with USDC as the base pair for all credential tokens
 */
interface ICredentialAMM {

    // ============ Structs ============

    struct LiquidityPool {
        address credentialToken;   // Address of the credential token
        uint256 tokenReserves;     // Reserves of credential tokens
        uint256 usdcReserves;      // Reserves of USDT
        uint256 totalLiquidity;    // Total liquidity tokens issued
        uint256 lastPriceUpdateTime; // Last price update timestamp
        bool isActive;             // Whether the pool is active
    }

    struct LiquidityPosition {
        uint256 liquidityTokens;   // LP tokens owned
        uint256 tokenDeposited;    // Credential tokens deposited
        uint256 usdcDeposited;     // USDT deposited
        uint256 accumulatedFees;   // Accumulated trading fees
        uint256 lastDepositTime;   // Last deposit timestamp
    }

    // ============ Events ============

    event PoolCreated(
        bytes32 indexed credentialId,
        address indexed credentialToken,
        address indexed creator,
        uint256 initialTokenAmount,
        uint256 initialUSDCAmount,
        uint256 timestamp
    );

    event LiquidityAdded(
        bytes32 indexed credentialId,
        address indexed provider,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 liquidityMinted,
        uint256 timestamp
    );

    event LiquidityRemoved(
        bytes32 indexed credentialId,
        address indexed provider,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 liquidityBurned,
        uint256 timestamp
    );

    event TokenSwapped(
        bytes32 indexed credentialId,
        address indexed trader,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount,
        uint256 timestamp
    );

    event TradingFeesDistributed(
        bytes32 indexed credentialId,
        uint256 totalFees,
        uint256 lpFees,
        uint256 protocolFees,
        uint256 timestamp
    );

    // ============ Custom Errors ============

    error PoolNotExists(bytes32 credentialId);
    error PoolAlreadyExists(bytes32 credentialId);
    error InsufficientLiquidity(uint256 required, uint256 available);
    error InvalidAmount(uint256 amount);
    error SlippageTooHigh(uint256 expected, uint256 actual);
    error InsufficientBalance(address token, uint256 required, uint256 available);
    error DeadlineExpired(uint256 deadline, uint256 currentTime);
    error InvalidToken(address token);

    // ============ Liquidity Management Functions ============

    /**
     * @dev Creates a new liquidity pool for a credential token
     * @param credentialId The credential ID
     * @param credentialToken The credential token address
     * @param initialTokenAmount Initial credential token amount
     * @param initialUSDCAmount Initial USDT amount
     * @return liquidityMinted The amount of LP tokens minted
     */
    function createPool(
        bytes32 credentialId,
        address credentialToken,
        uint256 initialTokenAmount,
        uint256 initialUSDCAmount
    ) external returns (uint256 liquidityMinted);

    /**
     * @dev Adds liquidity to an existing pool
     * @param credentialId The credential ID
     * @param tokenAmount The credential token amount to add
     * @param usdcAmount The USDT amount to add
     * @param minLiquidity Minimum LP tokens to receive
     * @param deadline Transaction deadline
     * @return liquidityMinted The amount of LP tokens minted
     */
    function addLiquidity(
        bytes32 credentialId,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 minLiquidity,
        uint256 deadline
    ) external returns (uint256 liquidityMinted);

    /**
     * @dev Removes liquidity from a pool
     * @param credentialId The credential ID
     * @param liquidityAmount The LP tokens to burn
     * @param minTokenAmount Minimum credential tokens to receive
     * @param minUSDCAmount Minimum USDT to receive
     * @param deadline Transaction deadline
     * @return tokenAmount Credential tokens received
     * @return usdcAmount USDT received
     */
    function removeLiquidity(
        bytes32 credentialId,
        uint256 liquidityAmount,
        uint256 minTokenAmount,
        uint256 minUSDCAmount,
        uint256 deadline
    ) external returns (uint256 tokenAmount, uint256 usdcAmount);

    // ============ Trading Functions ============

    /**
     * @dev Swaps USDC for credential tokens
     * @param credentialId The credential ID
     * @param usdcAmountIn The USDC amount to swap
     * @param minTokensOut Minimum credential tokens to receive
     * @param deadline Transaction deadline
     * @return tokensOut Credential tokens received
     */
    function swapUSDCForTokens(
        bytes32 credentialId,
        uint256 usdcAmountIn,
        uint256 minTokensOut,
        uint256 deadline
    ) external returns (uint256 tokensOut);

    /**
     * @dev Swaps credential tokens for USDC
     * @param credentialId The credential ID
     * @param tokenAmountIn The credential token amount to swap
     * @param minUSDCOut Minimum USDC to receive
     * @param deadline Transaction deadline
     * @return usdcOut USDC received
     */
    function swapTokensForUSDC(
        bytes32 credentialId,
        uint256 tokenAmountIn,
        uint256 minUSDCOut,
        uint256 deadline
    ) external returns (uint256 usdcOut);

    /**
     * @dev Gets the output amount for a given input (including fees)
     * @param credentialId The credential ID
     * @param tokenIn The input token address
     * @param amountIn The input amount
     * @return amountOut The output amount
     * @return feeAmount The trading fee amount
     */
    function getAmountOut(
        bytes32 credentialId,
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 feeAmount);

    /**
     * @dev Gets the input amount required for a given output
     * @param credentialId The credential ID
     * @param tokenOut The output token address
     * @param amountOut The desired output amount
     * @return amountIn The required input amount
     * @return feeAmount The trading fee amount
     */
    function getAmountIn(
        bytes32 credentialId,
        address tokenOut,
        uint256 amountOut
    ) external view returns (uint256 amountIn, uint256 feeAmount);

    // ============ Fee Management Functions ============

    /**
     * @dev Claims accumulated trading fees for LP position
     * @param credentialId The credential ID
     * @return feeAmount The USDC fees claimed
     */
    function claimTradingFees(bytes32 credentialId) external returns (uint256 feeAmount);

    /**
     * @dev Distributes trading fees to LPs and protocol
     * @param credentialId The credential ID
     * @return lpFees Fees distributed to LPs
     * @return protocolFees Fees sent to protocol
     */
    function distributeTradingFees(bytes32 credentialId) external returns (uint256 lpFees, uint256 protocolFees);

    /**
     * @dev Sets trading fee percentage for a pool
     * @param credentialId The credential ID
     * @param feePercentage The new fee percentage (basis points)
     */
    function setTradingFee(bytes32 credentialId, uint256 feePercentage) external;

    /**
     * @dev Gets trading fee percentage for a pool
     * @param credentialId The credential ID
     * @return feePercentage The current fee percentage (basis points)
     */
    function getTradingFee(bytes32 credentialId) external view returns (uint256 feePercentage);

    // ============ View Functions ============

    /**
     * @dev Gets pool information
     * @param credentialId The credential ID
     * @return pool The liquidity pool data
     */
    function getPool(bytes32 credentialId) external view returns (LiquidityPool memory pool);

    /**
     * @dev Gets user's liquidity position
     * @param credentialId The credential ID
     * @param user The user address
     * @return position The liquidity position data
     */
    function getLiquidityPosition(bytes32 credentialId, address user) external view returns (LiquidityPosition memory position);

    /**
     * @dev Gets current price of credential token in USDC
     * @param credentialId The credential ID
     * @return price The current price (USDC per token)
     */
    function getTokenPrice(bytes32 credentialId) external view returns (uint256 price);

    /**
     * @dev Gets pool reserves
     * @param credentialId The credential ID
     * @return tokenReserves Credential token reserves
     * @return usdcReserves USDC reserves
     */
    function getReserves(bytes32 credentialId) external view returns (uint256 tokenReserves, uint256 usdcReserves);

    /**
     * @dev Checks if a pool exists
     * @param credentialId The credential ID
     * @return exists Whether the pool exists
     */
    function poolExists(bytes32 credentialId) external view returns (bool exists);

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