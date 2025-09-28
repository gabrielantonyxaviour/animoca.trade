// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ICredentialToken.sol";

/**
 * @title CredentialToken
 * @dev Implementation of credential-based tokens that represent digital credentials
 * @notice This contract extends ERC20 with credential-specific functionality
 */
contract CredentialToken is ICredentialToken, ERC20, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @dev The credential ID this token represents
    bytes32 private _credentialId;

    /// @dev The emission rate in tokens per day (scaled by 1e18)
    uint256 private _emissionRate;

    /// @dev The maximum supply cap for this token
    uint256 private _maxSupply;

    /// @dev The address that created this token
    address private _creator;

    /// @dev The timestamp when this token was created
    uint256 private _createdAt;

    /// @dev The total amount of tokens burned
    uint256 private _totalBurned;

    /// @dev Address authorized to mint tokens (PassiveTokenGenerator)
    address private _minter;

    // ============ Custom Errors ============

    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error OnlyMinter(address caller, address expected);
    error OnlyCreator(address caller, address expected);
    error InvalidAmount(uint256 amount);
    error InvalidEmissionRate(uint256 rate);

    // ============ Modifiers ============

    modifier onlyMinter() {
        if (msg.sender != _minter) {
            revert OnlyMinter(msg.sender, _minter);
        }
        _;
    }

    modifier onlyCreatorOrOwner() {
        if (msg.sender != _creator && msg.sender != owner()) {
            revert OnlyCreator(msg.sender, _creator);
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @dev Creates a new credential token
     * @param credentialId_ The unique identifier of the credential
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param emissionRate_ The initial emission rate in tokens per day
     * @param maxSupply_ The maximum supply cap for the token
     * @param creator_ The address that created this token
     * @param factory_ The factory address that will own this token
     */
    constructor(
        bytes32 credentialId_,
        string memory name_,
        string memory symbol_,
        uint256 emissionRate_,
        uint256 maxSupply_,
        address creator_,
        address factory_
    ) ERC20(name_, symbol_) Ownable(factory_) {
        if (emissionRate_ == 0) revert InvalidEmissionRate(emissionRate_);
        if (maxSupply_ == 0) revert InvalidAmount(maxSupply_);
        if (creator_ == address(0)) revert InvalidAmount(0);
        if (factory_ == address(0)) revert InvalidAmount(0);

        _credentialId = credentialId_;
        _emissionRate = emissionRate_;
        _maxSupply = maxSupply_;
        _creator = creator_;
        _createdAt = block.timestamp;
        _totalBurned = 0;
    }

    // ============ Metadata Functions ============

    /**
     * @dev Returns the number of decimals used to get its user representation
     * @return The number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @dev Returns the credential ID this token represents
     * @return The credential ID
     */
    function getCredentialId() external view override returns (bytes32) {
        return _credentialId;
    }

    /**
     * @dev Returns the emission rate in tokens per day
     * @return The emission rate
     */
    function getEmissionRate() external view override returns (uint256) {
        return _emissionRate;
    }

    /**
     * @dev Returns the maximum supply cap for this token
     * @return The maximum supply
     */
    function getMaxSupply() external view override returns (uint256) {
        return _maxSupply;
    }

    /**
     * @dev Returns the address that created this token
     * @return The creator address
     */
    function getCreator() external view override returns (address) {
        return _creator;
    }

    /**
     * @dev Returns the timestamp when this token was created
     * @return The creation timestamp
     */
    function getCreatedAt() external view override returns (uint256) {
        return _createdAt;
    }

    // ============ Minting Functions ============

    /**
     * @dev Sets the authorized minter address (PassiveTokenGenerator)
     * @param minter_ The address authorized to mint tokens
     * @notice Only callable by the owner (factory)
     */
    function setMinter(address minter_) external onlyOwner {
        _minter = minter_;
    }

    /**
     * @dev Mints tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @notice Only callable by authorized minter (PassiveTokenGenerator)
     */
    function mint(address to, uint256 amount) external override onlyMinter nonReentrant {
        if (amount == 0) revert InvalidAmount(amount);

        uint256 newTotalSupply = totalSupply() + amount;
        if (newTotalSupply > _maxSupply) {
            revert ExceedsMaxSupply(amount, _maxSupply - totalSupply());
        }

        _mint(to, amount);

        emit TokenMinted(to, amount, _credentialId, block.timestamp);
    }

    /**
     * @dev Burns tokens from the caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external override nonReentrant {
        if (amount == 0) revert InvalidAmount(amount);
        if (balanceOf(msg.sender) < amount) revert InvalidAmount(amount);

        _burn(msg.sender, amount);
        _totalBurned += amount;

        emit TokenBurned(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Updates the emission rate for this token
     * @param newRate The new emission rate in tokens per day
     * @notice Only callable by token creator or factory owner
     */
    function setEmissionRate(uint256 newRate) external override onlyCreatorOrOwner {
        if (newRate == 0) revert InvalidEmissionRate(newRate);

        uint256 oldRate = _emissionRate;
        _emissionRate = newRate;

        emit EmissionRateUpdated(oldRate, newRate, block.timestamp);
    }

    // ============ Supply Tracking ============

    /**
     * @dev Returns the total supply of tokens
     * @return The total supply
     */
    function totalSupply() public view override(ERC20, ICredentialToken) returns (uint256) {
        return super.totalSupply();
    }

    /**
     * @dev Returns the circulating supply (total supply minus burned tokens)
     * @return The circulating supply
     */
    function circulatingSupply() external view override returns (uint256) {
        return totalSupply(); // Burned tokens are already subtracted from totalSupply in ERC20
    }

    /**
     * @dev Returns the total amount of tokens burned
     * @return The total burned amount
     */
    function totalBurned() external view returns (uint256) {
        return _totalBurned;
    }

    /**
     * @dev Returns the current minter address
     * @return The minter address
     */
    function getMinter() external view returns (address) {
        return _minter;
    }
}