// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICredentialToken
 * @dev Interface for credential-based tokens that represent digital credentials
 * @notice This interface extends ERC20 with credential-specific functionality
 */
interface ICredentialToken is IERC20 {
    // ============ Metadata Functions ============
    // Required by frontend (Session 4)
    // Note: name(), symbol(), decimals() are inherited from IERC20

    /**
     * @dev Returns the credential ID this token represents
     */
    function getCredentialId() external view returns (bytes32);

    /**
     * @dev Returns the emission rate in tokens per day
     */
    function getEmissionRate() external view returns (uint256);

    /**
     * @dev Returns the maximum supply cap for this token
     */
    function getMaxSupply() external view returns (uint256);

    /**
     * @dev Returns the address that created this token
     */
    function getCreator() external view returns (address);

    /**
     * @dev Returns the timestamp when this token was created
     */
    function getCreatedAt() external view returns (uint256);

    // ============ Minting Functions ============
    // Required by passive generator (Session 6)

    /**
     * @dev Mints tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @notice Only callable by authorized minter (PassiveTokenGenerator)
     */
    function mint(address to, uint256 amount) external;

    /**
     * @dev Burns tokens from the caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external;

    /**
     * @dev Updates the emission rate for this token
     * @param newRate The new emission rate in tokens per day
     * @notice Only callable by token creator or authorized admin
     */
    function setEmissionRate(uint256 newRate) external;

    // ============ Supply Tracking ============
    // Required by analytics (Session 7)

    /**
     * @dev Returns the total supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the circulating supply (total supply minus burned tokens)
     */
    function circulatingSupply() external view returns (uint256);

    // ============ Events ============
    // Required by all consuming sessions

    /**
     * @dev Emitted when tokens are minted to a credential holder
     * @param holder The address receiving the tokens
     * @param amount The amount of tokens minted
     * @param credentialId The credential ID for which tokens were minted
     * @param timestamp The timestamp of minting
     */
    event TokenMinted(
        address indexed holder,
        uint256 amount,
        bytes32 indexed credentialId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when tokens are burned
     * @param holder The address burning the tokens
     * @param amount The amount of tokens burned
     * @param timestamp The timestamp of burning
     */
    event TokenBurned(
        address indexed holder,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when the emission rate is updated
     * @param oldRate The previous emission rate
     * @param newRate The new emission rate
     * @param timestamp The timestamp of the update
     */
    event EmissionRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );
}