// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ICredentialTokenFactory.sol";
import "./interfaces/IFeeCollector.sol";
import "./CredentialToken.sol";

/**
 * @title CredentialTokenFactory
 * @dev Factory contract that creates credential tokens and manages 1:1 relationships
 * @notice Manages the creation and tracking of credential-based tokens
 */
contract CredentialTokenFactory is ICredentialTokenFactory, Ownable, ReentrancyGuard {
    // ============ State Variables ============

    /// @dev Mapping from credential ID to token address
    mapping(bytes32 => address) private _credentialToToken;

    /// @dev Mapping from token address to credential ID
    mapping(address => bytes32) private _tokenToCredential;

    /// @dev Array of all created token addresses
    address[] private _allTokens;

    /// @dev Mapping to check if a token address is valid (created by this factory)
    mapping(address => bool) private _validTokens;

    /// @dev Address of the AIR credential verification contract (for future integration)
    address private _credentialVerifier;

    /// @dev Address of the FeeCollector contract
    address private _feeCollector;

    /// @dev USDC token contract for fee collection
    IERC20 private _usdcToken;

    // ============ Events ============

    event FeeCollectorSet(address indexed feeCollector);
    event CredentialVerifierSet(address indexed verifier);
    event USDCTokenSet(address indexed usdcToken);
    event MintingFeeCollected(bytes32 indexed credentialId, address indexed payer, uint256 feeAmount);

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Owner is set to deployer
    }

    // ============ Admin Functions ============

    /**
     * @dev Sets the FeeCollector contract address
     * @param feeCollector_ The address of the FeeCollector contract
     * @notice Only callable by owner
     */
    function setFeeCollector(address feeCollector_) external onlyOwner {
        if (feeCollector_ == address(0)) revert InvalidParameters("FeeCollector cannot be zero address");
        _feeCollector = feeCollector_;
        emit FeeCollectorSet(feeCollector_);
    }

    /**
     * @dev Sets the USDC token contract address
     * @param usdcToken_ The address of the USDC token contract
     * @notice Only callable by owner
     */
    function setUSDCToken(address usdcToken_) external onlyOwner {
        if (usdcToken_ == address(0)) revert InvalidParameters("USDC token cannot be zero address");
        _usdcToken = IERC20(usdcToken_);
        emit USDCTokenSet(usdcToken_);
    }

    /**
     * @dev Sets the credential verifier contract address for AIR integration
     * @param verifier_ The address of the credential verification contract
     * @notice Only callable by owner - for future AIR integration
     */
    function setCredentialVerifier(address verifier_) external onlyOwner {
        _credentialVerifier = verifier_;
        emit CredentialVerifierSet(verifier_);
    }

    /**
     * @dev Sets the minter for a specific token
     * @param tokenAddress The address of the token
     * @param minter_ The address authorized to mint tokens
     * @notice Only callable by owner
     */
    function setTokenMinter(address tokenAddress, address minter_) external onlyOwner {
        if (!_validTokens[tokenAddress]) revert InvalidParameters("Token not created by this factory");
        CredentialToken(tokenAddress).setMinter(minter_);
    }

    /**
     * @dev Updates the emission rate for a specific token
     * @param tokenAddress The address of the token
     * @param newRate The new emission rate in tokens per day
     * @notice Only callable by owner
     */
    function setTokenEmissionRate(address tokenAddress, uint256 newRate) external onlyOwner {
        if (!_validTokens[tokenAddress]) revert InvalidParameters("Token not created by this factory");
        CredentialToken(tokenAddress).setEmissionRate(newRate);
    }

    // ============ Token Creation ============

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
    ) external override nonReentrant returns (address tokenAddress) {
        // Validate parameters
        if (credentialId == bytes32(0)) revert InvalidCredential(credentialId);
        if (bytes(name).length == 0) revert InvalidParameters("Name cannot be empty");
        if (bytes(symbol).length == 0) revert InvalidParameters("Symbol cannot be empty");
        if (emissionRate == 0) revert InvalidParameters("Emission rate must be greater than 0");
        if (maxSupply == 0) revert InvalidParameters("Max supply must be greater than 0");

        // Check if token already exists for this credential
        if (_credentialToToken[credentialId] != address(0)) {
            revert TokenAlreadyExists(credentialId);
        }

        // Validate credential ownership (currently simplified - will integrate with AIR)
        if (!validateCredentialOwnership(credentialId, msg.sender)) {
            revert NotCredentialOwner(credentialId, msg.sender);
        }

        // Collect minting fee if FeeCollector is configured
        if (_feeCollector != address(0) && address(_usdcToken) != address(0)) {
            uint256 feeAmount = IFeeCollector(_feeCollector).collectMintingFee(credentialId, msg.sender);
            if (feeAmount > 0) {
                emit MintingFeeCollected(credentialId, msg.sender, feeAmount);
            }
        }

        // Create new CredentialToken
        CredentialToken token = new CredentialToken(
            credentialId,
            name,
            symbol,
            emissionRate,
            maxSupply,
            msg.sender,
            address(this)
        );

        tokenAddress = address(token);

        // Set up minter if FeeCollector is configured
        if (_feeCollector != address(0)) {
            token.setMinter(_feeCollector);
        }

        // Update mappings
        _credentialToToken[credentialId] = tokenAddress;
        _tokenToCredential[tokenAddress] = credentialId;
        _allTokens.push(tokenAddress);
        _validTokens[tokenAddress] = true;

        // Emit event
        emit TokenCreated(
            credentialId,
            tokenAddress,
            msg.sender,
            name,
            symbol,
            emissionRate,
            maxSupply,
            block.timestamp
        );

        return tokenAddress;
    }

    // ============ Token Discovery ============

    /**
     * @dev Returns the token address for a given credential ID
     * @param credentialId The credential ID to look up
     * @return tokenAddress The address of the token, or zero address if none exists
     */
    function getTokenByCredential(bytes32 credentialId)
        external
        view
        override
        returns (address tokenAddress)
    {
        return _credentialToToken[credentialId];
    }

    /**
     * @dev Returns the credential ID for a given token address
     * @param tokenAddress The token address to look up
     * @return credentialId The credential ID, or zero if not found
     */
    function getCredentialByToken(address tokenAddress)
        external
        view
        override
        returns (bytes32 credentialId)
    {
        return _tokenToCredential[tokenAddress];
    }

    /**
     * @dev Checks if a token address is a valid credential token created by this factory
     * @param tokenAddress The token address to validate
     * @return isValid True if the token was created by this factory
     */
    function isValidToken(address tokenAddress) external view override returns (bool isValid) {
        return _validTokens[tokenAddress];
    }

    /**
     * @dev Returns all token addresses created by this factory
     * @return tokens Array of all token addresses
     * @notice Use with caution for large arrays; consider pagination in frontend
     */
    function getAllTokens() external view override returns (address[] memory tokens) {
        return _allTokens;
    }

    /**
     * @dev Returns the total number of tokens created
     * @return count The number of tokens created by this factory
     */
    function getTokenCount() external view override returns (uint256 count) {
        return _allTokens.length;
    }

    // ============ Credential Validation ============

    /**
     * @dev Validates that an address owns a specific credential
     * @param credentialId The credential ID to validate
     * @param claimant The address claiming to own the credential
     * @return isValid True if the claimant owns the credential
     * @notice This function currently uses simplified validation - will integrate with AIR
     */
    function validateCredentialOwnership(
        bytes32 credentialId,
        address claimant
    ) public view override returns (bool isValid) {
        // TODO: Integrate with AIR credential verification system
        // For now, we implement basic validation logic

        if (_credentialVerifier != address(0)) {
            // If verifier is set, delegate to it (future AIR integration)
            // For now, return true as we don't have the AIR integration yet
            return true;
        }

        // Simplified validation: any non-zero address can claim any credential
        // This will be replaced with proper AIR integration
        return claimant != address(0) && credentialId != bytes32(0);
    }

    // ============ View Functions ============

    /**
     * @dev Returns the FeeCollector contract address
     * @return The address of the FeeCollector
     */
    function getFeeCollector() external view returns (address) {
        return _feeCollector;
    }

    /**
     * @dev Returns the USDC token contract address
     * @return The address of the USDC token
     */
    function getUSDCToken() external view returns (address) {
        return address(_usdcToken);
    }

    /**
     * @dev Returns the credential verifier contract address
     * @return The address of the credential verifier
     */
    function getCredentialVerifier() external view returns (address) {
        return _credentialVerifier;
    }

    /**
     * @dev Returns details about a credential token
     * @param credentialId The credential ID to get details for
     * @return exists Whether a token exists for this credential
     * @return tokenAddress The address of the token
     * @return creator The address that created the token
     */
    function getTokenDetails(bytes32 credentialId)
        external
        view
        returns (
            bool exists,
            address tokenAddress,
            address creator
        )
    {
        tokenAddress = _credentialToToken[credentialId];
        exists = tokenAddress != address(0);

        if (exists) {
            CredentialToken token = CredentialToken(tokenAddress);
            creator = token.getCreator();
        }
    }
}