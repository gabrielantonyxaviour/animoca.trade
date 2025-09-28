// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICredentialTokenFactory
 * @dev Interface for the factory contract that creates credential tokens
 * @notice Manages the 1:1 relationship between credentials and tokens
 */
interface ICredentialTokenFactory {
    // ============ Token Creation ============
    // Required by frontend (Session 4)

    /**
     * @dev Creates a new credential token
     * @param credentialId The unique identifier of the credential
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param emissionRate The initial emission rate in tokens per day
     * @param maxSupply The maximum supply cap for the token
     * @return tokenAddress The address of the newly created token
     * @notice Only credential holders can create tokens for their credentials
     */
    function createToken(
        bytes32 credentialId,
        string memory name,
        string memory symbol,
        uint256 emissionRate,
        uint256 maxSupply
    ) external returns (address tokenAddress);

    // ============ Token Discovery ============
    // Required by frontend (Session 4)

    /**
     * @dev Returns the token address for a given credential ID
     * @param credentialId The credential ID to look up
     * @return tokenAddress The address of the token, or zero address if none exists
     */
    function getTokenByCredential(bytes32 credentialId) external view returns (address tokenAddress);

    /**
     * @dev Returns the credential ID for a given token address
     * @param tokenAddress The token address to look up
     * @return credentialId The credential ID, or zero if not found
     */
    function getCredentialByToken(address tokenAddress) external view returns (bytes32 credentialId);

    /**
     * @dev Checks if a token address is a valid credential token created by this factory
     * @param tokenAddress The token address to validate
     * @return isValid True if the token was created by this factory
     */
    function isValidToken(address tokenAddress) external view returns (bool isValid);

    /**
     * @dev Returns all token addresses created by this factory
     * @return tokens Array of all token addresses
     * @notice Use with caution for large arrays; consider pagination in implementation
     */
    function getAllTokens() external view returns (address[] memory tokens);

    /**
     * @dev Returns the total number of tokens created
     * @return count The number of tokens created by this factory
     */
    function getTokenCount() external view returns (uint256 count);

    // ============ Credential Validation ============
    // Integration with AIR

    /**
     * @dev Validates that an address owns a specific credential
     * @param credentialId The credential ID to validate
     * @param claimant The address claiming to own the credential
     * @return isValid True if the claimant owns the credential
     * @notice This function integrates with the AIR credential system
     */
    function validateCredentialOwnership(
        bytes32 credentialId,
        address claimant
    ) external view returns (bool isValid);

    // ============ Events ============
    // Required by frontend and analytics

    /**
     * @dev Emitted when a new credential token is created
     * @param credentialId The credential ID for which the token was created
     * @param tokenAddress The address of the newly created token
     * @param creator The address that created the token
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param emissionRate The initial emission rate
     * @param maxSupply The maximum supply cap
     * @param timestamp The timestamp of creation
     */
    event TokenCreated(
        bytes32 indexed credentialId,
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 emissionRate,
        uint256 maxSupply,
        uint256 timestamp
    );

    // ============ Custom Errors ============
    // Gas-efficient error handling

    /**
     * @dev Thrown when attempting to create a token for a credential that already has one
     */
    error TokenAlreadyExists(bytes32 credentialId);

    /**
     * @dev Thrown when the caller doesn't own the specified credential
     */
    error NotCredentialOwner(bytes32 credentialId, address caller);

    /**
     * @dev Thrown when invalid parameters are provided
     */
    error InvalidParameters(string reason);

    /**
     * @dev Thrown when a credential ID is invalid or doesn't exist
     */
    error InvalidCredential(bytes32 credentialId);
}