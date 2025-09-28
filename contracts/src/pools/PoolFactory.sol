// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICredentialPool.sol";
import "../interfaces/ICredentialToken.sol";
import "./CredentialPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PoolFactory
 * @dev Factory contract for creating and managing AMM pools for credential tokens
 * @notice Creates pools with x*y=k constant product formula for price discovery
 */
contract PoolFactory is Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @dev Minimum initial liquidity required (1000 tokens worth)
    uint256 public constant MINIMUM_INITIAL_LIQUIDITY = 1000 * 1e18;

    /// @dev Minimum ETH value required for initial liquidity ($100 worth at $2000/ETH)
    uint256 public constant MINIMUM_ETH_VALUE = 0.05 ether;

    /// @dev Lock period for initial liquidity provider (30 days)
    uint256 public constant INITIAL_LOCK_PERIOD = 30 days;

    /// @dev Protocol fee recipient address
    address public protocolFeeRecipient;

    /// @dev Mapping from token address to pool address
    mapping(address => address) public tokenToPools;

    /// @dev Mapping from pool address to creation info
    mapping(address => PoolInfo) public poolInfo;

    /// @dev Array of all created pools
    address[] public allPools;

    /// @dev Mapping to track if an address is a valid pool
    mapping(address => bool) public isPool;

    /// @dev Pool creation fee (optional, can be set by owner)
    uint256 public poolCreationFee = 0;

    // ============ Structs ============

    struct PoolInfo {
        address token;
        address creator;
        uint256 createdAt;
        uint256 initialLockExpiry;
        uint256 initialTokenLiquidity;
        uint256 initialEthLiquidity;
    }

    // ============ Events ============

    event PoolCreated(
        address indexed token,
        address indexed pool,
        address indexed creator,
        uint256 initialTokenLiquidity,
        uint256 initialEthLiquidity,
        uint256 timestamp
    );

    event ProtocolFeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    event PoolCreationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event FeesCollected(
        address indexed pool,
        uint256 amount
    );

    // ============ Custom Errors ============

    error PoolAlreadyExists(address token);
    error InsufficientInitialLiquidity(uint256 tokenAmount, uint256 ethAmount);
    error InsufficientCreationFee(uint256 sent, uint256 required);
    error InvalidToken(address token);
    error InvalidRecipient(address recipient);
    error TransferFailed();
    error OnlyPool();
    error LiquidityLocked(uint256 unlockTime);

    // ============ Constructor ============

    /**
     * @dev Initializes the factory with protocol fee recipient
     * @param _protocolFeeRecipient Address to receive protocol fees
     */
    constructor(address _protocolFeeRecipient) Ownable(msg.sender) {
        if (_protocolFeeRecipient == address(0)) {
            revert InvalidRecipient(_protocolFeeRecipient);
        }
        protocolFeeRecipient = _protocolFeeRecipient;
    }

    // ============ Pool Creation ============

    /**
     * @dev Creates a new AMM pool for a credential token
     * @param token Address of the credential token
     * @param initialTokenAmount Amount of tokens for initial liquidity
     * @return pool Address of the created pool
     * @notice Requires minimum liquidity and ETH value as specified
     */
    function createPool(
        address token,
        uint256 initialTokenAmount
    ) external payable nonReentrant returns (address pool) {
        // Validation
        if (token == address(0)) revert InvalidToken(token);
        if (tokenToPools[token] != address(0)) {
            revert PoolAlreadyExists(token);
        }

        // Check minimum liquidity requirements
        if (initialTokenAmount < MINIMUM_INITIAL_LIQUIDITY) {
            revert InsufficientInitialLiquidity(initialTokenAmount, msg.value);
        }
        if (msg.value < MINIMUM_ETH_VALUE) {
            revert InsufficientInitialLiquidity(initialTokenAmount, msg.value);
        }

        // Check creation fee if applicable
        uint256 ethForLiquidity = msg.value;
        if (poolCreationFee > 0) {
            if (msg.value < poolCreationFee + MINIMUM_ETH_VALUE) {
                revert InsufficientCreationFee(msg.value, poolCreationFee + MINIMUM_ETH_VALUE);
            }
            ethForLiquidity = msg.value - poolCreationFee;

            // Transfer creation fee to protocol
            (bool success, ) = protocolFeeRecipient.call{value: poolCreationFee}("");
            if (!success) revert TransferFailed();
        }

        // Deploy new pool contract
        pool = address(new CredentialPool(
            token,
            address(this),
            protocolFeeRecipient
        ));

        // Store pool information
        tokenToPools[token] = pool;
        isPool[pool] = true;
        allPools.push(pool);

        poolInfo[pool] = PoolInfo({
            token: token,
            creator: msg.sender,
            createdAt: block.timestamp,
            initialLockExpiry: block.timestamp + INITIAL_LOCK_PERIOD,
            initialTokenLiquidity: initialTokenAmount,
            initialEthLiquidity: ethForLiquidity
        });

        // Transfer tokens from creator to pool
        ICredentialToken(token).transferFrom(
            msg.sender,
            pool,
            initialTokenAmount
        );

        // Transfer ETH to pool
        (bool ethSuccess, ) = pool.call{value: ethForLiquidity}("");
        if (!ethSuccess) revert TransferFailed();

        // Initialize pool with liquidity
        ICredentialPool(pool).mint(msg.sender);

        emit PoolCreated(
            token,
            pool,
            msg.sender,
            initialTokenAmount,
            ethForLiquidity,
            block.timestamp
        );

        return pool;
    }

    // ============ Pool Discovery ============

    /**
     * @dev Returns the pool address for a given token
     * @param token Token address
     * @return Pool address (zero if doesn't exist)
     */
    function getPool(address token) external view returns (address) {
        return tokenToPools[token];
    }

    /**
     * @dev Returns all created pools
     * @return Array of pool addresses
     */
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }

    /**
     * @dev Returns the number of pools created
     * @return Number of pools
     */
    function getPoolCount() external view returns (uint256) {
        return allPools.length;
    }

    /**
     * @dev Checks if initial liquidity is still locked
     * @param pool Pool address
     * @return True if liquidity is locked
     */
    function isLiquidityLocked(address pool) external view returns (bool) {
        return block.timestamp < poolInfo[pool].initialLockExpiry;
    }

    /**
     * @dev Returns detailed information about a pool
     * @param pool Pool address
     * @return info Pool information struct
     */
    function getPoolInfo(address pool) external view returns (PoolInfo memory info) {
        return poolInfo[pool];
    }

    // ============ Admin Functions ============

    /**
     * @dev Updates the protocol fee recipient
     * @param newRecipient New recipient address
     * @notice Only callable by owner
     */
    function setProtocolFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert InvalidRecipient(newRecipient);
        }

        address oldRecipient = protocolFeeRecipient;
        protocolFeeRecipient = newRecipient;

        emit ProtocolFeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @dev Updates the pool creation fee
     * @param newFee New fee amount in wei
     * @notice Only callable by owner
     */
    function setPoolCreationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = poolCreationFee;
        poolCreationFee = newFee;

        emit PoolCreationFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Collects protocol fees from a pool
     * @param pool Pool address to collect from
     * @notice Only callable by owner
     */
    function collectProtocolFees(address pool) external onlyOwner {
        if (!isPool[pool]) revert OnlyPool();

        uint256 fees = ICredentialPool(pool).getProtocolFees();
        if (fees > 0) {
            // This would call a function in the pool to transfer fees
            // Implementation depends on pool contract
            emit FeesCollected(pool, fees);
        }
    }

    // ============ Receive Function ============

    /**
     * @dev Prevents accidental ETH transfers
     */
    receive() external payable {
        revert("Direct ETH transfers not accepted");
    }
}