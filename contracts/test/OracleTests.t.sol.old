// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/oracle/ReputationOracle.sol";
import "../src/pools/CredentialPool.sol";
import "../src/CredentialToken.sol";

contract OracleTests is Test {
    ReputationOracle public oracle;
    CredentialToken public token;
    address public owner = address(1);
    address public updater = address(2);
    address public user = address(3);

    bytes32 public constant CREDENTIAL_ID = keccak256("TEST_CREDENTIAL");

    function setUp() public {
        vm.startPrank(owner);
        oracle = new ReputationOracle();
        oracle.addPriceFeedUpdater(updater);

        // Create a test token
        token = new CredentialToken(
            CREDENTIAL_ID,
            "Test Token",
            "TEST",
            10 * 1e18,  // emission rate
            1000000 * 1e18,  // max supply
            owner,  // creator
            owner   // factory
        );
        vm.stopPrank();
    }

    function testInitialState() public {
        // Check initial configuration
        assertEq(oracle.maxPriceAge(), 3600);
        assertEq(oracle.twapWindow(), 30 days);
        assertEq(oracle.volumeWeight(), 100);
        assertEq(oracle.liquidityWeight(), 100);
        assertEq(oracle.stabilityWeight(), 100);

        // Check owner and updater permissions
        assertTrue(oracle.authorizedUpdaters(owner));
        assertTrue(oracle.authorizedUpdaters(updater));
        assertFalse(oracle.authorizedUpdaters(user));
    }

    function testPriceUpdate() public {
        vm.startPrank(updater);

        uint256 price = 1 * 1e18; // 1 ETH
        uint256 volume = 100 * 1e18;
        uint256 liquidity = 1000 * 1e18;

        oracle.updatePrice(address(token), price, volume, liquidity);

        (uint256 currentPrice, uint256 timestamp) = oracle.getCurrentPrice(address(token));
        assertEq(currentPrice, price);
        assertEq(timestamp, block.timestamp);

        vm.stopPrank();
    }

    function testUnauthorizedPriceUpdate() public {
        vm.startPrank(user);

        uint256 price = 1 * 1e18;
        uint256 volume = 100 * 1e18;
        uint256 liquidity = 1000 * 1e18;

        vm.expectRevert(abi.encodeWithSelector(IReputationOracle.UnauthorizedPriceUpdater.selector, user));
        oracle.updatePrice(address(token), price, volume, liquidity);

        vm.stopPrank();
    }

    function testTWAPCalculation() public {
        vm.startPrank(updater);

        // Add multiple price points over time
        uint256 basePrice = 1 * 1e18;
        uint256 volume = 100 * 1e18;
        uint256 liquidity = 1000 * 1e18;

        for (uint256 i = 0; i < 10; i++) {
            oracle.updatePrice(
                address(token),
                basePrice + (i * 1e17), // Gradually increasing price
                volume,
                liquidity
            );
            vm.warp(block.timestamp + 1 hours);
        }

        // Calculate TWAP for last 5 hours
        uint256 twap = oracle.getTWAP(address(token), 5 hours);

        // TWAP should be around the middle price point
        assertGt(twap, basePrice + 2e17); // Greater than price at hour 2
        assertLt(twap, basePrice + 8e17); // Less than price at hour 8

        vm.stopPrank();
    }

    function testReputationScoreCalculation() public {
        vm.startPrank(updater);

        // Set up price history with good metrics
        uint256 stablePrice = 5 * 1e18; // 5 ETH
        uint256 highVolume = 6000 * 1e18; // High volume for good multiplier
        uint256 deepLiquidity = 15000 * 1e18; // Deep liquidity

        // Create 30 days of price history with low volatility
        for (uint256 day = 0; day < 30; day++) {
            for (uint256 hour = 0; hour < 24; hour += 6) {
                // Small price variation for stability
                uint256 priceVariation = (stablePrice * (100 + (hour % 3))) / 100;
                oracle.updatePrice(
                    address(token),
                    priceVariation,
                    highVolume / 24,
                    deepLiquidity
                );
                vm.warp(block.timestamp + 6 hours);
            }
        }

        // Update reputation score
        oracle.updateReputationScore(CREDENTIAL_ID, address(token));

        // Check reputation score
        (uint256 score, uint256 lastUpdated) = oracle.getReputationScore(CREDENTIAL_ID);

        assertGt(score, 0, "Score should be greater than 0");
        assertLe(score, 1000, "Score should not exceed 1000");
        assertEq(lastUpdated, block.timestamp, "Last updated should be current timestamp");

        vm.stopPrank();
    }

    function testGetTopCredentials() public {
        vm.startPrank(updater);

        // Create multiple credentials with different scores
        bytes32[] memory credentialIds = new bytes32[](5);
        address[] memory tokens = new address[](5);

        for (uint256 i = 0; i < 5; i++) {
            credentialIds[i] = keccak256(abi.encodePacked("CREDENTIAL_", i));
            tokens[i] = address(uint160(1000 + i));

            // Set up different price/volume/liquidity for each
            uint256 price = (i + 1) * 1e18;
            uint256 volume = (i + 1) * 1000 * 1e18;
            uint256 liquidity = (i + 1) * 5000 * 1e18;

            oracle.updatePrice(tokens[i], price, volume, liquidity);
            oracle.updateReputationScore(credentialIds[i], tokens[i]);
        }

        // Get top 3 credentials
        (bytes32[] memory topCreds, uint256[] memory scores) = oracle.getTopCredentials(3);

        assertEq(topCreds.length, 3, "Should return 3 credentials");

        // Verify descending order
        for (uint256 i = 0; i < topCreds.length - 1; i++) {
            assertGe(scores[i], scores[i + 1], "Scores should be in descending order");
        }

        vm.stopPrank();
    }

    function testBatchPriceUpdate() public {
        vm.startPrank(updater);

        address[] memory tokens = new address[](3);
        uint256[] memory prices = new uint256[](3);
        uint256[] memory volumes = new uint256[](3);
        uint256[] memory liquidities = new uint256[](3);

        for (uint256 i = 0; i < 3; i++) {
            tokens[i] = address(uint160(2000 + i));
            prices[i] = (i + 1) * 1e18;
            volumes[i] = (i + 1) * 100 * 1e18;
            liquidities[i] = (i + 1) * 1000 * 1e18;
        }

        oracle.batchUpdatePrices(tokens, prices, volumes, liquidities);

        // Verify all prices were updated
        for (uint256 i = 0; i < 3; i++) {
            (uint256 price, ) = oracle.getCurrentPrice(tokens[i]);
            assertEq(price, prices[i], "Price should match");
        }

        vm.stopPrank();
    }

    function testVolumeData() public {
        vm.startPrank(updater);

        uint256 hourlyVolume = 50 * 1e18;

        // Add volume data over 48 hours
        for (uint256 hour = 0; hour < 48; hour++) {
            oracle.updatePrice(
                address(token),
                1e18,
                hourlyVolume,
                1000e18
            );
            vm.warp(block.timestamp + 1 hours);
        }

        // Check 24h volume
        (uint256 volume24h, uint256 trades24h) = oracle.getVolumeData(address(token), 24 hours);

        // Should be approximately 24 * hourlyVolume
        assertGe(volume24h, 23 * hourlyVolume);
        assertLe(volume24h, 25 * hourlyVolume);
        assertGe(trades24h, 23);
        assertLe(trades24h, 25);

        vm.stopPrank();
    }

    function testPriceHistory() public {
        vm.startPrank(updater);

        uint256 startTime = block.timestamp;

        // Add 10 price points
        for (uint256 i = 0; i < 10; i++) {
            oracle.updatePrice(
                address(token),
                (i + 1) * 1e18,
                100e18,
                1000e18
            );
            vm.warp(block.timestamp + 1 hours);
        }

        uint256 endTime = block.timestamp;

        // Get price history
        (uint256[] memory prices, uint256[] memory timestamps) = oracle.getPriceHistory(
            address(token),
            startTime,
            endTime
        );

        assertEq(prices.length, 10, "Should have 10 price points");
        assertEq(timestamps.length, 10, "Should have 10 timestamps");

        // Verify prices are correct
        for (uint256 i = 0; i < prices.length; i++) {
            assertEq(prices[i], (i + 1) * 1e18, "Price should match");
        }

        vm.stopPrank();
    }

    function testStalePrice() public {
        vm.startPrank(updater);

        oracle.updatePrice(address(token), 1e18, 100e18, 1000e18);

        // Move time forward past max age
        vm.warp(block.timestamp + 2 hours);

        // Should revert with stale price
        vm.expectRevert(abi.encodeWithSelector(
            IReputationOracle.StalePrice.selector,
            address(token),
            block.timestamp - 2 hours
        ));
        oracle.getCurrentPrice(address(token));

        vm.stopPrank();
    }

    function testSetReputationParameters() public {
        vm.startPrank(owner);

        uint256 newTwapWindow = 7 days;
        uint256 newVolumeWeight = 150;
        uint256 newLiquidityWeight = 120;
        uint256 newStabilityWeight = 130;

        oracle.setReputationParameters(
            newTwapWindow,
            newVolumeWeight,
            newLiquidityWeight,
            newStabilityWeight
        );

        assertEq(oracle.twapWindow(), newTwapWindow);
        assertEq(oracle.volumeWeight(), newVolumeWeight);
        assertEq(oracle.liquidityWeight(), newLiquidityWeight);
        assertEq(oracle.stabilityWeight(), newStabilityWeight);

        vm.stopPrank();
    }

    function testAddRemovePriceFeedUpdater() public {
        address newUpdater = address(4);

        vm.startPrank(owner);

        // Add new updater
        oracle.addPriceFeedUpdater(newUpdater);
        assertTrue(oracle.authorizedUpdaters(newUpdater));

        // Remove updater
        oracle.removePriceFeedUpdater(newUpdater);
        assertFalse(oracle.authorizedUpdaters(newUpdater));

        vm.stopPrank();
    }

    function testMarketCap() public {
        vm.startPrank(updater);

        uint256 price = 2 * 1e18; // 2 ETH
        oracle.updatePrice(address(token), price, 100e18, 1000e18);

        (uint256 marketCap, uint256 circulatingSupply) = oracle.getMarketCap(address(token));

        // Market cap should be price * supply
        assertGt(marketCap, 0, "Market cap should be greater than 0");
        assertEq(circulatingSupply, 1000000 * 1e18, "Circulating supply should match");

        vm.stopPrank();
    }
}