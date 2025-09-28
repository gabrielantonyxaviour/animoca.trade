// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICredentialPool.sol";
import "../interfaces/ICredentialToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title CredentialPool
 * @dev AMM pool implementation with constant product formula (x*y=k)
 * @notice Enables trading of credential tokens against ETH with 0.3% fee
 */
contract CredentialPool is ICredentialPool, ERC20, ReentrancyGuard {
    using Math for uint256;

    // ============ Constants ============

    /// @dev Total fee is 0.3% (3/1000)
    uint256 private constant TOTAL_FEE = 3;
    uint256 private constant FEE_DENOMINATOR = 1000;

    /// @dev Protocol fee is 0.05% (1/6 of total fee)
    uint256 private constant PROTOCOL_FEE_SHARE = 1;
    uint256 private constant PROTOCOL_FEE_DENOMINATOR = 6;

    /// @dev Minimum liquidity locked forever in the pool
    uint256 private constant MINIMUM_LIQUIDITY = 10**3;

    // ============ State Variables ============

    /// @dev Token0 is always the credential token
    address public immutable override token0;

    /// @dev Token1 is always WETH (or ETH in this implementation)
    address public constant override token1 = address(0); // ETH

    /// @dev Factory address that deployed this pool
    address public immutable factory;

    /// @dev Protocol fee recipient
    address public immutable protocolFeeRecipient;

    /// @dev Reserve of token0
    uint256 private reserve0;

    /// @dev Reserve of token1 (ETH)
    uint256 private reserve1;

    /// @dev Block timestamp of last reserve update
    uint256 private blockTimestampLast;

    /// @dev Cumulative price of token0 (for TWAP)
    uint256 public override price0CumulativeLast;

    /// @dev Cumulative price of token1 (for TWAP)
    uint256 public override price1CumulativeLast;

    /// @dev Last k value for fee calculation
    uint256 public override kLast;

    /// @dev Total fees collected
    uint256 private totalFeesCollected;

    /// @dev Protocol fees collected
    uint256 private protocolFeesCollected;

    /// @dev Lock for mint/burn/swap operations
    uint256 private unlocked = 1;

    // ============ Modifiers ============

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "ONLY_FACTORY");
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Creates a new AMM pool
     * @param _token0 Address of the credential token
     * @param _factory Address of the factory contract
     * @param _protocolFeeRecipient Address to receive protocol fees
     */
    constructor(
        address _token0,
        address _factory,
        address _protocolFeeRecipient
    ) ERC20("Credential Pool LP", "CRED-LP") {
        require(_token0 != address(0), "ZERO_ADDRESS");
        require(_factory != address(0), "ZERO_ADDRESS");
        require(_protocolFeeRecipient != address(0), "ZERO_ADDRESS");

        token0 = _token0;
        factory = _factory;
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    // ============ Pool Information Functions ============

    /**
     * @dev Returns current reserves and last update timestamp
     */
    function getReserves() external view override returns (
        uint256 _reserve0,
        uint256 _reserve1,
        uint256 _blockTimestampLast
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    // ============ Trading Functions ============

    /**
     * @dev Swaps tokens according to constant product formula
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of ETH to send out
     * @param to Recipient address
     * @param data Callback data (unused in this implementation)
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external override lock nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(to != token0 && to != address(this), "INVALID_TO");

        (uint256 _reserve0, uint256 _reserve1,) = this.getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");

        // Optimistically transfer tokens out
        if (amount0Out > 0) {
            ICredentialToken(token0).transfer(to, amount0Out);
        }
        if (amount1Out > 0) {
            (bool success,) = to.call{value: amount1Out}("");
            require(success, "ETH_TRANSFER_FAILED");
        }

        uint256[2] memory balances;
        uint256[2] memory amountsIn;

        // Get new balances
        balances[0] = ICredentialToken(token0).balanceOf(address(this));
        balances[1] = address(this).balance;

        // Calculate amount in
        amountsIn[0] = balances[0] > _reserve0 - amount0Out ? balances[0] - (_reserve0 - amount0Out) : 0;
        amountsIn[1] = balances[1] > _reserve1 - amount1Out ? balances[1] - (_reserve1 - amount1Out) : 0;
        require(amountsIn[0] > 0 || amountsIn[1] > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // Verify constant product formula with fees
        {
            uint256 balance0Adjusted = balances[0] * FEE_DENOMINATOR - amountsIn[0] * TOTAL_FEE;
            uint256 balance1Adjusted = balances[1] * FEE_DENOMINATOR - amountsIn[1] * TOTAL_FEE;
            require(
                balance0Adjusted * balance1Adjusted >= _reserve0 * _reserve1 * FEE_DENOMINATOR ** 2,
                "K_INVARIANT_FAILED"
            );
        }

        // Update fee tracking
        uint256 totalFee = (amountsIn[0] + amountsIn[1]) * TOTAL_FEE / FEE_DENOMINATOR;
        totalFeesCollected += totalFee;
        protocolFeesCollected += totalFee * PROTOCOL_FEE_SHARE / PROTOCOL_FEE_DENOMINATOR;

        _update(balances[0], balances[1], _reserve0, _reserve1);

        emit Swap(msg.sender, amountsIn[0], amountsIn[1], amount0Out, amount1Out, to, block.timestamp);
    }

    // ============ Liquidity Functions ============

    /**
     * @dev Mints LP tokens for liquidity provision
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external override lock nonReentrant returns (uint256 liquidity) {
        (uint256 _reserve0, uint256 _reserve1,) = this.getReserves();
        uint256 balance0 = ICredentialToken(token0).balanceOf(address(this));
        uint256 balance1 = address(this).balance;
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            // First liquidity provider
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY); // Permanently lock minimum liquidity to address(1)
        } else {
            // Subsequent liquidity providers
            liquidity = Math.min(
                amount0 * _totalSupply / _reserve0,
                amount1 * _totalSupply / _reserve1
            );
        }

        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Mint(msg.sender, amount0, amount1, liquidity, block.timestamp);
    }

    /**
     * @dev Burns LP tokens to withdraw liquidity
     * @param to Address to receive underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of ETH returned
     */
    function burn(address to) external override lock nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint256 _reserve0, uint256 _reserve1,) = this.getReserves();
        uint256 balance0 = ICredentialToken(token0).balanceOf(address(this));
        uint256 balance1 = address(this).balance;
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = liquidity * balance0 / _totalSupply;
        amount1 = liquidity * balance1 / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);

        ICredentialToken(token0).transfer(to, amount0);
        (bool success,) = to.call{value: amount1}("");
        require(success, "ETH_TRANSFER_FAILED");

        balance0 = ICredentialToken(token0).balanceOf(address(this));
        balance1 = address(this).balance;

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Burn(msg.sender, amount0, amount1, liquidity, to, block.timestamp);
    }

    // ============ Price Calculation Helpers ============

    /**
     * @dev Calculates output amount for a given input
     * @param amountIn Input amount
     * @param tokenIn Address of input token
     * @return amountOut Expected output amount
     */
    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view override returns (uint256 amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN");

        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);

        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - TOTAL_FEE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Calculates required input amount for desired output
     * @param amountOut Desired output amount
     * @param tokenOut Address of output token
     * @return amountIn Required input amount
     */
    function getAmountIn(
        uint256 amountOut,
        address tokenOut
    ) external view override returns (uint256 amountIn) {
        require(amountOut > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(tokenOut == token0 || tokenOut == token1, "INVALID_TOKEN");

        (uint256 reserveIn, uint256 reserveOut) = tokenOut == token0
            ? (reserve1, reserve0)
            : (reserve0, reserve1);

        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        require(reserveOut > amountOut, "INSUFFICIENT_RESERVES");

        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * (FEE_DENOMINATOR - TOTAL_FEE);
        amountIn = (numerator / denominator) + 1; // Round up
    }

    // ============ Fee Tracking ============

    /**
     * @dev Returns total fees collected by the pool
     */
    function getTotalFees() external view override returns (uint256) {
        return totalFeesCollected;
    }

    /**
     * @dev Returns protocol fees collected
     */
    function getProtocolFees() external view override returns (uint256) {
        return protocolFeesCollected;
    }

    // ============ Internal Functions ============

    /**
     * @dev Updates reserves and price accumulators
     */
    function _update(uint256 balance0, uint256 balance1, uint256 _reserve0, uint256 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");

        uint256 timeElapsed = block.timestamp - blockTimestampLast;
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // Update cumulative prices for TWAP
            price0CumulativeLast += uint256(_reserve1) * timeElapsed / _reserve0;
            price1CumulativeLast += uint256(_reserve0) * timeElapsed / _reserve1;
        }

        reserve0 = balance0;
        reserve1 = balance1;
        blockTimestampLast = block.timestamp;

        emit Sync(reserve0, reserve1);
    }

    // ============ Skim Functions ============

    /**
     * @dev Force balances to match reserves
     */
    function skim(address to) external lock nonReentrant {
        uint256 balance0 = ICredentialToken(token0).balanceOf(address(this));
        uint256 balance1 = address(this).balance;

        if (balance0 > reserve0) {
            ICredentialToken(token0).transfer(to, balance0 - reserve0);
        }
        if (balance1 > reserve1) {
            (bool success,) = to.call{value: balance1 - reserve1}("");
            require(success, "ETH_TRANSFER_FAILED");
        }
    }

    /**
     * @dev Force reserves to match balances
     */
    function sync() external lock nonReentrant {
        _update(
            ICredentialToken(token0).balanceOf(address(this)),
            address(this).balance,
            reserve0,
            reserve1
        );
    }

    // ============ Receive ETH ============

    /**
     * @dev Allow pool to receive ETH
     */
    receive() external payable {}
}