// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";

contract USDCSystemTest is Test {
    // Contract instances
    MockUSDC public usdc;
    FeeCollector public feeCollector;
    CredentialAMM public amm;
    CredentialTokenFactory public factory;

    // Test addresses
    address public deployer;
    address public alice;
    address public bob;
    address public charlie;

    // Test data
    bytes32 public constant TEST_CREDENTIAL_ID = keccak256("TEST_CREDENTIAL");
    bytes32 public constant HIGH_VALUE_CREDENTIAL_ID = keccak256("HIGH_VALUE_CREDENTIAL");

    // Events for testing
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

    function setUp() public {
        // Set up test addresses
        deployer = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

        // Deploy system
        _deploySystem();
        _setupUsers();
    }

    function _deploySystem() internal {
        // Deploy MockUSDC
        usdc = new MockUSDC();

        // Deploy CredentialTokenFactory
        factory = new CredentialTokenFactory();

        // Deploy FeeCollector
        feeCollector = new FeeCollector(address(factory), address(usdc));

        // Deploy CredentialAMM
        amm = new CredentialAMM(address(factory), address(usdc));

        // Configure system
        factory.setFeeCollector(address(feeCollector));
        factory.setUSDCToken(address(usdc));

        // Set test fees
        feeCollector.setGlobalFees(100, 50, 200); // 1%, 0.5%, 2%
        amm.setProtocolFeePercentage(500); // 5%
    }

    function _setupUsers() internal {
        // Give users USDC for testing
        usdc.freeMint(alice, 10000 * 10**6);   // 10,000 USDC
        usdc.freeMint(bob, 10000 * 10**6);     // 10,000 USDC
        usdc.freeMint(charlie, 10000 * 10**6); // 10,000 USDC

        // Approve contracts
        vm.prank(alice);
        usdc.approve(address(feeCollector), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(feeCollector), type(uint256).max);

        vm.prank(charlie);
        usdc.approve(address(feeCollector), type(uint256).max);
    }

    // ============ MockUSDC Tests ============

    function testMockUSDCDeployment() public {
        assertEq(usdc.name(), "Mock USDC");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
        assertTrue(usdc.totalSupply() > 0);
    }

    function testMockUSDCFreeMint() public {
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        usdc.freeMint(alice, 1000 * 10**6);

        assertEq(usdc.balanceOf(alice), balanceBefore + 1000 * 10**6);
    }

    function testMockUSDCMintToSelf() public {
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        usdc.mintToSelf();

        assertEq(usdc.balanceOf(alice), balanceBefore + 1000 * 10**6);
    }

    // ============ CredentialTokenFactory Tests ============

    function testTokenCreationWithFee() public {
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        // Check token was created
        assertTrue(tokenAddress != address(0));
        assertEq(factory.getTokenByCredential(TEST_CREDENTIAL_ID), tokenAddress);

        // Check fee was collected
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertTrue(aliceBalanceBefore > aliceBalanceAfter);

        // Check fee pool
        IFeeCollector.RevenuePool memory pool = feeCollector.getRevenuePool(TEST_CREDENTIAL_ID);
        assertTrue(pool.totalCollected > 0);
    }

    function testTokenCreationFailsWithInsufficientUSDC() public {
        // Give alice minimal USDC
        vm.prank(alice);
        usdc.transfer(bob, usdc.balanceOf(alice) - 1);

        vm.expectRevert();
        vm.prank(alice);
        factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );
    }

    // ============ FeeCollector Tests ============

    function testFeeCollection() public {
        // Create a token first
        vm.prank(alice);
        factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        // Test different fee types
        uint256 mintingFee = feeCollector.collectMintingFee(TEST_CREDENTIAL_ID, alice);
        uint256 verificationFee = feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, alice);
        uint256 highValueFee = feeCollector.collectHighValueFee(TEST_CREDENTIAL_ID, alice);

        assertTrue(mintingFee > 0);
        assertTrue(verificationFee > 0);
        assertTrue(highValueFee > 0);
        assertTrue(mintingFee > verificationFee); // Minting fee should be higher
        assertTrue(highValueFee > mintingFee);    // High value fee should be highest
    }

    function testRevenueDistribution() public {
        // Create token and collect some fees
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        // Mint some tokens to alice and bob
        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);
        token.mint(bob, 500 * 10**18);

        // Collect additional fees
        feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, charlie);
        feeCollector.collectHighValueFee(TEST_CREDENTIAL_ID, charlie);

        // Distribute revenue
        uint256 distributed = feeCollector.distributeRevenue(TEST_CREDENTIAL_ID);
        assertTrue(distributed > 0);

        // Check users can claim rewards
        uint256 aliceRewards = feeCollector.getPendingRewards(TEST_CREDENTIAL_ID, alice);
        uint256 bobRewards = feeCollector.getPendingRewards(TEST_CREDENTIAL_ID, bob);

        assertTrue(aliceRewards > 0);
        assertTrue(bobRewards > 0);
        assertTrue(aliceRewards > bobRewards); // Alice should get more (has more tokens)
    }

    function testRewardsClaiming() public {
        // Setup tokens and distribute revenue
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);

        feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, bob);
        feeCollector.distributeRevenue(TEST_CREDENTIAL_ID);

        // Claim rewards
        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 claimed = feeCollector.claimRewards(TEST_CREDENTIAL_ID);

        assertTrue(claimed > 0);
        assertEq(usdc.balanceOf(alice), aliceBalanceBefore + claimed);
    }

    function testClaimCooldown() public {
        // Setup and claim once
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);

        feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, bob);
        feeCollector.distributeRevenue(TEST_CREDENTIAL_ID);

        vm.prank(alice);
        feeCollector.claimRewards(TEST_CREDENTIAL_ID);

        // Try to claim again immediately (should fail)
        vm.expectRevert();
        vm.prank(alice);
        feeCollector.claimRewards(TEST_CREDENTIAL_ID);
    }

    // ============ CredentialAMM Tests ============

    function testPoolCreation() public {
        // Create token first
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        // Mint tokens and approve
        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);

        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        // Create pool
        uint256 liquidityMinted = amm.createPool(
            TEST_CREDENTIAL_ID,
            tokenAddress,
            100 * 10**18, // 100 tokens
            100 * 10**6   // 100 USDC
        );

        vm.stopPrank();

        assertTrue(liquidityMinted > 0);
        assertTrue(amm.poolExists(TEST_CREDENTIAL_ID));
    }

    function testAddLiquidity() public {
        // Setup pool
        _createTestPool();

        // Add more liquidity
        vm.prank(alice);
        address tokenAddress = factory.getTokenByCredential(TEST_CREDENTIAL_ID);
        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(bob, 1000 * 10**18);

        vm.startPrank(bob);
        token.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        uint256 liquidityMinted = amm.addLiquidity(
            TEST_CREDENTIAL_ID,
            50 * 10**18,  // 50 tokens
            50 * 10**6,   // 50 USDC
            0,            // min liquidity
            block.timestamp + 3600 // deadline
        );

        vm.stopPrank();

        assertTrue(liquidityMinted > 0);
    }

    function testSwapping() public {
        _createTestPool();

        // Test USDC -> Token swap
        vm.startPrank(bob);
        usdc.approve(address(amm), type(uint256).max);

        uint256 tokensOut = amm.swapUSDCForTokens(
            TEST_CREDENTIAL_ID,
            10 * 10**6,        // 10 USDC in
            0,                 // min tokens out
            block.timestamp + 3600 // deadline
        );

        assertTrue(tokensOut > 0);

        // Test Token -> USDC swap
        address tokenAddress = factory.getTokenByCredential(TEST_CREDENTIAL_ID);
        CredentialToken token = CredentialToken(tokenAddress);
        token.approve(address(amm), type(uint256).max);

        uint256 usdcOut = amm.swapTokensForUSDC(
            TEST_CREDENTIAL_ID,
            tokensOut / 2,     // Half of tokens received
            0,                 // min USDC out
            block.timestamp + 3600 // deadline
        );

        vm.stopPrank();

        assertTrue(usdcOut > 0);
    }

    function testTradingFees() public {
        _createTestPool();

        // Perform a swap to generate fees
        vm.startPrank(bob);
        usdc.approve(address(amm), type(uint256).max);

        amm.swapUSDCForTokens(
            TEST_CREDENTIAL_ID,
            100 * 10**6,       // 100 USDC
            0,
            block.timestamp + 3600
        );
        vm.stopPrank();

        // Check accumulated fees
        uint256 fees = amm.claimTradingFees(TEST_CREDENTIAL_ID);
        // Note: Alice is the LP, so she can claim fees
        vm.prank(alice);
        fees = amm.claimTradingFees(TEST_CREDENTIAL_ID);
        assertTrue(fees > 0);
    }

    function testRemoveLiquidity() public {
        _createTestPool();

        // Remove liquidity
        vm.startPrank(alice);

        (uint256 tokenAmount, uint256 usdcAmount) = amm.removeLiquidity(
            TEST_CREDENTIAL_ID,
            50000, // Some liquidity amount
            0,     // min token amount
            0,     // min USDC amount
            block.timestamp + 3600 // deadline
        );

        vm.stopPrank();

        assertTrue(tokenAmount > 0);
        assertTrue(usdcAmount > 0);
    }

    // ============ Integration Tests ============

    function testFullUserJourney() public {
        // 1. Alice creates a credential token (pays minting fee)
        uint256 aliceInitialBalance = usdc.balanceOf(alice);

        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Alice's Credential",
            "ALICE",
            10 * 10**18,
            1000000 * 10**18
        );

        assertTrue(usdc.balanceOf(alice) < aliceInitialBalance);

        // 2. System mints tokens to alice
        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);

        // 3. Alice creates AMM pool
        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        amm.createPool(
            TEST_CREDENTIAL_ID,
            tokenAddress,
            500 * 10**18, // 500 tokens
            500 * 10**6   // 500 USDC
        );
        vm.stopPrank();

        // 4. Bob buys tokens (pays verification fee)
        feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, bob);

        vm.startPrank(bob);
        usdc.approve(address(amm), type(uint256).max);

        uint256 tokensBought = amm.swapUSDCForTokens(
            TEST_CREDENTIAL_ID,
            100 * 10**6,
            0,
            block.timestamp + 3600
        );
        vm.stopPrank();

        assertTrue(tokensBought > 0);
        assertEq(token.balanceOf(bob), tokensBought);

        // 5. Charlie also interacts (pays high value fee)
        feeCollector.collectHighValueFee(TEST_CREDENTIAL_ID, charlie);

        // 6. Distribute revenue to token holders
        uint256 distributed = feeCollector.distributeRevenue(TEST_CREDENTIAL_ID);
        assertTrue(distributed > 0);

        // 7. Alice and Bob claim their rewards
        vm.warp(block.timestamp + 1 days); // Skip cooldown

        uint256 aliceRewardsBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 aliceRewards = feeCollector.claimRewards(TEST_CREDENTIAL_ID);
        assertTrue(aliceRewards > 0);
        assertEq(usdc.balanceOf(alice), aliceRewardsBefore + aliceRewards);

        uint256 bobRewardsBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        uint256 bobRewards = feeCollector.claimRewards(TEST_CREDENTIAL_ID);
        assertTrue(bobRewards > 0);
        assertEq(usdc.balanceOf(bob), bobRewardsBefore + bobRewards);

        // Alice should get more rewards as she has more tokens
        assertTrue(aliceRewards > bobRewards);

        console.log("Full user journey completed successfully!");
        console.log("Alice rewards:", aliceRewards);
        console.log("Bob rewards:", bobRewards);
    }

    // ============ Helper Functions ============

    function _createTestPool() internal {
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        CredentialToken token = CredentialToken(tokenAddress);
        token.mint(alice, 1000 * 10**18);

        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);
        usdc.approve(address(amm), type(uint256).max);

        amm.createPool(
            TEST_CREDENTIAL_ID,
            tokenAddress,
            100 * 10**18,
            100 * 10**6
        );
        vm.stopPrank();
    }

    // ============ Failure Tests ============

    function testCannotCreateDuplicateToken() public {
        vm.prank(alice);
        factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        vm.expectRevert();
        vm.prank(bob);
        factory.createToken(
            TEST_CREDENTIAL_ID,
            "Another Token",
            "ANOTHER",
            10 * 10**18,
            1000000 * 10**18
        );
    }

    function testCannotClaimWithoutTokens() public {
        vm.prank(alice);
        factory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 10**18,
            1000000 * 10**18
        );

        feeCollector.collectVerificationFee(TEST_CREDENTIAL_ID, bob);
        feeCollector.distributeRevenue(TEST_CREDENTIAL_ID);

        // Charlie has no tokens, so he can't claim
        vm.expectRevert();
        vm.prank(charlie);
        feeCollector.claimRewards(TEST_CREDENTIAL_ID);
    }

    function testSwapFailsWithInsufficientLiquidity() public {
        _createTestPool();

        vm.startPrank(bob);
        usdc.approve(address(amm), type(uint256).max);

        // Try to swap more than available liquidity
        vm.expectRevert();
        amm.swapUSDCForTokens(
            TEST_CREDENTIAL_ID,
            10000 * 10**6, // Too much USDC
            0,
            block.timestamp + 3600
        );
        vm.stopPrank();
    }

    function testSlippageProtection() public {
        _createTestPool();

        vm.startPrank(bob);
        usdc.approve(address(amm), type(uint256).max);

        // Set very high minimum tokens out (should fail)
        vm.expectRevert();
        amm.swapUSDCForTokens(
            TEST_CREDENTIAL_ID,
            10 * 10**6,
            1000 * 10**18, // Unrealistic minimum
            block.timestamp + 3600
        );
        vm.stopPrank();
    }
}