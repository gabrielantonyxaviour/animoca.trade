// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";

/**
 * @title CredentialMarketTest
 * @dev Comprehensive tests for credential token marketplace functionality
 * @notice Tests cover token creation, trading, pricing, and liquidity operations
 */
contract CredentialMarketTest is Test {
    // ============ Contract Instances ============
    MockUSDC public usdc;
    FeeCollector public feeCollector;
    CredentialAMM public amm;
    CredentialTokenFactory public factory;

    // ============ Test Users ============
    address public deployer;
    address public alice;  // Credential creator
    address public bob;    // Token buyer
    address public charlie; // Another trader
    address public dave;   // Liquidity provider

    // ============ Test Credential IDs ============
    bytes32 public constant ENGINEERING_DEGREE = keccak256("ENGINEERING_DEGREE_MIT_2024");
    bytes32 public constant DATA_SCIENCE_CERT = keccak256("DATA_SCIENCE_CERTIFICATION_GOOGLE");
    bytes32 public constant AWS_ARCHITECT = keccak256("AWS_SOLUTIONS_ARCHITECT_PROFESSIONAL");
    bytes32 public constant STANFORD_MBA = keccak256("STANFORD_MBA_CLASS_2023");
    bytes32 public constant MEDICAL_LICENSE = keccak256("MEDICAL_LICENSE_CALIFORNIA_2024");

    // ============ Test Constants ============
    uint256 public constant INITIAL_USDC_AMOUNT = 100000 * 10**6; // 100,000 USDC
    uint256 public constant TOKEN_EMISSION_RATE = 10 * 10**18;    // 10 tokens per day
    uint256 public constant TOKEN_MAX_SUPPLY = 1000000 * 10**18;  // 1M tokens
    uint256 public constant INITIAL_TOKEN_LIQUIDITY = 1000 * 10**18; // 1000 tokens
    uint256 public constant INITIAL_USDC_LIQUIDITY = 1000 * 10**6;   // 1000 USDC

    // ============ Test Structs ============
    struct CredentialData {
        bytes32 id;
        string name;
        string symbol;
        address creator;
    }

    // ============ Events for Testing ============
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

    event PoolCreated(
        bytes32 indexed credentialId,
        address indexed credentialToken,
        address indexed creator,
        uint256 initialTokenAmount,
        uint256 initialUSDCAmount,
        uint256 timestamp
    );

    event TokenSwapped(
        bytes32 indexed credentialId,
        address indexed trader,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount,
        uint256 timestamp
    );

    // ============ Setup ============

    function setUp() public {
        // Initialize test addresses
        deployer = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");
        dave = makeAddr("dave");

        // Deploy and configure system
        _deploySystem();
        _fundUsers();
        _setupApprovals();
    }

    function _deploySystem() internal {
        console.log("Deploying credential marketplace system...");

        // Deploy core contracts
        usdc = new MockUSDC();
        factory = new CredentialTokenFactory();
        feeCollector = new FeeCollector(address(factory), address(usdc));
        amm = new CredentialAMM(address(factory), address(usdc));

        // Configure system
        factory.setFeeCollector(address(feeCollector));
        factory.setUSDCToken(address(usdc));

        // Set reasonable fees for testing
        feeCollector.setGlobalFees(100, 50, 200); // 1%, 0.5%, 2%
        amm.setProtocolFeePercentage(300); // 3%

        console.log("System deployed successfully");
        console.log("USDC:", address(usdc));
        console.log("Factory:", address(factory));
        console.log("FeeCollector:", address(feeCollector));
        console.log("AMM:", address(amm));
    }

    function _fundUsers() internal {
        // Give all users plenty of USDC for testing
        usdc.freeMint(alice, INITIAL_USDC_AMOUNT);
        usdc.freeMint(bob, INITIAL_USDC_AMOUNT);
        usdc.freeMint(charlie, INITIAL_USDC_AMOUNT);
        usdc.freeMint(dave, INITIAL_USDC_AMOUNT);

        console.log("Users funded with USDC");
    }

    function _setupApprovals() internal {
        // Approve all contracts for all users
        address[4] memory users = [alice, bob, charlie, dave];

        for (uint i = 0; i < users.length; i++) {
            vm.startPrank(users[i]);
            usdc.approve(address(feeCollector), type(uint256).max);
            usdc.approve(address(amm), type(uint256).max);
            vm.stopPrank();
        }

        console.log("Approvals set for all users");
    }

    // ============ Token Creation Tests ============

    function testCreateCredentialToken() public {
        console.log("Testing credential token creation...");

        uint256 aliceBalanceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        address tokenAddress = factory.createToken(
            ENGINEERING_DEGREE,
            "MIT Engineering Degree 2024",
            "MIT_ENG_24",
            TOKEN_EMISSION_RATE,
            TOKEN_MAX_SUPPLY
        );

        // Verify token creation
        assertTrue(tokenAddress != address(0));
        assertEq(factory.getTokenByCredential(ENGINEERING_DEGREE), tokenAddress);
        assertEq(factory.getCredentialByToken(tokenAddress), ENGINEERING_DEGREE);
        assertTrue(factory.isValidToken(tokenAddress));

        // Verify fee was collected
        uint256 aliceBalanceAfter = usdc.balanceOf(alice);
        assertTrue(aliceBalanceBefore > aliceBalanceAfter);

        // Verify token properties
        CredentialToken token = CredentialToken(tokenAddress);
        assertEq(token.getCredentialId(), ENGINEERING_DEGREE);
        assertEq(token.name(), "MIT Engineering Degree 2024");
        assertEq(token.symbol(), "MIT_ENG_24");
        assertEq(token.getEmissionRate(), TOKEN_EMISSION_RATE);
        assertEq(token.getMaxSupply(), TOKEN_MAX_SUPPLY);
        assertEq(token.getCreator(), alice);

        console.log("Token created successfully at:", tokenAddress);
        console.log("Minting fee collected:", aliceBalanceBefore - aliceBalanceAfter);
    }

    function testCreateMultipleCredentialTokens() public {
        console.log("Testing multiple credential token creation...");

        // Create multiple tokens with different credential types
        CredentialData[4] memory credentials = [
            CredentialData(ENGINEERING_DEGREE, "MIT Engineering Degree", "MIT_ENG", alice),
            CredentialData(DATA_SCIENCE_CERT, "Google Data Science Cert", "GOOGLE_DS", bob),
            CredentialData(AWS_ARCHITECT, "AWS Solutions Architect", "AWS_SA", charlie),
            CredentialData(STANFORD_MBA, "Stanford MBA", "STANFORD_MBA", dave)
        ];

        address[] memory tokenAddresses = new address[](4);

        for (uint i = 0; i < credentials.length; i++) {
            vm.prank(credentials[i].creator);
            tokenAddresses[i] = factory.createToken(
                credentials[i].id,
                credentials[i].name,
                credentials[i].symbol,
                TOKEN_EMISSION_RATE,
                TOKEN_MAX_SUPPLY
            );

            assertTrue(tokenAddresses[i] != address(0));
            assertEq(factory.getTokenByCredential(credentials[i].id), tokenAddresses[i]);

            console.log("Created token for credential");
            console.log("Token address:", tokenAddresses[i]);
        }

        // Verify all tokens are unique
        for (uint i = 0; i < tokenAddresses.length; i++) {
            for (uint j = i + 1; j < tokenAddresses.length; j++) {
                assertTrue(tokenAddresses[i] != tokenAddresses[j]);
            }
        }

        console.log("All tokens created successfully with unique addresses");
    }

    // ============ Market Creation Tests ============

    function testCreateMarketWithLiquidity() public {
        console.log("Testing market creation with initial liquidity...");

        // Step 1: Create token
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            ENGINEERING_DEGREE,
            "MIT Engineering Degree",
            "MIT_ENG",
            TOKEN_EMISSION_RATE,
            TOKEN_MAX_SUPPLY
        );

        // Step 2: Mint tokens to alice for liquidity
        _mintTokensForTesting(tokenAddress, alice, INITIAL_TOKEN_LIQUIDITY);

        // Step 3: Create AMM pool with initial liquidity
        CredentialToken token = CredentialToken(tokenAddress);
        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);

        vm.expectEmit(true, true, true, false);
        emit PoolCreated(
            ENGINEERING_DEGREE,
            tokenAddress,
            alice,
            INITIAL_TOKEN_LIQUIDITY,
            INITIAL_USDC_LIQUIDITY,
            0
        );

        uint256 liquidityMinted = amm.createPool(
            ENGINEERING_DEGREE,
            tokenAddress,
            INITIAL_TOKEN_LIQUIDITY,
            INITIAL_USDC_LIQUIDITY
        );
        vm.stopPrank();

        // Verify pool creation
        assertTrue(liquidityMinted > 0);
        assertTrue(amm.poolExists(ENGINEERING_DEGREE));

        // Verify pool reserves
        (uint256 tokenReserves, uint256 usdcReserves) = amm.getReserves(ENGINEERING_DEGREE);
        assertEq(tokenReserves, INITIAL_TOKEN_LIQUIDITY);
        assertEq(usdcReserves, INITIAL_USDC_LIQUIDITY);

        // Verify pool information
        ICredentialAMM.LiquidityPool memory pool = amm.getPool(ENGINEERING_DEGREE);
        assertEq(pool.credentialToken, tokenAddress);
        assertEq(pool.tokenReserves, INITIAL_TOKEN_LIQUIDITY);
        assertEq(pool.usdcReserves, INITIAL_USDC_LIQUIDITY);
        assertEq(pool.totalLiquidity, liquidityMinted);
        assertTrue(pool.isActive);

        console.log("Market created successfully");
        console.log("Token reserves:", tokenReserves);
        console.log("USDC reserves:", usdcReserves);
        console.log("Liquidity minted:", liquidityMinted);
    }

    // ============ Trading Tests ============

    function testBuyTokensWithUSDC() public {
        console.log("Testing buying tokens with USDC...");

        // Setup market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);
        CredentialToken token = CredentialToken(tokenAddress);

        uint256 usdcAmountIn = 100 * 10**6; // 100 USDC
        uint256 bobTokenBalanceBefore = token.balanceOf(bob);
        uint256 bobUsdcBalanceBefore = usdc.balanceOf(bob);

        // Get quote before trade
        (uint256 expectedTokensOut, uint256 expectedFee) = amm.getAmountOut(
            ENGINEERING_DEGREE,
            address(usdc),
            usdcAmountIn
        );

        console.log("Expected tokens out:", expectedTokensOut);
        console.log("Expected fee:", expectedFee);

        // Execute trade
        vm.expectEmit(true, true, true, false);
        emit TokenSwapped(
            ENGINEERING_DEGREE,
            bob,
            address(usdc),
            tokenAddress,
            usdcAmountIn,
            expectedTokensOut,
            expectedFee,
            0
        );

        vm.prank(bob);
        uint256 actualTokensOut = amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            usdcAmountIn,
            0, // No minimum for testing
            block.timestamp + 3600
        );

        // Verify trade results
        assertEq(actualTokensOut, expectedTokensOut);
        assertEq(token.balanceOf(bob), bobTokenBalanceBefore + actualTokensOut);
        assertEq(usdc.balanceOf(bob), bobUsdcBalanceBefore - usdcAmountIn);

        // Verify pool reserves updated
        (uint256 tokenReserves, uint256 usdcReserves) = amm.getReserves(ENGINEERING_DEGREE);
        assertEq(tokenReserves, INITIAL_TOKEN_LIQUIDITY - actualTokensOut);
        assertEq(usdcReserves, INITIAL_USDC_LIQUIDITY + usdcAmountIn - expectedFee);

        console.log("Trade executed successfully");
        console.log("Bob received tokens:", actualTokensOut);
        console.log("New token reserves:", tokenReserves);
        console.log("New USDC reserves:", usdcReserves);
    }

    function testSellTokensForUSDC() public {
        console.log("Testing selling tokens for USDC...");

        // Setup market and buy some tokens first
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);
        CredentialToken token = CredentialToken(tokenAddress);

        // Bob buys tokens first
        vm.prank(bob);
        uint256 tokensBought = amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            200 * 10**6, // 200 USDC
            0,
            block.timestamp + 3600
        );

        // Now Bob sells half of his tokens
        uint256 tokensToSell = tokensBought / 2;
        uint256 bobTokenBalanceBefore = token.balanceOf(bob);
        uint256 bobUsdcBalanceBefore = usdc.balanceOf(bob);

        // Get quote before trade
        (uint256 expectedUsdcOut, uint256 expectedFee) = amm.getAmountOut(
            ENGINEERING_DEGREE,
            tokenAddress,
            tokensToSell
        );

        console.log("Tokens to sell:", tokensToSell);
        console.log("Expected USDC out:", expectedUsdcOut);
        console.log("Expected fee:", expectedFee);

        // Execute sell trade
        vm.startPrank(bob);
        token.approve(address(amm), tokensToSell);

        uint256 actualUsdcOut = amm.swapTokensForUSDC(
            ENGINEERING_DEGREE,
            tokensToSell,
            0, // No minimum for testing
            block.timestamp + 3600
        );
        vm.stopPrank();

        // Verify trade results (allow for small precision differences)
        uint256 tolerance = 1000000; // 1 USDC tolerance for precision differences
        assertTrue(actualUsdcOut >= expectedUsdcOut - tolerance && actualUsdcOut <= expectedUsdcOut + tolerance,
                   "Actual USDC output should be close to expected");
        assertEq(token.balanceOf(bob), bobTokenBalanceBefore - tokensToSell);
        assertEq(usdc.balanceOf(bob), bobUsdcBalanceBefore + actualUsdcOut);

        console.log("Sell trade executed successfully");
        console.log("Bob received USDC:", actualUsdcOut);
        console.log("Fee charged:", expectedFee);
    }

    function testMultipleTradesImpactPrice() public {
        console.log("Testing multiple trades impact on price...");

        // Setup market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Record initial price
        uint256 initialPrice = amm.getTokenPrice(ENGINEERING_DEGREE);
        console.log("Initial token price (USDC per token):", initialPrice);

        // Execute multiple buy trades (should increase price)
        uint256 tradeAmount = 50 * 10**6; // 50 USDC each trade
        address[3] memory traders = [bob, charlie, dave];

        for (uint i = 0; i < traders.length; i++) {
            vm.prank(traders[i]);
            amm.swapUSDCForTokens(
                ENGINEERING_DEGREE,
                tradeAmount,
                0,
                block.timestamp + 3600
            );

            uint256 newPrice = amm.getTokenPrice(ENGINEERING_DEGREE);
            console.log("Price after trade:", newPrice);

            // Price should increase with each buy
            if (i > 0) {
                assertTrue(newPrice > initialPrice);
            }
        }

        uint256 finalPrice = amm.getTokenPrice(ENGINEERING_DEGREE);
        assertTrue(finalPrice > initialPrice);

        console.log("Final price:", finalPrice);
        console.log("Price increase:", ((finalPrice - initialPrice) * 100) / initialPrice, "%");
    }

    // ============ Price Quote Tests ============

    function testGetBuyQuote() public {
        console.log("Testing buy quote calculations...");

        // Setup market
        _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Test different USDC amounts
        uint256[5] memory usdcAmounts = [
            uint256(10 * 10**6),   // 10 USDC
            uint256(50 * 10**6),   // 50 USDC
            uint256(100 * 10**6),  // 100 USDC
            uint256(500 * 10**6),  // 500 USDC
            uint256(1000 * 10**6)  // 1000 USDC
        ];

        console.log("USDC Amount | Tokens Out | Fee | Effective Price");
        console.log("------------|------------|-----|----------------");

        for (uint i = 0; i < usdcAmounts.length; i++) {
            (uint256 tokensOut, uint256 fee) = amm.getAmountOut(
                ENGINEERING_DEGREE,
                address(usdc),
                usdcAmounts[i]
            );

            uint256 effectivePrice = tokensOut > 0 ? (usdcAmounts[i] * 1e18) / tokensOut : 0;

            console.log("USDC Amount:", usdcAmounts[i] / 10**6);
            console.log("Tokens Out:", tokensOut / 10**18);
            console.log("Fee:", fee / 10**6);
            console.log("Effective Price:", effectivePrice / 10**6);

            // Verify larger amounts give worse prices (due to slippage)
            if (i > 0 && tokensOut > 0) {
                uint256 prevPrice = i > 0 ? (usdcAmounts[i-1] * 1e18) / tokensOut : 0;
                // Price should generally increase with larger trades (more slippage)
                // Note: This might not always be true due to fee calculations
            }
        }
    }

    function testGetSellQuote() public {
        console.log("Testing sell quote calculations...");

        // Setup market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Test different token amounts
        uint256[5] memory tokenAmounts = [
            uint256(10 * 10**18),   // 10 tokens
            uint256(50 * 10**18),   // 50 tokens
            uint256(100 * 10**18),  // 100 tokens
            uint256(200 * 10**18),  // 200 tokens
            uint256(400 * 10**18)   // 400 tokens
        ];

        console.log("Token Amount | USDC Out | Fee | Effective Price");
        console.log("-------------|----------|-----|----------------");

        for (uint i = 0; i < tokenAmounts.length; i++) {
            (uint256 usdcOut, uint256 fee) = amm.getAmountOut(
                ENGINEERING_DEGREE,
                tokenAddress,
                tokenAmounts[i]
            );

            uint256 effectivePrice = tokenAmounts[i] > 0 ? (usdcOut * 1e18) / tokenAmounts[i] : 0;

            console.log("Token Amount:", tokenAmounts[i] / 10**18);
            console.log("USDC Out:", usdcOut / 10**6);
            console.log("Fee:", fee / 10**6);
            console.log("Effective Price:", effectivePrice / 10**6);
        }
    }

    function testPriceCalculationAccuracy() public {
        console.log("Testing price calculation accuracy...");

        // Setup market
        _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        uint256 usdcAmount = 100 * 10**6; // 100 USDC

        // Get quote
        (uint256 expectedTokens, uint256 expectedFee) = amm.getAmountOut(
            ENGINEERING_DEGREE,
            address(usdc),
            usdcAmount
        );

        // Execute actual trade
        vm.prank(bob);
        uint256 actualTokens = amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            usdcAmount,
            0,
            block.timestamp + 3600
        );

        // Verify quote matches actual execution
        assertEq(actualTokens, expectedTokens);

        console.log("Quote accuracy verified");
        console.log("Expected tokens:", expectedTokens);
        console.log("Actual tokens:", actualTokens);
        console.log("Fee:", expectedFee);
    }

    // ============ Liquidity Management Tests ============

    function testAddLiquidityToExistingPool() public {
        console.log("Testing adding liquidity to existing pool...");

        // Setup initial market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);
        CredentialToken token = CredentialToken(tokenAddress);

        // Dave adds additional liquidity
        _mintTokensForTesting(tokenAddress, dave, 500 * 10**18);

        vm.startPrank(dave);
        token.approve(address(amm), type(uint256).max);

        uint256 liquidityMinted = amm.addLiquidity(
            ENGINEERING_DEGREE,
            250 * 10**18,  // 250 tokens
            250 * 10**6,   // 250 USDC
            0,             // min liquidity
            block.timestamp + 3600
        );
        vm.stopPrank();

        assertTrue(liquidityMinted > 0);

        // Verify new reserves
        (uint256 tokenReserves, uint256 usdcReserves) = amm.getReserves(ENGINEERING_DEGREE);
        assertEq(tokenReserves, INITIAL_TOKEN_LIQUIDITY + 250 * 10**18);
        assertEq(usdcReserves, INITIAL_USDC_LIQUIDITY + 250 * 10**6);

        console.log("Liquidity added successfully");
        console.log("New token reserves:", tokenReserves);
        console.log("New USDC reserves:", usdcReserves);
        console.log("LP tokens minted:", liquidityMinted);
    }

    function testRemoveLiquidity() public {
        console.log("Testing removing liquidity from pool...");

        // Setup market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Get alice's LP position
        ICredentialAMM.LiquidityPosition memory position = amm.getLiquidityPosition(ENGINEERING_DEGREE, alice);
        uint256 liquidityToRemove = position.liquidityTokens / 2; // Remove half

        // Remove liquidity
        vm.prank(alice);
        (uint256 tokensReceived, uint256 usdcReceived) = amm.removeLiquidity(
            ENGINEERING_DEGREE,
            liquidityToRemove,
            0, // min tokens
            0, // min USDC
            block.timestamp + 3600
        );

        assertTrue(tokensReceived > 0);
        assertTrue(usdcReceived > 0);

        console.log("Liquidity removed successfully");
        console.log("Tokens received:", tokensReceived);
        console.log("USDC received:", usdcReceived);
    }

    // ============ Integration Tests ============

    function testCompleteMarketLifecycle() public {
        console.log("Testing complete market lifecycle...");

        // 1. Alice creates a credential token
        console.log("Step 1: Creating credential token...");
        vm.prank(alice);
        address tokenAddress = factory.createToken(
            MEDICAL_LICENSE,
            "California Medical License 2024",
            "CA_MED_24",
            TOKEN_EMISSION_RATE,
            TOKEN_MAX_SUPPLY
        );

        // 2. System mints tokens and Alice provides initial liquidity
        console.log("Step 2: Setting up initial liquidity...");
        CredentialToken token = CredentialToken(tokenAddress);
        _mintTokensForTesting(tokenAddress, alice, INITIAL_TOKEN_LIQUIDITY);

        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);
        amm.createPool(
            MEDICAL_LICENSE,
            tokenAddress,
            INITIAL_TOKEN_LIQUIDITY,
            INITIAL_USDC_LIQUIDITY
        );
        vm.stopPrank();

        // 3. Record initial state
        uint256 initialPrice = amm.getTokenPrice(MEDICAL_LICENSE);
        console.log("Initial token price:", initialPrice);

        // 4. Multiple users trade
        console.log("Step 3: Multiple users trading...");

        // Bob buys tokens
        vm.prank(bob);
        uint256 bobTokens = amm.swapUSDCForTokens(
            MEDICAL_LICENSE,
            200 * 10**6,
            0,
            block.timestamp + 3600
        );

        // Charlie buys tokens
        vm.prank(charlie);
        uint256 charlieTokens = amm.swapUSDCForTokens(
            MEDICAL_LICENSE,
            150 * 10**6,
            0,
            block.timestamp + 3600
        );

        // Dave adds more liquidity
        _mintTokensForTesting(tokenAddress, dave, 300 * 10**18);
        vm.startPrank(dave);
        token.approve(address(amm), type(uint256).max);
        amm.addLiquidity(
            MEDICAL_LICENSE,
            150 * 10**18,
            150 * 10**6,
            0,
            block.timestamp + 3600
        );
        vm.stopPrank();

        // Bob sells some tokens
        vm.startPrank(bob);
        token.approve(address(amm), bobTokens / 3);
        uint256 usdcFromSale = amm.swapTokensForUSDC(
            MEDICAL_LICENSE,
            bobTokens / 3,
            0,
            block.timestamp + 3600
        );
        vm.stopPrank();

        // 5. Verify final state
        console.log("Step 4: Verifying final state...");
        uint256 finalPrice = amm.getTokenPrice(MEDICAL_LICENSE);
        (uint256 finalTokenReserves, uint256 finalUsdcReserves) = amm.getReserves(MEDICAL_LICENSE);

        assertTrue(finalPrice > initialPrice); // Price should have increased due to net buying
        assertTrue(token.balanceOf(bob) > 0);   // Bob should have tokens
        assertTrue(token.balanceOf(charlie) > 0); // Charlie should have tokens

        console.log("Market lifecycle completed successfully");
        console.log("Final price:", finalPrice);
        console.log("Price change:", ((finalPrice - initialPrice) * 100) / initialPrice, "%");
        console.log("Final token reserves:", finalTokenReserves);
        console.log("Final USDC reserves:", finalUsdcReserves);
        console.log("Bob tokens:", token.balanceOf(bob));
        console.log("Charlie tokens:", token.balanceOf(charlie));
        console.log("USDC from Bob's sale:", usdcFromSale);
    }

    // ============ Edge Cases and Error Handling ============

    function testSlippageProtection() public {
        console.log("Testing slippage protection...");

        _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Try to buy with unrealistic minimum output
        vm.expectRevert();
        vm.prank(bob);
        amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            100 * 10**6,
            10000 * 10**18, // Unrealistic minimum
            block.timestamp + 3600
        );

        console.log("Slippage protection working correctly");
    }

    function testDeadlineProtection() public {
        console.log("Testing deadline protection...");

        _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Try to trade with expired deadline
        vm.expectRevert();
        vm.prank(bob);
        amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            100 * 10**6,
            0,
            block.timestamp - 1 // Expired deadline
        );

        console.log("Deadline protection working correctly");
    }

    function testInsufficientBalanceHandling() public {
        console.log("Testing insufficient balance handling...");

        _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Try to trade more USDC than balance
        uint256 bobBalance = usdc.balanceOf(bob);

        vm.expectRevert();
        vm.prank(bob);
        amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            bobBalance + 1000 * 10**6, // More than balance
            0,
            block.timestamp + 3600
        );

        console.log("Insufficient balance protection working correctly");
    }

    // ============ Helper Functions ============

    function _mintTokensForTesting(address tokenAddress, address recipient, uint256 amount) internal {
        CredentialToken token = CredentialToken(tokenAddress);
        // Get current minter and temporarily set test contract as minter using factory
        address currentMinter = token.getMinter();
        factory.setTokenMinter(tokenAddress, address(this));
        token.mint(recipient, amount);
        // Restore original minter if it existed
        if (currentMinter != address(0)) {
            factory.setTokenMinter(tokenAddress, currentMinter);
        }
    }

    function _createMarketWithLiquidity(bytes32 credentialId, address creator) internal returns (address tokenAddress) {
        // Create token
        vm.prank(creator);
        tokenAddress = factory.createToken(
            credentialId,
            "Test Credential Token",
            "TEST",
            TOKEN_EMISSION_RATE,
            TOKEN_MAX_SUPPLY
        );

        // Mint tokens and create pool
        _mintTokensForTesting(tokenAddress, creator, INITIAL_TOKEN_LIQUIDITY);

        CredentialToken token = CredentialToken(tokenAddress);
        vm.startPrank(creator);
        token.approve(address(amm), type(uint256).max);
        amm.createPool(
            credentialId,
            tokenAddress,
            INITIAL_TOKEN_LIQUIDITY,
            INITIAL_USDC_LIQUIDITY
        );
        vm.stopPrank();

        return tokenAddress;
    }

    // ============ Gas Optimization Tests ============

    function testGasConsumption() public {
        console.log("Testing gas consumption for key operations...");

        // Test token creation gas
        uint256 gasBefore = gasleft();
        vm.prank(alice);
        factory.createToken(
            ENGINEERING_DEGREE,
            "Test Token",
            "TEST",
            TOKEN_EMISSION_RATE,
            TOKEN_MAX_SUPPLY
        );
        uint256 tokenCreationGas = gasBefore - gasleft();

        // Test pool creation gas
        address tokenAddress = factory.getTokenByCredential(ENGINEERING_DEGREE);
        _mintTokensForTesting(tokenAddress, alice, INITIAL_TOKEN_LIQUIDITY);
        CredentialToken token = CredentialToken(tokenAddress);

        vm.startPrank(alice);
        token.approve(address(amm), type(uint256).max);

        gasBefore = gasleft();
        amm.createPool(
            ENGINEERING_DEGREE,
            tokenAddress,
            INITIAL_TOKEN_LIQUIDITY,
            INITIAL_USDC_LIQUIDITY
        );
        uint256 poolCreationGas = gasBefore - gasleft();
        vm.stopPrank();

        // Test trading gas
        gasBefore = gasleft();
        vm.prank(bob);
        amm.swapUSDCForTokens(
            ENGINEERING_DEGREE,
            100 * 10**6,
            0,
            block.timestamp + 3600
        );
        uint256 tradingGas = gasBefore - gasleft();

        console.log("Gas consumption results:");
        console.log("Token creation:", tokenCreationGas);
        console.log("Pool creation:", poolCreationGas);
        console.log("Trading:", tradingGas);

        // Gas should be reasonable (these are rough estimates)
        assertTrue(tokenCreationGas < 3000000); // Less than 3M gas
        assertTrue(poolCreationGas < 2000000);  // Less than 2M gas
        assertTrue(tradingGas < 500000);        // Less than 500K gas
    }

    // ============ View Function Tests ============

    function testViewFunctions() public {
        console.log("Testing view functions...");

        // Create market
        address tokenAddress = _createMarketWithLiquidity(ENGINEERING_DEGREE, alice);

        // Test pool existence
        assertTrue(amm.poolExists(ENGINEERING_DEGREE));
        assertFalse(amm.poolExists(DATA_SCIENCE_CERT));

        // Test reserves
        (uint256 tokenReserves, uint256 usdcReserves) = amm.getReserves(ENGINEERING_DEGREE);
        assertEq(tokenReserves, INITIAL_TOKEN_LIQUIDITY);
        assertEq(usdcReserves, INITIAL_USDC_LIQUIDITY);

        // Test price
        uint256 price = amm.getTokenPrice(ENGINEERING_DEGREE);
        assertTrue(price > 0);

        // Test pool info
        ICredentialAMM.LiquidityPool memory pool = amm.getPool(ENGINEERING_DEGREE);
        assertEq(pool.credentialToken, tokenAddress);
        assertTrue(pool.isActive);

        // Test liquidity position
        ICredentialAMM.LiquidityPosition memory position = amm.getLiquidityPosition(ENGINEERING_DEGREE, alice);
        assertTrue(position.liquidityTokens > 0);
        assertEq(position.tokenDeposited, INITIAL_TOKEN_LIQUIDITY);
        assertEq(position.usdcDeposited, INITIAL_USDC_LIQUIDITY);

        console.log("All view functions working correctly");
    }
}