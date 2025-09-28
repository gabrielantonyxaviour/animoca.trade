// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICredentialPool
 * @dev Interface for AMM pools that enable trading of credential tokens
 * @notice Implements constant product formula (x * y = k) for price discovery
 */
interface ICredentialPool {
    // ============ Pool Information ============
    // Required by trading UI (Session 5)

    /**
     * @dev Returns the first token in the pair
     */
    function token0() external view returns (address);

    /**
     * @dev Returns the second token in the pair
     */
    function token1() external view returns (address);

    /**
     * @dev Returns current reserves and last block timestamp
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     * @return blockTimestampLast Timestamp of last reserve update
     */
    function getReserves() external view returns (
        uint256 reserve0,
        uint256 reserve1,
        uint256 blockTimestampLast
    );

    /**
     * @dev Returns cumulative price for token0
     * @notice Used for TWAP calculations
     */
    function price0CumulativeLast() external view returns (uint256);

    /**
     * @dev Returns cumulative price for token1
     * @notice Used for TWAP calculations
     */
    function price1CumulativeLast() external view returns (uint256);

    /**
     * @dev Returns the constant product k from last transaction
     */
    function kLast() external view returns (uint256);

    // ============ Trading Functions ============
    // Required by trading UI (Session 5)

    /**
     * @dev Performs a token swap
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Recipient address
     * @param data Callback data for flash swaps
     * @notice Exactly one of amount0Out or amount1Out must be zero
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    // ============ Liquidity Functions ============
    // Required by trading UI (Session 5)

    /**
     * @dev Adds liquidity to the pool
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     * @notice Tokens must be transferred to pool before calling
     */
    function mint(address to) external returns (uint256 liquidity);

    /**
     * @dev Removes liquidity from the pool
     * @param to Address to receive underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     * @notice LP tokens must be transferred to pool before calling
     */
    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    // ============ Price Calculation Helpers ============
    // Required by frontend and analytics

    /**
     * @dev Calculates output amount for a given input
     * @param amountIn Input amount
     * @param tokenIn Address of input token
     * @return amountOut Expected output amount
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256 amountOut);

    /**
     * @dev Calculates required input amount for desired output
     * @param amountOut Desired output amount
     * @param tokenOut Address of output token
     * @return amountIn Required input amount
     */
    function getAmountIn(
        uint256 amountOut,
        address tokenOut
    ) external view returns (uint256 amountIn);

    // ============ Fee Tracking ============
    // Required by analytics (Session 7)

    /**
     * @dev Returns total fees collected by the pool
     * @return totalFees Cumulative fees in pool token units
     */
    function getTotalFees() external view returns (uint256 totalFees);

    /**
     * @dev Returns protocol fees collected
     * @return protocolFees Fees reserved for protocol treasury
     */
    function getProtocolFees() external view returns (uint256 protocolFees);

    // ============ Events ============
    // Required by analytics and trading UI

    /**
     * @dev Emitted on token swaps
     * @param sender Address initiating the swap
     * @param amount0In Amount of token0 input
     * @param amount1In Amount of token1 input
     * @param amount0Out Amount of token0 output
     * @param amount1Out Amount of token1 output
     * @param to Recipient address
     * @param timestamp Transaction timestamp
     */
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to,
        uint256 timestamp
    );

    /**
     * @dev Emitted when liquidity is added
     * @param sender Address adding liquidity
     * @param amount0 Amount of token0 added
     * @param amount1 Amount of token1 added
     * @param liquidity LP tokens minted
     * @param timestamp Transaction timestamp
     */
    event Mint(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        uint256 timestamp
    );

    /**
     * @dev Emitted when liquidity is removed
     * @param sender Address removing liquidity
     * @param amount0 Amount of token0 removed
     * @param amount1 Amount of token1 removed
     * @param liquidity LP tokens burned
     * @param to Recipient address
     * @param timestamp Transaction timestamp
     */
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        address indexed to,
        uint256 timestamp
    );

    /**
     * @dev Emitted when reserves are updated
     * @param reserve0 New reserve of token0
     * @param reserve1 New reserve of token1
     */
    event Sync(uint256 reserve0, uint256 reserve1);

    // ============ Custom Errors ============

    /**
     * @dev Thrown when insufficient liquidity is available
     */
    error InsufficientLiquidity();

    /**
     * @dev Thrown when insufficient input amount is provided
     */
    error InsufficientInputAmount();

    /**
     * @dev Thrown when insufficient output amount would be received
     */
    error InsufficientOutputAmount();

    /**
     * @dev Thrown when invalid swap amounts are provided
     */
    error InvalidSwapAmounts();

    /**
     * @dev Thrown when the constant product invariant is violated
     */
    error InvalidConstantProduct();
}