// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ICredentialAMM.sol";
import "./interfaces/ICredentialTokenFactory.sol";
import "./interfaces/ICredentialToken.sol";

/**
 * @title CredentialAMM
 * @dev USDC-based AMM for credential token liquidity pools
 * @notice Provides automated market making with USDC as the base pair
 */
contract CredentialAMM is ICredentialAMM, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    uint256 private constant DEFAULT_TRADING_FEE = 30; // 0.3%
    uint256 private constant MAX_TRADING_FEE = 500; // 5%

    // ============ State Variables ============

    /// @dev Factory contract for credential tokens
    ICredentialTokenFactory private immutable factory;

    /// @dev USDC token contract
    IERC20 private usdcToken;

    /// @dev Liquidity pools for each credential
    mapping(bytes32 => LiquidityPool) private pools;

    /// @dev User liquidity positions
    mapping(bytes32 => mapping(address => LiquidityPosition)) private positions;

    /// @dev LP token balances (credential => user => balance)
    mapping(bytes32 => mapping(address => uint256)) private lpTokenBalances;

    /// @dev Trading fee percentages per pool (basis points)
    mapping(bytes32 => uint256) private tradingFees;

    /// @dev Accumulated trading fees per pool
    mapping(bytes32 => uint256) private accumulatedFees;

    /// @dev Fee recipient (for protocol fees)
    address private feeRecipient;

    /// @dev Protocol fee percentage (basis points)
    uint256 private protocolFeePercentage = 500; // 5% of trading fees

    // ============ Constructor ============

    constructor(address factory_, address usdcToken_) Ownable(msg.sender) {
        if (factory_ == address(0) || usdcToken_ == address(0)) {
            revert InvalidToken(address(0));
        }

        factory = ICredentialTokenFactory(factory_);
        usdcToken = IERC20(usdcToken_);
        feeRecipient = msg.sender;
    }

    // ============ Pool Management Functions ============

    /**
     * @inheritdoc ICredentialAMM
     */
    function createPool(
        bytes32 credentialId,
        address credentialToken,
        uint256 initialTokenAmount,
        uint256 initialUSDCAmount
    ) external override nonReentrant returns (uint256 liquidityMinted) {
        if (pools[credentialId].isActive) revert PoolAlreadyExists(credentialId);
        if (initialTokenAmount == 0 || initialUSDCAmount == 0) revert InvalidAmount(0);

        // Validate token is from factory
        if (!factory.isValidToken(credentialToken)) revert InvalidToken(credentialToken);

        // Transfer tokens to contract
        IERC20(credentialToken).safeTransferFrom(msg.sender, address(this), initialTokenAmount);
        usdcToken.safeTransferFrom(msg.sender, address(this), initialUSDCAmount);

        // Calculate initial liquidity (geometric mean)
        liquidityMinted = _sqrt(initialTokenAmount * initialUSDCAmount);
        if (liquidityMinted <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity(liquidityMinted, MINIMUM_LIQUIDITY);

        // Initialize pool
        pools[credentialId] = LiquidityPool({
            credentialToken: credentialToken,
            tokenReserves: initialTokenAmount,
            usdcReserves: initialUSDCAmount,
            totalLiquidity: liquidityMinted,
            lastPriceUpdateTime: block.timestamp,
            isActive: true
        });

        // Set default trading fee
        tradingFees[credentialId] = DEFAULT_TRADING_FEE;

        // Initialize user position
        positions[credentialId][msg.sender] = LiquidityPosition({
            liquidityTokens: liquidityMinted,
            tokenDeposited: initialTokenAmount,
            usdcDeposited: initialUSDCAmount,
            accumulatedFees: 0,
            lastDepositTime: block.timestamp
        });

        lpTokenBalances[credentialId][msg.sender] = liquidityMinted;

        emit PoolCreated(
            credentialId,
            credentialToken,
            msg.sender,
            initialTokenAmount,
            initialUSDCAmount,
            block.timestamp
        );

        return liquidityMinted;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function addLiquidity(
        bytes32 credentialId,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 minLiquidity,
        uint256 deadline
    ) external override nonReentrant returns (uint256 liquidityMinted) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (!pools[credentialId].isActive) revert PoolNotExists(credentialId);

        LiquidityPool storage pool = pools[credentialId];

        // Calculate optimal amounts based on current ratio
        uint256 optimalTokenAmount = (usdcAmount * pool.tokenReserves) / pool.usdcReserves;
        uint256 optimalUSDCAmount = (tokenAmount * pool.usdcReserves) / pool.tokenReserves;

        uint256 actualTokenAmount;
        uint256 actualUSDCAmount;

        if (optimalTokenAmount <= tokenAmount) {
            actualTokenAmount = optimalTokenAmount;
            actualUSDCAmount = usdcAmount;
        } else {
            actualTokenAmount = tokenAmount;
            actualUSDCAmount = optimalUSDCAmount;
        }

        // Calculate liquidity tokens to mint
        liquidityMinted = _min(
            (actualTokenAmount * pool.totalLiquidity) / pool.tokenReserves,
            (actualUSDCAmount * pool.totalLiquidity) / pool.usdcReserves
        );

        if (liquidityMinted < minLiquidity) revert SlippageTooHigh(minLiquidity, liquidityMinted);

        // Transfer tokens
        IERC20(pool.credentialToken).safeTransferFrom(msg.sender, address(this), actualTokenAmount);
        usdcToken.safeTransferFrom(msg.sender, address(this), actualUSDCAmount);

        // Update pool state
        pool.tokenReserves += actualTokenAmount;
        pool.usdcReserves += actualUSDCAmount;
        pool.totalLiquidity += liquidityMinted;

        // Update user position
        LiquidityPosition storage position = positions[credentialId][msg.sender];
        position.liquidityTokens += liquidityMinted;
        position.tokenDeposited += actualTokenAmount;
        position.usdcDeposited += actualUSDCAmount;
        position.lastDepositTime = block.timestamp;

        lpTokenBalances[credentialId][msg.sender] += liquidityMinted;

        emit LiquidityAdded(
            credentialId,
            msg.sender,
            actualTokenAmount,
            actualUSDCAmount,
            liquidityMinted,
            block.timestamp
        );

        return liquidityMinted;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function removeLiquidity(
        bytes32 credentialId,
        uint256 liquidityAmount,
        uint256 minTokenAmount,
        uint256 minUSDCAmount,
        uint256 deadline
    ) external override nonReentrant returns (uint256 tokenAmount, uint256 usdcAmount) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (!pools[credentialId].isActive) revert PoolNotExists(credentialId);

        LiquidityPosition storage position = positions[credentialId][msg.sender];
        if (position.liquidityTokens < liquidityAmount) {
            revert InsufficientLiquidity(liquidityAmount, position.liquidityTokens);
        }

        LiquidityPool storage pool = pools[credentialId];

        // Calculate amounts to return
        tokenAmount = (liquidityAmount * pool.tokenReserves) / pool.totalLiquidity;
        usdcAmount = (liquidityAmount * pool.usdcReserves) / pool.totalLiquidity;

        if (tokenAmount < minTokenAmount || usdcAmount < minUSDCAmount) {
            revert SlippageTooHigh(minTokenAmount, tokenAmount);
        }

        // Update pool state
        pool.tokenReserves -= tokenAmount;
        pool.usdcReserves -= usdcAmount;
        pool.totalLiquidity -= liquidityAmount;

        // Update user position
        position.liquidityTokens -= liquidityAmount;
        lpTokenBalances[credentialId][msg.sender] -= liquidityAmount;

        // Transfer tokens back
        IERC20(pool.credentialToken).safeTransfer(msg.sender, tokenAmount);
        usdcToken.safeTransfer(msg.sender, usdcAmount);

        emit LiquidityRemoved(
            credentialId,
            msg.sender,
            tokenAmount,
            usdcAmount,
            liquidityAmount,
            block.timestamp
        );

        return (tokenAmount, usdcAmount);
    }

    // ============ Trading Functions ============

    /**
     * @inheritdoc ICredentialAMM
     */
    function swapUSDCForTokens(
        bytes32 credentialId,
        uint256 usdcAmountIn,
        uint256 minTokensOut,
        uint256 deadline
    ) external override nonReentrant returns (uint256 tokensOut) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (!pools[credentialId].isActive) revert PoolNotExists(credentialId);

        LiquidityPool storage pool = pools[credentialId];
        (tokensOut,) = getAmountOut(credentialId, address(usdcToken), usdcAmountIn);

        if (tokensOut < minTokensOut) revert SlippageTooHigh(minTokensOut, tokensOut);

        // Calculate fee
        uint256 feeAmount = _calculateTradingFee(credentialId, usdcAmountIn);
        uint256 usdcAmountAfterFee = usdcAmountIn - feeAmount;

        // Transfer USDC from user
        usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmountIn);

        // Update reserves
        pool.usdcReserves += usdcAmountAfterFee;
        pool.tokenReserves -= tokensOut;
        pool.lastPriceUpdateTime = block.timestamp;

        // Accumulate fees
        accumulatedFees[credentialId] += feeAmount;

        // Transfer tokens to user
        IERC20(pool.credentialToken).safeTransfer(msg.sender, tokensOut);

        emit TokenSwapped(
            credentialId,
            msg.sender,
            address(usdcToken),
            pool.credentialToken,
            usdcAmountIn,
            tokensOut,
            feeAmount,
            block.timestamp
        );

        return tokensOut;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function swapTokensForUSDC(
        bytes32 credentialId,
        uint256 tokenAmountIn,
        uint256 minUSDCOut,
        uint256 deadline
    ) external override nonReentrant returns (uint256 usdcOut) {
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (!pools[credentialId].isActive) revert PoolNotExists(credentialId);

        LiquidityPool storage pool = pools[credentialId];
        (usdcOut,) = getAmountOut(credentialId, pool.credentialToken, tokenAmountIn);

        if (usdcOut < minUSDCOut) revert SlippageTooHigh(minUSDCOut, usdcOut);

        // Calculate fee (in USDC terms)
        uint256 feeAmount = _calculateTradingFee(credentialId, usdcOut);
        uint256 usdcAmountAfterFee = usdcOut - feeAmount;

        // Transfer tokens from user
        IERC20(pool.credentialToken).safeTransferFrom(msg.sender, address(this), tokenAmountIn);

        // Update reserves
        pool.tokenReserves += tokenAmountIn;
        pool.usdcReserves -= usdcOut;
        pool.lastPriceUpdateTime = block.timestamp;

        // Accumulate fees
        accumulatedFees[credentialId] += feeAmount;

        // Transfer USDC to user
        usdcToken.safeTransfer(msg.sender, usdcAmountAfterFee);

        emit TokenSwapped(
            credentialId,
            msg.sender,
            pool.credentialToken,
            address(usdcToken),
            tokenAmountIn,
            usdcOut,
            feeAmount,
            block.timestamp
        );

        return usdcAmountAfterFee;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getAmountOut(
        bytes32 credentialId,
        address tokenIn,
        uint256 amountIn
    ) public view override returns (uint256 amountOut, uint256 feeAmount) {
        if (!pools[credentialId].isActive) return (0, 0);

        LiquidityPool memory pool = pools[credentialId];
        feeAmount = _calculateTradingFee(credentialId, amountIn);
        uint256 amountInAfterFee = amountIn - feeAmount;

        if (tokenIn == address(usdcToken)) {
            // USDC -> Token
            amountOut = (amountInAfterFee * pool.tokenReserves) / (pool.usdcReserves + amountInAfterFee);
        } else if (tokenIn == pool.credentialToken) {
            // Token -> USDC
            amountOut = (amountInAfterFee * pool.usdcReserves) / (pool.tokenReserves + amountInAfterFee);
        }

        return (amountOut, feeAmount);
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getAmountIn(
        bytes32 credentialId,
        address tokenOut,
        uint256 amountOut
    ) external view override returns (uint256 amountIn, uint256 feeAmount) {
        if (!pools[credentialId].isActive) return (0, 0);

        LiquidityPool memory pool = pools[credentialId];

        if (tokenOut == address(usdcToken)) {
            // Token -> USDC
            amountIn = (pool.tokenReserves * amountOut) / (pool.usdcReserves - amountOut);
        } else if (tokenOut == pool.credentialToken) {
            // USDC -> Token
            amountIn = (pool.usdcReserves * amountOut) / (pool.tokenReserves - amountOut);
        }

        feeAmount = _calculateTradingFee(credentialId, amountIn);
        amountIn += feeAmount;

        return (amountIn, feeAmount);
    }

    // ============ Fee Management Functions ============

    /**
     * @inheritdoc ICredentialAMM
     */
    function claimTradingFees(bytes32 credentialId) external override nonReentrant returns (uint256 feeAmount) {
        LiquidityPosition storage position = positions[credentialId][msg.sender];
        LiquidityPool memory pool = pools[credentialId];

        if (position.liquidityTokens == 0) return 0;

        // Calculate user's share of accumulated fees
        uint256 userShare = (accumulatedFees[credentialId] * position.liquidityTokens) / pool.totalLiquidity;
        feeAmount = userShare - position.accumulatedFees;

        if (feeAmount == 0) return 0;

        position.accumulatedFees += feeAmount;
        usdcToken.safeTransfer(msg.sender, feeAmount);

        return feeAmount;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function distributeTradingFees(bytes32 credentialId) external override nonReentrant returns (uint256 lpFees, uint256 protocolFees) {
        uint256 totalFees = accumulatedFees[credentialId];
        if (totalFees == 0) return (0, 0);

        protocolFees = (totalFees * protocolFeePercentage) / BASIS_POINTS;
        lpFees = totalFees - protocolFees;

        // Transfer protocol fees
        if (protocolFees > 0) {
            usdcToken.safeTransfer(feeRecipient, protocolFees);
        }

        // Reset accumulated fees (LP fees remain in contract for users to claim)
        accumulatedFees[credentialId] = lpFees;

        emit TradingFeesDistributed(credentialId, totalFees, lpFees, protocolFees, block.timestamp);

        return (lpFees, protocolFees);
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function setTradingFee(bytes32 credentialId, uint256 feePercentage) external override onlyOwner {
        if (feePercentage > MAX_TRADING_FEE) revert InvalidAmount(feePercentage);
        tradingFees[credentialId] = feePercentage;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getTradingFee(bytes32 credentialId) external view override returns (uint256 feePercentage) {
        uint256 fee = tradingFees[credentialId];
        return fee == 0 ? DEFAULT_TRADING_FEE : fee;
    }

    // ============ View Functions ============

    /**
     * @inheritdoc ICredentialAMM
     */
    function getPool(bytes32 credentialId) external view override returns (LiquidityPool memory pool) {
        return pools[credentialId];
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getLiquidityPosition(bytes32 credentialId, address user) external view override returns (LiquidityPosition memory position) {
        return positions[credentialId][user];
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getTokenPrice(bytes32 credentialId) external view override returns (uint256 price) {
        LiquidityPool memory pool = pools[credentialId];
        if (pool.tokenReserves == 0) return 0;
        return (pool.usdcReserves * 1e18) / pool.tokenReserves;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getReserves(bytes32 credentialId) external view override returns (uint256 tokenReserves, uint256 usdcReserves) {
        LiquidityPool memory pool = pools[credentialId];
        return (pool.tokenReserves, pool.usdcReserves);
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function poolExists(bytes32 credentialId) external view override returns (bool exists) {
        return pools[credentialId].isActive;
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function getUSDCAddress() external view override returns (address) {
        return address(usdcToken);
    }

    /**
     * @inheritdoc ICredentialAMM
     */
    function setUSDCAddress(address usdcAddress) external override onlyOwner {
        if (usdcAddress == address(0)) revert InvalidToken(usdcAddress);
        usdcToken = IERC20(usdcAddress);
    }

    // ============ Internal Helper Functions ============

    /**
     * @dev Calculates trading fee amount
     */
    function _calculateTradingFee(bytes32 credentialId, uint256 amount) private view returns (uint256) {
        uint256 feePercentage = tradingFees[credentialId];
        if (feePercentage == 0) feePercentage = DEFAULT_TRADING_FEE;
        return (amount * feePercentage) / BASIS_POINTS;
    }

    /**
     * @dev Square root function for liquidity calculation
     */
    function _sqrt(uint256 y) private pure returns (uint256) {
        if (y == 0) return 0;
        uint256 z = (y + 1) / 2;
        uint256 x = y;
        while (z < x) {
            x = z;
            z = (y / z + z) / 2;
        }
        return x;
    }

    /**
     * @dev Returns the minimum of two numbers
     */
    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    // ============ Admin Functions ============

    /**
     * @dev Sets the fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidToken(newRecipient);
        feeRecipient = newRecipient;
    }

    /**
     * @dev Sets the protocol fee percentage
     */
    function setProtocolFeePercentage(uint256 percentage) external onlyOwner {
        if (percentage > BASIS_POINTS) revert InvalidAmount(percentage);
        protocolFeePercentage = percentage;
    }

    /**
     * @dev Gets current fee recipient
     */
    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }

    /**
     * @dev Gets protocol fee percentage
     */
    function getProtocolFeePercentage() external view returns (uint256) {
        return protocolFeePercentage;
    }
}