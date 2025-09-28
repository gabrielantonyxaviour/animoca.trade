// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IReputationOracle.sol";
import "../interfaces/ICredentialPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract ReputationOracle is IReputationOracle, Ownable {
    using Math for uint256;

    struct PricePoint {
        uint256 price;
        uint256 timestamp;
        uint256 cumulativePrice;
        uint256 volume;
        uint256 liquidity;
    }

    struct TokenData {
        PricePoint[] priceHistory;
        uint256 totalVolume24h;
        uint256 totalTrades24h;
        uint256 lastUpdateTimestamp;
        uint256 priceSum30d;
        uint256 priceCount30d;
        mapping(uint256 => uint256) hourlyVolume;
        mapping(uint256 => uint256) hourlyTrades;
    }

    struct ReputationData {
        uint256 score;
        uint256 lastUpdated;
        address tokenAddress;
        uint256 twap30d;
        uint256 volumeWeight;
        uint256 liquidityMultiplier;
        uint256 stabilityBonus;
    }

    mapping(address => TokenData) public tokenData;
    mapping(bytes32 => ReputationData) public reputationData;
    mapping(address => bool) public authorizedUpdaters;

    bytes32[] private rankedCredentials;
    mapping(bytes32 => uint256) private credentialRankIndex;

    uint256 public constant MAX_HISTORY_POINTS = 2160; // 90 days * 24 hours
    uint256 public constant HOUR = 3600;
    uint256 public constant DAY = 86400;
    uint256 public constant PRICE_PRECISION = 1e18;

    uint256 public maxPriceAge = 3600; // 1 hour default
    uint256 public twapWindow = 30 * DAY; // 30 days
    uint256 public volumeWeight = 100; // Base 100
    uint256 public liquidityWeight = 100;
    uint256 public stabilityWeight = 100;

    constructor() Ownable(msg.sender) {
        authorizedUpdaters[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        if (!authorizedUpdaters[msg.sender]) {
            revert UnauthorizedPriceUpdater(msg.sender);
        }
        _;
    }

    function getCurrentPrice(address token)
        external
        view
        override
        returns (uint256 price, uint256 timestamp)
    {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length == 0) {
            return (0, 0);
        }

        PricePoint memory latest = data.priceHistory[data.priceHistory.length - 1];
        if (block.timestamp - latest.timestamp > maxPriceAge) {
            revert StalePrice(token, latest.timestamp);
        }

        return (latest.price, latest.timestamp);
    }

    function getTWAP(address token, uint256 timeWindow)
        external
        view
        override
        returns (uint256 twap)
    {
        TokenData storage data = tokenData[token];
        uint256 historyLength = data.priceHistory.length;

        if (historyLength == 0) {
            return 0;
        }

        uint256 startTime = block.timestamp - timeWindow;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;

        for (uint256 i = historyLength; i > 0; i--) {
            PricePoint memory point = data.priceHistory[i - 1];

            if (point.timestamp < startTime) {
                break;
            }

            uint256 weight = 1;
            if (i > 1) {
                PricePoint memory prevPoint = data.priceHistory[i - 2];
                if (prevPoint.timestamp >= startTime) {
                    weight = point.timestamp - prevPoint.timestamp;
                } else {
                    weight = point.timestamp - startTime;
                }
            } else {
                weight = point.timestamp - startTime;
            }

            weightedSum += point.price * weight;
            totalWeight += weight;
        }

        if (totalWeight == 0) {
            revert InsufficientPriceHistory(token, timeWindow);
        }

        return weightedSum / totalWeight;
    }

    function getPriceHistory(
        address token,
        uint256 fromTimestamp,
        uint256 toTimestamp
    ) external view override returns (uint256[] memory prices, uint256[] memory timestamps) {
        TokenData storage data = tokenData[token];
        uint256 historyLength = data.priceHistory.length;

        uint256 count = 0;
        for (uint256 i = 0; i < historyLength; i++) {
            if (data.priceHistory[i].timestamp >= fromTimestamp &&
                data.priceHistory[i].timestamp <= toTimestamp) {
                count++;
            }
        }

        prices = new uint256[](count);
        timestamps = new uint256[](count);

        uint256 index = 0;
        for (uint256 i = 0; i < historyLength; i++) {
            PricePoint memory point = data.priceHistory[i];
            if (point.timestamp >= fromTimestamp && point.timestamp <= toTimestamp) {
                prices[index] = point.price;
                timestamps[index] = point.timestamp;
                index++;
            }
        }

        return (prices, timestamps);
    }

    function getReputationScore(bytes32 credentialId)
        external
        view
        override
        returns (uint256 score, uint256 lastUpdated)
    {
        ReputationData memory repData = reputationData[credentialId];
        return (repData.score, repData.lastUpdated);
    }

    function getReputationRanking(bytes32 credentialId)
        external
        view
        override
        returns (uint256 rank, uint256 totalCredentials)
    {
        uint256 index = credentialRankIndex[credentialId];
        if (index == 0 && rankedCredentials.length > 0 && rankedCredentials[0] != credentialId) {
            return (0, rankedCredentials.length);
        }
        return (index + 1, rankedCredentials.length);
    }

    function getTopCredentials(uint256 limit)
        external
        view
        override
        returns (bytes32[] memory credentialIds, uint256[] memory scores)
    {
        uint256 actualLimit = Math.min(limit, rankedCredentials.length);
        credentialIds = new bytes32[](actualLimit);
        scores = new uint256[](actualLimit);

        for (uint256 i = 0; i < actualLimit; i++) {
            bytes32 credId = rankedCredentials[i];
            credentialIds[i] = credId;
            scores[i] = reputationData[credId].score;
        }

        return (credentialIds, scores);
    }

    function updateReputationScore(bytes32 credentialId, address tokenAddress)
        external
        override
        onlyAuthorized
    {
        TokenData storage data = tokenData[tokenAddress];
        ReputationData storage repData = reputationData[credentialId];

        uint256 oldScore = repData.score;

        // Calculate TWAP component
        uint256 twap = _calculateTWAP(tokenAddress, twapWindow);
        if (twap == 0) {
            repData.score = 0;
            repData.lastUpdated = block.timestamp;
            emit ReputationUpdate(credentialId, oldScore, 0, block.timestamp);
            return;
        }

        // Calculate log2(TWAP) - multiply by 100 for precision
        uint256 logTwap = _log2(twap / 1e14) * 100; // Scale down twap for log calculation

        // Calculate volume weight (0.5x - 2.0x)
        uint256 volume24h = _getVolume24h(tokenAddress);
        uint256 volWeight = _calculateVolumeWeight(volume24h);

        // Calculate liquidity multiplier (1.0x - 1.5x)
        uint256 liquidity = _getCurrentLiquidity(tokenAddress);
        uint256 liqMultiplier = _calculateLiquidityMultiplier(liquidity);

        // Calculate stability bonus (0.8x - 1.3x)
        uint256 stabBonus = _calculateStabilityBonus(tokenAddress);

        // Calculate final score: log₂(TWAP) × Volume_Weight × Liquidity_Multiplier × Stability_Bonus
        uint256 newScore = (logTwap * volWeight * liqMultiplier * stabBonus) / 1000000;

        // Cap at 1000
        if (newScore > 1000) {
            newScore = 1000;
        }

        repData.score = newScore;
        repData.lastUpdated = block.timestamp;
        repData.tokenAddress = tokenAddress;
        repData.twap30d = twap;
        repData.volumeWeight = volWeight;
        repData.liquidityMultiplier = liqMultiplier;
        repData.stabilityBonus = stabBonus;

        _updateRanking(credentialId, newScore);

        emit ReputationUpdate(credentialId, oldScore, newScore, block.timestamp);
    }

    function getVolumeData(address token, uint256 timeWindow)
        external
        view
        override
        returns (uint256 volume, uint256 trades)
    {
        TokenData storage data = tokenData[token];

        if (block.timestamp < timeWindow) {
            // If timeWindow is larger than blockchain time, count from genesis
            uint256 endHour = block.timestamp / HOUR;
            for (uint256 hour = 0; hour <= endHour; hour++) {
                volume += data.hourlyVolume[hour];
                trades += data.hourlyTrades[hour];
            }
        } else {
            uint256 startTime = block.timestamp - timeWindow;
            uint256 startHour = startTime / HOUR;
            uint256 endHour = block.timestamp / HOUR;

            for (uint256 hour = startHour; hour <= endHour; hour++) {
                volume += data.hourlyVolume[hour];
                trades += data.hourlyTrades[hour];
            }
        }

        return (volume, trades);
    }

    function getLiquidityData(address token)
        external
        view
        override
        returns (uint256 totalLiquidity, uint256 poolCount, address largestPool)
    {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length > 0) {
            totalLiquidity = data.priceHistory[data.priceHistory.length - 1].liquidity;
        }
        poolCount = 1; // Simplified - tracking one pool per token
        largestPool = token; // Placeholder
        return (totalLiquidity, poolCount, largestPool);
    }

    function getMarketCap(address token)
        external
        view
        override
        returns (uint256 marketCap, uint256 circulatingSupply)
    {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length == 0) {
            return (0, 0);
        }

        uint256 currentPrice = data.priceHistory[data.priceHistory.length - 1].price;
        circulatingSupply = 1000000 * PRICE_PRECISION; // Placeholder - should get from token contract
        marketCap = (currentPrice * circulatingSupply) / PRICE_PRECISION;

        return (marketCap, circulatingSupply);
    }

    function updatePrice(
        address token,
        uint256 price,
        uint256 volume,
        uint256 liquidity
    ) external override onlyAuthorized {
        _updatePriceInternal(token, price, volume, liquidity);
    }

    function batchUpdatePrices(
        address[] calldata tokens,
        uint256[] calldata prices,
        uint256[] calldata volumes,
        uint256[] calldata liquidities
    ) external override onlyAuthorized {
        uint256 length = tokens.length;
        if (length != prices.length || length != volumes.length || length != liquidities.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < length; i++) {
            // Call internal function directly, not through external interface
            _updatePriceInternal(tokens[i], prices[i], volumes[i], liquidities[i]);
        }
    }

    function _updatePriceInternal(
        address token,
        uint256 price,
        uint256 volume,
        uint256 liquidity
    ) private {
        TokenData storage data = tokenData[token];

        // Clean old data if necessary
        _cleanOldPriceData(token);

        // Calculate cumulative price
        uint256 cumulativePrice = 0;
        if (data.priceHistory.length > 0) {
            PricePoint memory lastPoint = data.priceHistory[data.priceHistory.length - 1];
            uint256 timeElapsed = block.timestamp - lastPoint.timestamp;
            cumulativePrice = lastPoint.cumulativePrice + (lastPoint.price * timeElapsed);
        }

        // Add new price point
        data.priceHistory.push(PricePoint({
            price: price,
            timestamp: block.timestamp,
            cumulativePrice: cumulativePrice,
            volume: volume,
            liquidity: liquidity
        }));

        // Update hourly data
        uint256 currentHour = block.timestamp / HOUR;
        data.hourlyVolume[currentHour] += volume;
        data.hourlyTrades[currentHour] += 1;

        // Update 24h data
        _update24hData(token);

        data.lastUpdateTimestamp = block.timestamp;

        emit PriceUpdate(token, price, volume, block.timestamp);
    }

    function addPriceFeedUpdater(address updater) external override onlyOwner {
        authorizedUpdaters[updater] = true;
    }

    function removePriceFeedUpdater(address updater) external override onlyOwner {
        authorizedUpdaters[updater] = false;
    }

    function setReputationParameters(
        uint256 _twapWindow,
        uint256 _volumeWeight,
        uint256 _liquidityWeight,
        uint256 _stabilityWeight
    ) external override onlyOwner {
        twapWindow = _twapWindow;
        volumeWeight = _volumeWeight;
        liquidityWeight = _liquidityWeight;
        stabilityWeight = _stabilityWeight;

        emit ReputationParametersUpdated(
            _twapWindow,
            _volumeWeight,
            _liquidityWeight,
            _stabilityWeight,
            block.timestamp
        );
    }

    function setMaxPriceAge(uint256 maxAge) external override onlyOwner {
        maxPriceAge = maxAge;
    }

    // Internal helper functions

    function _calculateTWAP(address token, uint256 window) private view returns (uint256) {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length == 0) return 0;

        uint256 startTime = block.timestamp > window ? block.timestamp - window : 0;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;

        for (uint256 i = data.priceHistory.length; i > 0; i--) {
            PricePoint memory point = data.priceHistory[i - 1];
            if (point.timestamp < startTime) break;

            uint256 weight = 1;
            if (i > 1) {
                PricePoint memory prevPoint = data.priceHistory[i - 2];
                weight = point.timestamp - Math.max(prevPoint.timestamp, startTime);
            } else {
                weight = point.timestamp - startTime;
            }

            weightedSum += point.price * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    function _getVolume24h(address token) private view returns (uint256) {
        TokenData storage data = tokenData[token];
        uint256 volume = 0;

        if (block.timestamp < DAY) {
            // If less than a day has passed, count from genesis
            uint256 endHour = block.timestamp / HOUR;
            for (uint256 hour = 0; hour <= endHour; hour++) {
                volume += data.hourlyVolume[hour];
            }
        } else {
            uint256 startHour = (block.timestamp - DAY) / HOUR;
            uint256 endHour = block.timestamp / HOUR;
            for (uint256 hour = startHour; hour <= endHour; hour++) {
                volume += data.hourlyVolume[hour];
            }
        }

        return volume;
    }

    function _getCurrentLiquidity(address token) private view returns (uint256) {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length > 0) {
            return data.priceHistory[data.priceHistory.length - 1].liquidity;
        }
        return 0;
    }

    function _calculateVolumeWeight(uint256 volume24h) private pure returns (uint256) {
        if (volume24h < 100 * 1e18) return 50; // 0.5x
        if (volume24h < 500 * 1e18) return 70; // 0.7x
        if (volume24h < 1000 * 1e18) return 90; // 0.9x
        if (volume24h < 5000 * 1e18) return 110; // 1.1x
        if (volume24h < 10000 * 1e18) return 130; // 1.3x
        if (volume24h < 25000 * 1e18) return 150; // 1.5x
        return 200; // 2.0x for very high volume
    }

    function _calculateLiquidityMultiplier(uint256 liquidity) private pure returns (uint256) {
        if (liquidity < 500 * 1e18) return 100; // 1.0x
        if (liquidity < 1000 * 1e18) return 105; // 1.05x
        if (liquidity < 5000 * 1e18) return 110; // 1.1x
        if (liquidity < 10000 * 1e18) return 120; // 1.2x
        if (liquidity < 25000 * 1e18) return 130; // 1.3x
        if (liquidity < 50000 * 1e18) return 140; // 1.4x
        return 150; // 1.5x for deep liquidity
    }

    function _calculateStabilityBonus(address token) private view returns (uint256) {
        TokenData storage data = tokenData[token];
        if (data.priceHistory.length < 30) return 100; // Neutral if insufficient data

        // Calculate standard deviation over last 30 days
        uint256 mean = _calculateTWAP(token, 30 * DAY);
        if (mean == 0) return 100;

        uint256 variance = 0;
        uint256 count = 0;

        for (uint256 i = data.priceHistory.length; i > 0 && count < 30; i--) {
            PricePoint memory point = data.priceHistory[i - 1];
            if (block.timestamp - point.timestamp > 30 * DAY) break;

            uint256 diff = point.price > mean ? point.price - mean : mean - point.price;
            variance += (diff * diff) / mean;
            count++;
        }

        if (count == 0) return 100;
        variance = variance / count;

        // Convert variance to volatility percentage (simplified)
        uint256 volatilityPct = (variance * 100) / mean;

        if (volatilityPct > 50) return 80; // 0.8x for very high volatility
        if (volatilityPct > 25) return 90; // 0.9x for high volatility
        if (volatilityPct > 10) return 100; // 1.0x for medium volatility
        if (volatilityPct > 5) return 110; // 1.1x for low volatility
        return 120; // 1.2x for very low volatility
    }

    function _log2(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 n = 0;
        if (x >= 2**128) { x >>= 128; n += 128; }
        if (x >= 2**64) { x >>= 64; n += 64; }
        if (x >= 2**32) { x >>= 32; n += 32; }
        if (x >= 2**16) { x >>= 16; n += 16; }
        if (x >= 2**8) { x >>= 8; n += 8; }
        if (x >= 2**4) { x >>= 4; n += 4; }
        if (x >= 2**2) { x >>= 2; n += 2; }
        if (x >= 2**1) { n += 1; }
        return n;
    }

    function _updateRanking(bytes32 credentialId, uint256 newScore) private {
        uint256 currentIndex = credentialRankIndex[credentialId];

        // Remove from current position if exists
        if (currentIndex > 0 || (rankedCredentials.length > 0 && rankedCredentials[0] == credentialId)) {
            // Shift elements
            for (uint256 i = currentIndex; i < rankedCredentials.length - 1; i++) {
                rankedCredentials[i] = rankedCredentials[i + 1];
                credentialRankIndex[rankedCredentials[i]] = i;
            }
            rankedCredentials.pop();
        }

        // Find new position
        uint256 newIndex = rankedCredentials.length;
        for (uint256 i = 0; i < rankedCredentials.length; i++) {
            if (reputationData[rankedCredentials[i]].score < newScore) {
                newIndex = i;
                break;
            }
        }

        // Insert at new position
        rankedCredentials.push(bytes32(0));
        for (uint256 i = rankedCredentials.length - 1; i > newIndex; i--) {
            rankedCredentials[i] = rankedCredentials[i - 1];
            credentialRankIndex[rankedCredentials[i]] = i;
        }
        rankedCredentials[newIndex] = credentialId;
        credentialRankIndex[credentialId] = newIndex;
    }

    function _cleanOldPriceData(address token) private {
        TokenData storage data = tokenData[token];
        if (block.timestamp < 90 * DAY) {
            return; // Don't clean if blockchain time is less than 90 days
        }

        uint256 cutoffTime = block.timestamp - (90 * DAY);

        // Find first index to keep
        uint256 firstKeepIndex = 0;
        for (uint256 i = 0; i < data.priceHistory.length; i++) {
            if (data.priceHistory[i].timestamp >= cutoffTime) {
                firstKeepIndex = i;
                break;
            }
        }

        // Remove old entries if needed
        if (firstKeepIndex > 0) {
            uint256 remainingLength = data.priceHistory.length - firstKeepIndex;
            for (uint256 i = 0; i < remainingLength; i++) {
                data.priceHistory[i] = data.priceHistory[i + firstKeepIndex];
            }
            for (uint256 i = 0; i < firstKeepIndex; i++) {
                data.priceHistory.pop();
            }
        }

        // Clean old hourly data (only if oldestHour > 100)
        uint256 oldestHour = cutoffTime / HOUR;
        if (oldestHour > 100) {
            for (uint256 hour = oldestHour - 100; hour < oldestHour; hour++) {
                delete data.hourlyVolume[hour];
                delete data.hourlyTrades[hour];
            }
        }
    }

    function _update24hData(address token) private {
        TokenData storage data = tokenData[token];
        if (block.timestamp < DAY) {
            // If less than a day has passed, count from genesis
            uint256 endHour = block.timestamp / HOUR;
            data.totalVolume24h = 0;
            data.totalTrades24h = 0;

            for (uint256 hour = 0; hour <= endHour; hour++) {
                data.totalVolume24h += data.hourlyVolume[hour];
                data.totalTrades24h += data.hourlyTrades[hour];
            }
        } else {
            uint256 startHour = (block.timestamp - DAY) / HOUR;
            uint256 endHour = block.timestamp / HOUR;

            data.totalVolume24h = 0;
            data.totalTrades24h = 0;

            for (uint256 hour = startHour; hour <= endHour; hour++) {
                data.totalVolume24h += data.hourlyVolume[hour];
                data.totalTrades24h += data.hourlyTrades[hour];
            }
        }
    }
}