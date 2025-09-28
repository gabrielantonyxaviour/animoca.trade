// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/pools/PoolFactory.sol";
import "../src/pools/CredentialPool.sol";
import "../src/CredentialToken.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/interfaces/ICredentialPool.sol";
import "../src/interfaces/ICredentialToken.sol";

contract PoolTests is Test {
    PoolFactory public poolFactory;
    CredentialTokenFactory public tokenFactory;
    CredentialToken public testToken;
    CredentialPool public testPool;

    address public constant PROTOCOL_FEE_RECIPIENT = address(0x1234);
    address public constant ALICE = address(0xA11CE);
    address public constant BOB = address(0xB0B);
    address public constant CHARLIE = address(0xC4A71E);

    bytes32 public constant TEST_CREDENTIAL_ID = keccak256("TEST_CREDENTIAL_001");
    uint256 public constant INITIAL_TOKEN_AMOUNT = 2000 * 1e18;
    uint256 public constant INITIAL_ETH_AMOUNT = 1 ether;
    uint256 public constant EMISSION_RATE = 10 * 1e18; // 10 tokens per day
    uint256 public constant MAX_SUPPLY = 1000000 * 1e18;

    event PoolCreated(
        address indexed token,
        address indexed pool,
        address indexed creator,
        uint256 initialTokenLiquidity,
        uint256 initialEthLiquidity,
        uint256 timestamp
    );

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to,
        uint256 timestamp
    );

    event Mint(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        uint256 timestamp
    );

    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity,
        address indexed to,
        uint256 timestamp
    );

    function setUp() public {
        // Deploy factories
        poolFactory = new PoolFactory(PROTOCOL_FEE_RECIPIENT);
        tokenFactory = new CredentialTokenFactory();

        // Fund test accounts
        vm.deal(ALICE, 100 ether);
        vm.deal(BOB, 100 ether);
        vm.deal(CHARLIE, 100 ether);

        // Create test token
        vm.startPrank(ALICE);
        address tokenAddress = tokenFactory.createToken(
            TEST_CREDENTIAL_ID,
            "Test Credential Token",
            "TCT",
            EMISSION_RATE,
            MAX_SUPPLY
        );
        testToken = CredentialToken(tokenAddress);

        // Mint initial tokens to ALICE for testing
        vm.stopPrank();
        vm.prank(address(tokenFactory));
        testToken.setMinter(address(this));
        testToken.mint(ALICE, INITIAL_TOKEN_AMOUNT * 10);
    }

    // ============ Pool Creation Tests ============

    function testCreatePool() public {
        vm.startPrank(ALICE);

        // Approve tokens for pool creation
        testToken.approve(address(poolFactory), INITIAL_TOKEN_AMOUNT);

        // Create pool
        vm.expectEmit(true, false, true, true);
        emit PoolCreated(
            address(testToken),
            address(0), // We don't know the pool address yet
            ALICE,
            INITIAL_TOKEN_AMOUNT,
            INITIAL_ETH_AMOUNT,
            block.timestamp
        );

        address poolAddress = poolFactory.createPool{value: INITIAL_ETH_AMOUNT}(
            address(testToken),
            INITIAL_TOKEN_AMOUNT
        );

        vm.stopPrank();

        // Verify pool creation
        assertEq(poolFactory.getPool(address(testToken)), poolAddress);
        assertTrue(poolFactory.isPool(poolAddress));
        assertEq(poolFactory.getPoolCount(), 1);

        // Verify pool info
        PoolFactory.PoolInfo memory info = poolFactory.getPoolInfo(poolAddress);
        assertEq(info.token, address(testToken));
        assertEq(info.creator, ALICE);
        assertEq(info.initialTokenLiquidity, INITIAL_TOKEN_AMOUNT);
        assertEq(info.initialEthLiquidity, INITIAL_ETH_AMOUNT);

        // Verify LP tokens minted to creator
        testPool = CredentialPool(payable(poolAddress));
        assertGt(testPool.balanceOf(ALICE), 0);
    }

    function testCannotCreateDuplicatePool() public {
        // Create first pool
        vm.startPrank(ALICE);
        testToken.approve(address(poolFactory), INITIAL_TOKEN_AMOUNT * 2);
        poolFactory.createPool{value: INITIAL_ETH_AMOUNT}(
            address(testToken),
            INITIAL_TOKEN_AMOUNT
        );

        // Try to create duplicate pool
        vm.expectRevert(
            abi.encodeWithSelector(
                PoolFactory.PoolAlreadyExists.selector,
                address(testToken)
            )
        );
        poolFactory.createPool{value: INITIAL_ETH_AMOUNT}(
            address(testToken),
            INITIAL_TOKEN_AMOUNT
        );
        vm.stopPrank();
    }

    function testMinimumLiquidityRequirements() public {
        vm.startPrank(ALICE);

        // Test insufficient token amount
        testToken.approve(address(poolFactory), 999 * 1e18);
        vm.expectRevert(
            abi.encodeWithSelector(
                PoolFactory.InsufficientInitialLiquidity.selector,
                999 * 1e18,
                INITIAL_ETH_AMOUNT
            )
        );
        poolFactory.createPool{value: INITIAL_ETH_AMOUNT}(
            address(testToken),
            999 * 1e18
        );

        // Test insufficient ETH amount
        testToken.approve(address(poolFactory), INITIAL_TOKEN_AMOUNT);
        vm.expectRevert(
            abi.encodeWithSelector(
                PoolFactory.InsufficientInitialLiquidity.selector,
                INITIAL_TOKEN_AMOUNT,
                0.04 ether
            )
        );
        poolFactory.createPool{value: 0.04 ether}(
            address(testToken),
            INITIAL_TOKEN_AMOUNT
        );

        vm.stopPrank();
    }

    // ============ Trading Tests ============

    function testSwapTokenForETH() public {
        // Setup pool
        _createTestPool();

        vm.startPrank(BOB);

        // BOB gets some tokens
        vm.stopPrank();
        testToken.mint(BOB, 100 * 1e18);
        vm.startPrank(BOB);

        // Approve and transfer tokens to pool
        uint256 tokenAmountIn = 10 * 1e18;
        testToken.approve(address(testPool), tokenAmountIn);
        testToken.transfer(address(testPool), tokenAmountIn);

        // Calculate expected ETH out
        uint256 expectedEthOut = testPool.getAmountOut(tokenAmountIn, address(testToken));
        uint256 bobEthBefore = BOB.balance;

        // Perform swap
        vm.expectEmit(true, false, false, false);
        emit Swap(BOB, tokenAmountIn, 0, 0, expectedEthOut, BOB, block.timestamp);

        testPool.swap(0, expectedEthOut, BOB, "");

        // Verify balances
        assertEq(BOB.balance - bobEthBefore, expectedEthOut, "ETH out mismatch");

        vm.stopPrank();
    }

    function testSwapETHForToken() public {
        // Setup pool
        _createTestPool();

        vm.startPrank(BOB);

        // Send ETH to pool
        uint256 ethAmountIn = 0.1 ether;
        (bool sent,) = address(testPool).call{value: ethAmountIn}("");
        assertTrue(sent);

        // Calculate expected tokens out
        uint256 expectedTokensOut = testPool.getAmountOut(ethAmountIn, address(0));
        uint256 bobTokensBefore = testToken.balanceOf(BOB);

        // Perform swap
        testPool.swap(expectedTokensOut, 0, BOB, "");

        // Verify balances
        assertEq(
            testToken.balanceOf(BOB) - bobTokensBefore,
            expectedTokensOut,
            "Tokens out mismatch"
        );

        vm.stopPrank();
    }

    function testSlippageProtection() public {
        _createTestPool();

        vm.startPrank(BOB);

        // BOB gets some tokens
        vm.stopPrank();
        testToken.mint(BOB, 100 * 1e18);
        vm.startPrank(BOB);

        // Transfer tokens to pool
        uint256 tokenAmountIn = 10 * 1e18;
        testToken.transfer(address(testPool), tokenAmountIn);

        // Try to get more ETH than possible (slippage protection)
        uint256 expectedEthOut = testPool.getAmountOut(tokenAmountIn, address(testToken));

        vm.expectRevert("K_INVARIANT_FAILED");
        testPool.swap(0, expectedEthOut * 2, BOB, ""); // Request 2x the fair amount

        vm.stopPrank();
    }

    // ============ Liquidity Tests ============

    function testAddLiquidity() public {
        // Create pool first
        _createTestPool();

        // BOB adds liquidity
        vm.startPrank(BOB);

        // Get tokens
        vm.stopPrank();
        testToken.mint(BOB, 500 * 1e18);
        vm.startPrank(BOB);

        // Calculate amounts to add
        uint256 tokenAmount = 100 * 1e18;
        uint256 ethAmount = 0.05 ether; // Proportional to pool ratio

        // Transfer assets to pool
        testToken.transfer(address(testPool), tokenAmount);
        (bool sent,) = address(testPool).call{value: ethAmount}("");
        assertTrue(sent);

        // Add liquidity
        uint256 lpBalanceBefore = testPool.balanceOf(BOB);

        vm.expectEmit(true, false, false, false);
        emit Mint(BOB, tokenAmount, ethAmount, 0, block.timestamp);

        uint256 liquidity = testPool.mint(BOB);

        // Verify LP tokens received
        assertGt(liquidity, 0, "No liquidity minted");
        assertEq(testPool.balanceOf(BOB) - lpBalanceBefore, liquidity);

        vm.stopPrank();
    }

    function testRemoveLiquidity() public {
        // Create pool and add liquidity
        _createTestPool();
        _addLiquidityAs(BOB, 100 * 1e18, 0.05 ether);

        vm.startPrank(BOB);

        // Get LP balance
        uint256 lpBalance = testPool.balanceOf(BOB);
        uint256 bobTokensBefore = testToken.balanceOf(BOB);
        uint256 bobEthBefore = BOB.balance;

        // Transfer LP tokens to pool
        testPool.transfer(address(testPool), lpBalance);

        // Remove liquidity
        vm.expectEmit(true, false, false, false);
        emit Burn(BOB, 0, 0, lpBalance, BOB, block.timestamp);

        (uint256 tokenAmount, uint256 ethAmount) = testPool.burn(BOB);

        // Verify assets received
        assertGt(tokenAmount, 0, "No tokens returned");
        assertGt(ethAmount, 0, "No ETH returned");
        assertEq(testToken.balanceOf(BOB) - bobTokensBefore, tokenAmount);
        assertEq(BOB.balance - bobEthBefore, ethAmount);
        assertEq(testPool.balanceOf(BOB), 0, "LP tokens not burned");

        vm.stopPrank();
    }

    function testLiquidityLockPeriod() public {
        // Create pool (ALICE is creator with initial liquidity)
        _createTestPool();

        // Check lock status
        assertTrue(poolFactory.isLiquidityLocked(address(testPool)));

        // Fast forward 29 days (still locked)
        vm.warp(block.timestamp + 29 days);
        assertTrue(poolFactory.isLiquidityLocked(address(testPool)));

        // Fast forward to 31 days (unlocked)
        vm.warp(block.timestamp + 2 days);
        assertFalse(poolFactory.isLiquidityLocked(address(testPool)));
    }

    // ============ Fee Tests ============

    function testTradingFees() public {
        _createTestPool();

        // Track fees
        uint256 totalFeesBefore = testPool.getTotalFees();
        uint256 protocolFeesBefore = testPool.getProtocolFees();

        // Perform a swap
        vm.startPrank(BOB);
        vm.stopPrank();
        testToken.mint(BOB, 100 * 1e18);
        vm.startPrank(BOB);

        uint256 tokenAmountIn = 10 * 1e18;
        testToken.transfer(address(testPool), tokenAmountIn);
        uint256 expectedEthOut = testPool.getAmountOut(tokenAmountIn, address(testToken));
        testPool.swap(0, expectedEthOut, BOB, "");
        vm.stopPrank();

        // Check fees collected
        uint256 expectedTotalFee = tokenAmountIn * 3 / 1000; // 0.3%
        uint256 expectedProtocolFee = expectedTotalFee / 6; // 1/6 of total

        assertGt(testPool.getTotalFees(), totalFeesBefore, "No fees collected");
        assertGt(testPool.getProtocolFees(), protocolFeesBefore, "No protocol fees collected");
    }

    // ============ TWAP Tests ============

    function testPriceAccumulatorUpdate() public {
        _createTestPool();

        // Get initial cumulative prices
        uint256 price0CumBefore = testPool.price0CumulativeLast();
        uint256 price1CumBefore = testPool.price1CumulativeLast();

        // Fast forward time
        vm.warp(block.timestamp + 1 hours);

        // Perform a small swap to trigger update
        vm.startPrank(BOB);
        (bool sent,) = address(testPool).call{value: 0.001 ether}("");
        assertTrue(sent);
        uint256 tokensOut = testPool.getAmountOut(0.001 ether, address(0));
        testPool.swap(tokensOut, 0, BOB, "");
        vm.stopPrank();

        // Check cumulative prices updated
        assertGt(testPool.price0CumulativeLast(), price0CumBefore, "Price0 accumulator not updated");
        assertGt(testPool.price1CumulativeLast(), price1CumBefore, "Price1 accumulator not updated");
    }

    // ============ Edge Cases ============

    function testCannotSwapToPoolOrToken() public {
        _createTestPool();

        vm.startPrank(BOB);
        (bool sent,) = address(testPool).call{value: 0.1 ether}("");
        assertTrue(sent);

        // Cannot swap to pool itself
        vm.expectRevert("INVALID_TO");
        testPool.swap(100, 0, address(testPool), "");

        // Cannot swap to token
        vm.expectRevert("INVALID_TO");
        testPool.swap(100, 0, address(testToken), "");

        vm.stopPrank();
    }

    function testInsufficientLiquiditySwap() public {
        _createTestPool();

        vm.startPrank(BOB);

        // Try to swap more than pool has
        (uint256 reserve0, uint256 reserve1,) = testPool.getReserves();

        vm.expectRevert("INSUFFICIENT_LIQUIDITY");
        testPool.swap(reserve0 + 1, 0, BOB, "");

        vm.stopPrank();
    }

    function testZeroAmountSwap() public {
        _createTestPool();

        vm.startPrank(BOB);

        vm.expectRevert("INSUFFICIENT_OUTPUT_AMOUNT");
        testPool.swap(0, 0, BOB, "");

        vm.stopPrank();
    }

    // ============ Helper Functions ============

    function _createTestPool() private {
        vm.startPrank(ALICE);
        testToken.approve(address(poolFactory), INITIAL_TOKEN_AMOUNT);
        address poolAddress = poolFactory.createPool{value: INITIAL_ETH_AMOUNT}(
            address(testToken),
            INITIAL_TOKEN_AMOUNT
        );
        testPool = CredentialPool(payable(poolAddress));
        vm.stopPrank();
    }

    function _addLiquidityAs(address user, uint256 tokenAmount, uint256 ethAmount) private {
        vm.startPrank(user);

        // Get tokens if needed
        if (testToken.balanceOf(user) < tokenAmount) {
            vm.stopPrank();
            testToken.mint(user, tokenAmount);
            vm.startPrank(user);
        }

        // Transfer assets to pool
        testToken.transfer(address(testPool), tokenAmount);
        (bool sent,) = address(testPool).call{value: ethAmount}("");
        assertTrue(sent);

        // Mint LP tokens
        testPool.mint(user);

        vm.stopPrank();
    }

    // ============ Gas Tests ============

    function testGasSwapToken() public {
        _createTestPool();

        vm.startPrank(BOB);
        vm.stopPrank();
        testToken.mint(BOB, 100 * 1e18);
        vm.startPrank(BOB);

        testToken.transfer(address(testPool), 1 * 1e18);

        uint256 gasBefore = gasleft();
        testPool.swap(0, testPool.getAmountOut(1 * 1e18, address(testToken)), BOB, "");
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for token swap:", gasUsed);
        assertTrue(gasUsed < 150000, "Swap uses too much gas");

        vm.stopPrank();
    }

    function testGasAddLiquidity() public {
        _createTestPool();

        vm.startPrank(BOB);
        vm.stopPrank();
        testToken.mint(BOB, 100 * 1e18);
        vm.startPrank(BOB);

        testToken.transfer(address(testPool), 10 * 1e18);
        (bool sent,) = address(testPool).call{value: 0.005 ether}("");
        assertTrue(sent);

        uint256 gasBefore = gasleft();
        testPool.mint(BOB);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for adding liquidity:", gasUsed);
        assertTrue(gasUsed < 200000, "Add liquidity uses too much gas");

        vm.stopPrank();
    }

    // ============ Admin Function Tests ============

    function testSetProtocolFeeRecipient() public {
        address newRecipient = address(0x9999);

        vm.prank(poolFactory.owner());
        poolFactory.setProtocolFeeRecipient(newRecipient);

        assertEq(poolFactory.protocolFeeRecipient(), newRecipient);
    }

    function testOnlyOwnerCanSetProtocolFeeRecipient() public {
        vm.prank(BOB);
        vm.expectRevert();
        poolFactory.setProtocolFeeRecipient(address(0x9999));
    }

    function testSetPoolCreationFee() public {
        uint256 newFee = 0.01 ether;

        vm.prank(poolFactory.owner());
        poolFactory.setPoolCreationFee(newFee);

        assertEq(poolFactory.poolCreationFee(), newFee);
    }

    function testPoolCreationWithFee() public {
        // Set creation fee
        uint256 creationFee = 0.01 ether;
        vm.prank(poolFactory.owner());
        poolFactory.setPoolCreationFee(creationFee);

        // Create pool with fee
        vm.startPrank(CHARLIE);

        // Create a new token for Charlie
        address charlieToken = tokenFactory.createToken(
            keccak256("CHARLIE_CRED"),
            "Charlie Token",
            "CTK",
            EMISSION_RATE,
            MAX_SUPPLY
        );

        vm.stopPrank();
        vm.prank(address(tokenFactory));
        CredentialToken(charlieToken).setMinter(address(this));
        CredentialToken(charlieToken).mint(CHARLIE, INITIAL_TOKEN_AMOUNT);
        vm.startPrank(CHARLIE);

        CredentialToken(charlieToken).approve(address(poolFactory), INITIAL_TOKEN_AMOUNT);

        uint256 protocolBalanceBefore = PROTOCOL_FEE_RECIPIENT.balance;

        // Create pool (need to send creation fee + liquidity)
        poolFactory.createPool{value: INITIAL_ETH_AMOUNT + creationFee}(
            charlieToken,
            INITIAL_TOKEN_AMOUNT
        );

        // Verify fee was collected
        assertEq(
            PROTOCOL_FEE_RECIPIENT.balance - protocolBalanceBefore,
            creationFee,
            "Creation fee not collected"
        );

        vm.stopPrank();
    }

    // ============ Integration Tests ============

    function testFullTradingCycle() public {
        _createTestPool();

        // 1. BOB adds liquidity
        _addLiquidityAs(BOB, 200 * 1e18, 0.1 ether);

        // 2. CHARLIE swaps ETH for tokens
        vm.startPrank(CHARLIE);
        uint256 charlieTokensBefore = testToken.balanceOf(CHARLIE);
        (bool sent,) = address(testPool).call{value: 0.05 ether}("");
        assertTrue(sent);
        uint256 tokensOut = testPool.getAmountOut(0.05 ether, address(0));
        testPool.swap(tokensOut, 0, CHARLIE, "");
        assertGt(testToken.balanceOf(CHARLIE), charlieTokensBefore);
        vm.stopPrank();

        // 3. ALICE swaps tokens for ETH
        vm.startPrank(ALICE);
        uint256 aliceEthBefore = ALICE.balance;
        testToken.transfer(address(testPool), 50 * 1e18);
        uint256 ethOut = testPool.getAmountOut(50 * 1e18, address(testToken));
        testPool.swap(0, ethOut, ALICE, "");
        assertGt(ALICE.balance, aliceEthBefore);
        vm.stopPrank();

        // 4. BOB removes half liquidity
        vm.startPrank(BOB);
        uint256 lpBalance = testPool.balanceOf(BOB);
        testPool.transfer(address(testPool), lpBalance / 2);
        testPool.burn(BOB);
        assertEq(testPool.balanceOf(BOB), lpBalance / 2);
        vm.stopPrank();

        // 5. Verify pool still functional
        (uint256 reserve0, uint256 reserve1,) = testPool.getReserves();
        assertGt(reserve0, 0);
        assertGt(reserve1, 0);
    }
}