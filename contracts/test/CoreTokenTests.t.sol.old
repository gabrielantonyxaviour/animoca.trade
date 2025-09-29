// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../src/CredentialToken.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/interfaces/ICredentialToken.sol";
import "../src/interfaces/ICredentialTokenFactory.sol";

/**
 * @title CoreTokenTests
 * @dev Comprehensive test suite for CredentialToken and CredentialTokenFactory
 * @notice Tests Session 2 core contracts with 95%+ coverage requirement
 */
contract CoreTokenTests is Test {
    // ============ Test Contracts ============

    CredentialTokenFactory public factory;
    CredentialToken public token;

    // ============ Test Data ============

    address public deployer = address(this);
    address public creator = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    address public minter = address(0x4);

    bytes32 public constant CREDENTIAL_ID = keccak256("test_credential_123");
    bytes32 public constant CREDENTIAL_ID_2 = keccak256("test_credential_456");

    string public constant TOKEN_NAME = "Test Credential Token";
    string public constant TOKEN_SYMBOL = "TCT";
    uint256 public constant EMISSION_RATE = 100 * 1e18; // 100 tokens per day
    uint256 public constant MAX_SUPPLY = 1000000 * 1e18; // 1M tokens max

    // ============ Events ============

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

    event TokenMinted(
        address indexed holder,
        uint256 amount,
        bytes32 indexed credentialId,
        uint256 timestamp
    );

    event TokenBurned(
        address indexed holder,
        uint256 amount,
        uint256 timestamp
    );

    event EmissionRateUpdated(
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );

    // ============ Setup ============

    function setUp() public {
        // Deploy factory
        factory = new CredentialTokenFactory();

        // Fund test accounts
        vm.deal(creator, 10 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);

        // Create a test token
        vm.prank(creator);
        address tokenAddress = factory.createToken(
            CREDENTIAL_ID,
            TOKEN_NAME,
            TOKEN_SYMBOL,
            EMISSION_RATE,
            MAX_SUPPLY
        );

        token = CredentialToken(tokenAddress);
    }

    // ============ Factory Tests ============

    function testFactoryInitialization() public {
        assertEq(factory.owner(), deployer);
        assertEq(factory.getTokenCount(), 1);
        assertTrue(factory.isValidToken(address(token)));
    }

    function testCreateToken() public {
        bytes32 newCredentialId = keccak256("new_credential");

        vm.expectEmit(true, false, true, false);
        emit TokenCreated(
            newCredentialId,
            address(0), // Token address will be checked separately
            creator,
            "New Token",
            "NEW",
            200 * 1e18,
            500000 * 1e18,
            0 // Timestamp will be checked separately
        );

        vm.prank(creator);
        address newTokenAddress = factory.createToken(
            newCredentialId,
            "New Token",
            "NEW",
            200 * 1e18,
            500000 * 1e18
        );

        // Verify token was created
        assertEq(factory.getTokenByCredential(newCredentialId), newTokenAddress);
        assertEq(factory.getCredentialByToken(newTokenAddress), newCredentialId);
        assertTrue(factory.isValidToken(newTokenAddress));
        assertEq(factory.getTokenCount(), 2);
    }

    function testCreateTokenAlreadyExists() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.TokenAlreadyExists.selector,
                CREDENTIAL_ID
            )
        );

        vm.prank(creator);
        factory.createToken(
            CREDENTIAL_ID,
            "Duplicate Token",
            "DUP",
            EMISSION_RATE,
            MAX_SUPPLY
        );
    }

    function testCreateTokenInvalidParameters() public {
        bytes32 newCredentialId = keccak256("new_credential_2");

        // Test empty name
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidParameters.selector,
                "Name cannot be empty"
            )
        );
        vm.prank(creator);
        factory.createToken(newCredentialId, "", "SYM", EMISSION_RATE, MAX_SUPPLY);

        // Test empty symbol
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidParameters.selector,
                "Symbol cannot be empty"
            )
        );
        vm.prank(creator);
        factory.createToken(newCredentialId, "Name", "", EMISSION_RATE, MAX_SUPPLY);

        // Test zero emission rate
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidParameters.selector,
                "Emission rate must be greater than 0"
            )
        );
        vm.prank(creator);
        factory.createToken(newCredentialId, "Name", "SYM", 0, MAX_SUPPLY);

        // Test zero max supply
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidParameters.selector,
                "Max supply must be greater than 0"
            )
        );
        vm.prank(creator);
        factory.createToken(newCredentialId, "Name", "SYM", EMISSION_RATE, 0);

        // Test invalid credential ID
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidCredential.selector,
                bytes32(0)
            )
        );
        vm.prank(creator);
        factory.createToken(bytes32(0), "Name", "SYM", EMISSION_RATE, MAX_SUPPLY);
    }

    function testFactoryDiscoveryFunctions() public {
        // Test existing token
        assertEq(factory.getTokenByCredential(CREDENTIAL_ID), address(token));
        assertEq(factory.getCredentialByToken(address(token)), CREDENTIAL_ID);

        // Test non-existing credential
        bytes32 nonExistingId = keccak256("non_existing");
        assertEq(factory.getTokenByCredential(nonExistingId), address(0));
        assertEq(factory.getCredentialByToken(address(0x999)), bytes32(0));

        // Test getAllTokens
        address[] memory allTokens = factory.getAllTokens();
        assertEq(allTokens.length, 1);
        assertEq(allTokens[0], address(token));
    }

    function testCredentialValidation() public {
        // Test valid credential ownership
        assertTrue(factory.validateCredentialOwnership(CREDENTIAL_ID, creator));
        assertTrue(factory.validateCredentialOwnership(CREDENTIAL_ID, user1));

        // Test invalid cases
        assertFalse(factory.validateCredentialOwnership(CREDENTIAL_ID, address(0)));
        assertFalse(factory.validateCredentialOwnership(bytes32(0), creator));
    }

    // ============ Token Tests ============

    function testTokenInitialization() public {
        assertEq(token.name(), TOKEN_NAME);
        assertEq(token.symbol(), TOKEN_SYMBOL);
        assertEq(token.decimals(), 18);
        assertEq(token.getCredentialId(), CREDENTIAL_ID);
        assertEq(token.getEmissionRate(), EMISSION_RATE);
        assertEq(token.getMaxSupply(), MAX_SUPPLY);
        assertEq(token.getCreator(), creator);
        assertEq(token.totalSupply(), 0);
        assertEq(token.circulatingSupply(), 0);
        assertGt(token.getCreatedAt(), 0);
    }

    function testTokenMinting() public {
        // Set up minter (through factory)
        factory.setTokenMinter(address(token), minter);
        assertEq(token.getMinter(), minter);

        uint256 mintAmount = 1000 * 1e18;

        vm.expectEmit(true, true, true, false);
        emit TokenMinted(user1, mintAmount, CREDENTIAL_ID, 0);

        vm.prank(minter);
        token.mint(user1, mintAmount);

        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.totalSupply(), mintAmount);
        assertEq(token.circulatingSupply(), mintAmount);
    }

    function testTokenMintingRestrictions() public {
        uint256 mintAmount = 1000 * 1e18;

        // Test minting without authorization
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.OnlyMinter.selector,
                creator,
                address(0)
            )
        );
        vm.prank(creator);
        token.mint(user1, mintAmount);

        // Set minter and test invalid amount
        factory.setTokenMinter(address(token), minter);

        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.InvalidAmount.selector,
                0
            )
        );
        vm.prank(minter);
        token.mint(user1, 0);

        // Test exceeding max supply
        uint256 excessiveAmount = MAX_SUPPLY + 1;
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.ExceedsMaxSupply.selector,
                excessiveAmount,
                MAX_SUPPLY
            )
        );
        vm.prank(minter);
        token.mint(user1, excessiveAmount);
    }

    function testTokenBurning() public {
        // First mint some tokens
        factory.setTokenMinter(address(token), minter);
        uint256 mintAmount = 1000 * 1e18;

        vm.prank(minter);
        token.mint(user1, mintAmount);

        // Test burning
        uint256 burnAmount = 300 * 1e18;

        vm.expectEmit(true, true, true, false);
        emit TokenBurned(user1, burnAmount, 0);

        vm.prank(user1);
        token.burn(burnAmount);

        assertEq(token.balanceOf(user1), mintAmount - burnAmount);
        assertEq(token.totalSupply(), mintAmount - burnAmount);
        assertEq(token.totalBurned(), burnAmount);
    }

    function testTokenBurningRestrictions() public {
        // Test burning zero amount
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.InvalidAmount.selector,
                0
            )
        );
        vm.prank(user1);
        token.burn(0);

        // Test burning more than balance
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.InvalidAmount.selector,
                100 * 1e18
            )
        );
        vm.prank(user1);
        token.burn(100 * 1e18);
    }

    function testEmissionRateUpdates() public {
        uint256 newRate = 200 * 1e18;

        vm.expectEmit(true, true, true, false);
        emit EmissionRateUpdated(EMISSION_RATE, newRate, 0);

        vm.prank(creator);
        token.setEmissionRate(newRate);

        assertEq(token.getEmissionRate(), newRate);

        // Test only creator can update
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.OnlyCreator.selector,
                user1,
                creator
            )
        );
        vm.prank(user1);
        token.setEmissionRate(300 * 1e18);

        // Test invalid rate
        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialToken.InvalidEmissionRate.selector,
                0
            )
        );
        vm.prank(creator);
        token.setEmissionRate(0);
    }

    function testOwnerCanUpdateEmissionRate() public {
        uint256 newRate = 250 * 1e18;

        // Factory owner should also be able to update emission rate
        vm.expectEmit(true, true, true, false);
        emit EmissionRateUpdated(EMISSION_RATE, newRate, 0);

        // Factory owner (address(this)) can update emission rate
        factory.setTokenEmissionRate(address(token), newRate);

        assertEq(token.getEmissionRate(), newRate);
    }

    // ============ Integration Tests ============

    function testFactoryTokenIntegration() public {
        // Test that factory correctly sets up the token
        assertEq(token.owner(), address(factory));

        // Set passive token generator on factory
        factory.setPassiveTokenGenerator(minter);

        // Create new token and verify minter is set
        bytes32 newCredentialId = keccak256("integrated_credential");

        vm.prank(creator);
        address newTokenAddress = factory.createToken(
            newCredentialId,
            "Integrated Token",
            "INT",
            EMISSION_RATE,
            MAX_SUPPLY
        );

        CredentialToken newToken = CredentialToken(newTokenAddress);
        assertEq(newToken.getMinter(), minter);
    }

    function testFactoryAdminFunctions() public {
        address newGenerator = address(0x123);
        address newVerifier = address(0x456);

        // Test setting passive token generator
        factory.setPassiveTokenGenerator(newGenerator);
        assertEq(factory.getPassiveTokenGenerator(), newGenerator);

        // Test setting credential verifier
        factory.setCredentialVerifier(newVerifier);
        assertEq(factory.getCredentialVerifier(), newVerifier);

        // Test only owner can set
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        vm.prank(user1);
        factory.setPassiveTokenGenerator(address(0x789));

        // Test invalid generator address
        vm.expectRevert(
            abi.encodeWithSelector(
                ICredentialTokenFactory.InvalidParameters.selector,
                "Generator cannot be zero address"
            )
        );
        factory.setPassiveTokenGenerator(address(0));
    }

    function testGetTokenDetails() public {
        (bool exists, address tokenAddress, address tokenCreator) = factory.getTokenDetails(CREDENTIAL_ID);

        assertTrue(exists);
        assertEq(tokenAddress, address(token));
        assertEq(tokenCreator, creator);

        // Test non-existing credential
        (bool existsNon, address tokenAddressNon, address creatorNon) = factory.getTokenDetails(
            keccak256("non_existing")
        );

        assertFalse(existsNon);
        assertEq(tokenAddressNon, address(0));
        assertEq(creatorNon, address(0));
    }

    // ============ Coverage Tests ============

    function testComprehensiveCoverage() public {
        // Test all remaining functions to ensure 95%+ coverage

        // Test token metadata
        assertEq(token.name(), TOKEN_NAME);
        assertEq(token.symbol(), TOKEN_SYMBOL);
        assertEq(token.decimals(), 18);

        // Test factory functions
        assertTrue(factory.isValidToken(address(token)));
        assertFalse(factory.isValidToken(address(0x999)));

        // Test edge cases
        address[] memory allTokens = factory.getAllTokens();
        assertEq(allTokens.length, factory.getTokenCount());

        // Test transfer functionality (inherited from ERC20)
        factory.setTokenMinter(address(token), minter);
        vm.prank(minter);
        token.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        token.transfer(user2, 100 * 1e18);

        assertEq(token.balanceOf(user2), 100 * 1e18);
        assertEq(token.balanceOf(user1), 900 * 1e18);
    }

    // ============ Gas Tests ============

    function testGasOptimization() public {
        // Test gas costs for common operations
        uint256 gasStart;
        uint256 gasUsed;

        // Test token creation gas cost
        gasStart = gasleft();
        vm.prank(creator);
        factory.createToken(
            keccak256("gas_test"),
            "Gas Test",
            "GAS",
            EMISSION_RATE,
            MAX_SUPPLY
        );
        gasUsed = gasStart - gasleft();

        // Assert reasonable gas usage (adjust threshold as needed)
        assertLt(gasUsed, 3000000); // Less than 3M gas for token creation
    }
}