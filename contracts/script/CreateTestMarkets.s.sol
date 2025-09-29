// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";
import "../src/interfaces/ICredentialAMM.sol";

/**
 * @title CreateTestMarkets
 * @dev Creates tokens and markets for test credentials with high trading volume
 */
contract CreateTestMarkets is Script {

    // Deployed contract addresses (Moca Devnet) - NEW DEPLOYMENT
    address constant USDC_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;
    address constant FACTORY_ADDRESS = 0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67;
    address constant FEE_COLLECTOR_ADDRESS = 0x94B03d30a4bdde64af2A713060dF1bE4dEb8BeC1;
    address constant AMM_ADDRESS = 0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9;

    // Contract instances
    MockUSDC public usdc;
    CredentialTokenFactory public factory;
    FeeCollector public feeCollector;
    CredentialAMM public amm;

    // Test credentials
    bytes32 constant CS_DEGREE = keccak256("MIT_COMPUTER_SCIENCE_DEGREE");
    bytes32 constant DEV_CERT = keccak256("TECHCORP_SENIOR_DEVELOPER_CERT");
    bytes32 constant BLOCKCHAIN_BADGE = keccak256("CRYPTOACADEMY_BLOCKCHAIN_EXPERT_BADGE");

    // Token addresses will be stored here
    address public csToken;
    address public devToken;
    address public blockchainToken;

    // Trading amounts
    uint256 constant INITIAL_LIQUIDITY_TOKENS = 5000 * 10**18; // 5000 tokens
    uint256 constant INITIAL_LIQUIDITY_USDC = 5000 * 10**6;   // 5000 USDC
    uint256 constant TRADE_AMOUNT_SMALL = 50 * 10**6;         // 50 USDC
    uint256 constant TRADE_AMOUNT_MEDIUM = 200 * 10**6;       // 200 USDC
    uint256 constant TRADE_AMOUNT_LARGE = 500 * 10**6;        // 500 USDC

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Creating test markets with account:", deployer);

        // Initialize contracts
        _initializeContracts();

        // Mint lots of USDC for testing
        _mintUSDCForTesting(deployer);

        // Create tokens for each credential
        _createCredentialTokens(deployer);

        // Create markets with initial liquidity
        _createMarkets(deployer);

        // Generate high trading volume
        _generateTradingVolume(deployer);

        // Add more liquidity to pools
        _addAdditionalLiquidity(deployer);

        vm.stopBroadcast();

        console.log("\n=== MARKET CREATION COMPLETE ===");
        _logMarketSummary();
    }

    function _initializeContracts() internal {
        usdc = MockUSDC(USDC_ADDRESS);
        factory = CredentialTokenFactory(FACTORY_ADDRESS);
        feeCollector = FeeCollector(FEE_COLLECTOR_ADDRESS);
        amm = CredentialAMM(AMM_ADDRESS);

        console.log("Contracts initialized");
    }

    function _mintUSDCForTesting(address deployer) internal {
        console.log("Minting USDC for testing...");

        // Mint 100,000 USDC for extensive testing
        usdc.freeMint(deployer, 100000 * 10**6);

        console.log("Minted 100,000 USDC for testing");
        console.log("Deployer USDC balance:", usdc.balanceOf(deployer) / 10**6, "USDC");
    }

    function _createCredentialTokens(address deployer) internal {
        console.log("\nCreating credential tokens...");

        // Approve USDC for fee payments (3 tokens × 1 USDC each)
        usdc.approve(FEE_COLLECTOR_ADDRESS, 3 * 10**6);

        // 1. MIT Computer Science Degree
        console.log("Creating MIT Computer Science Degree token...");
        csToken = factory.createToken(
            CS_DEGREE,
            "MIT Computer Science Degree",
            "MIT-CS",
            500 * 10**18,  // 500 tokens per day emission
            2000000 * 10**18 // 2M max supply
        );
        console.log("CS Token created at:", csToken);

        // 2. TechCorp Senior Developer Certification
        console.log("Creating TechCorp Senior Developer Certification token...");
        devToken = factory.createToken(
            DEV_CERT,
            "TechCorp Senior Developer Certification",
            "TECH-DEV",
            300 * 10**18,  // 300 tokens per day emission
            1500000 * 10**18 // 1.5M max supply
        );
        console.log("Dev Token created at:", devToken);

        // 3. CryptoAcademy Blockchain Expert Badge
        console.log("Creating CryptoAcademy Blockchain Expert Badge token...");
        blockchainToken = factory.createToken(
            BLOCKCHAIN_BADGE,
            "CryptoAcademy Blockchain Expert Badge",
            "CRYPTO-BE",
            200 * 10**18,  // 200 tokens per day emission
            1000000 * 10**18 // 1M max supply
        );
        console.log("Blockchain Token created at:", blockchainToken);

        console.log("All tokens created successfully!");
    }

    function _createMarkets(address deployer) internal {
        console.log("\nCreating markets with initial liquidity...");

        // Temporarily set deployer as minter for all tokens to add liquidity
        factory.setTokenMinter(csToken, deployer);
        factory.setTokenMinter(devToken, deployer);
        factory.setTokenMinter(blockchainToken, deployer);

        // Create market for MIT CS Degree (Premium pricing - 1:1 ratio)
        _createMarketForToken(CS_DEGREE, csToken, INITIAL_LIQUIDITY_TOKENS, INITIAL_LIQUIDITY_USDC, "MIT CS Degree");

        // Create market for TechCorp Dev Cert (Mid-tier pricing - 1:0.8 ratio)
        _createMarketForToken(DEV_CERT, devToken, INITIAL_LIQUIDITY_TOKENS, 4000 * 10**6, "TechCorp Dev Cert");

        // Create market for Blockchain Badge (Lower pricing - 1:0.5 ratio)
        _createMarketForToken(BLOCKCHAIN_BADGE, blockchainToken, INITIAL_LIQUIDITY_TOKENS, 2500 * 10**6, "Blockchain Badge");

        // Restore fee collector as minter
        factory.setTokenMinter(csToken, FEE_COLLECTOR_ADDRESS);
        factory.setTokenMinter(devToken, FEE_COLLECTOR_ADDRESS);
        factory.setTokenMinter(blockchainToken, FEE_COLLECTOR_ADDRESS);
    }

    function _createMarketForToken(
        bytes32 credentialId,
        address tokenAddress,
        uint256 tokenAmount,
        uint256 usdcAmount,
        string memory name
    ) internal {
        console.log("Creating market for", name);

        CredentialToken token = CredentialToken(tokenAddress);

        // Mint tokens for liquidity to the deployer
        address deployer = tx.origin;
        token.mint(deployer, tokenAmount);

        // Approve tokens for AMM
        token.approve(AMM_ADDRESS, tokenAmount);
        usdc.approve(AMM_ADDRESS, usdcAmount);

        // Create pool
        uint256 liquidity = amm.createPool(
            credentialId,
            tokenAddress,
            tokenAmount,
            usdcAmount
        );

        console.log("Market created with liquidity:", liquidity);
        console.log("Initial price:", amm.getTokenPrice(credentialId) / 10**6, "USDC per token");
    }

    function _generateTradingVolume(address deployer) internal {
        console.log("\nGenerating high trading volume...");

        // Execute multiple trades for each token to create volume
        for (uint i = 0; i < 3; i++) {
            console.log("Trading round", i + 1);

            _executeTradingRound(CS_DEGREE, "MIT CS");
            _executeTradingRound(DEV_CERT, "Dev Cert");
            _executeTradingRound(BLOCKCHAIN_BADGE, "Blockchain");
        }

        console.log("Trading volume generation complete");
    }

    function _executeTradingRound(bytes32 credentialId, string memory name) internal {
        console.log("Executing trades for", name);

        // Buy trades with varying amounts
        _executeBuyTrade(credentialId, TRADE_AMOUNT_SMALL);
        _executeBuyTrade(credentialId, TRADE_AMOUNT_MEDIUM);
        _executeBuyTrade(credentialId, TRADE_AMOUNT_LARGE);

        // Sell trades (need to mint tokens first for selling)
        address tokenAddress = factory.getTokenByCredential(credentialId);
        CredentialToken token = CredentialToken(tokenAddress);

        // Temporarily become minter to get tokens for selling
        address deployer = tx.origin;
        factory.setTokenMinter(tokenAddress, deployer);
        token.mint(deployer, 1000 * 10**18); // Mint 1000 tokens for selling
        factory.setTokenMinter(tokenAddress, FEE_COLLECTOR_ADDRESS);

        _executeSellTrade(credentialId, 100 * 10**18);  // Sell 100 tokens
        _executeSellTrade(credentialId, 250 * 10**18);  // Sell 250 tokens
        _executeSellTrade(credentialId, 150 * 10**18);  // Sell 150 tokens

        uint256 newPrice = amm.getTokenPrice(credentialId);
        console.log("New price after trading:", newPrice / 10**6, "USDC per token");
    }

    function _executeBuyTrade(bytes32 credentialId, uint256 usdcAmount) internal {
        usdc.approve(AMM_ADDRESS, usdcAmount);

        uint256 tokensOut = amm.swapUSDCForTokens(
            credentialId,
            usdcAmount,
            0, // No minimum for testing
            block.timestamp + 3600
        );

        console.log("Bought tokens:", tokensOut / 10**18);
        console.log("With USDC:", usdcAmount / 10**6);
    }

    function _executeSellTrade(bytes32 credentialId, uint256 tokenAmount) internal {
        address tokenAddress = factory.getTokenByCredential(credentialId);
        CredentialToken token = CredentialToken(tokenAddress);

        token.approve(AMM_ADDRESS, tokenAmount);

        uint256 usdcOut = amm.swapTokensForUSDC(
            credentialId,
            tokenAmount,
            0, // No minimum for testing
            block.timestamp + 3600
        );

        console.log("Sold tokens:", tokenAmount / 10**18);
        console.log("For USDC:", usdcOut / 10**6);
    }

    function _addAdditionalLiquidity(address deployer) internal {
        console.log("\nAdding additional liquidity to all pools...");

        // Add more liquidity to each pool
        _addLiquidityToPool(CS_DEGREE, csToken, 2000 * 10**18, 2000 * 10**6, "MIT CS");
        _addLiquidityToPool(DEV_CERT, devToken, 1500 * 10**18, 1200 * 10**6, "Dev Cert");
        _addLiquidityToPool(BLOCKCHAIN_BADGE, blockchainToken, 1000 * 10**18, 500 * 10**6, "Blockchain");

        console.log("Additional liquidity added to all pools");
    }

    function _addLiquidityToPool(
        bytes32 credentialId,
        address tokenAddress,
        uint256 tokenAmount,
        uint256 usdcAmount,
        string memory name
    ) internal {
        console.log("Adding liquidity to", name, "pool");

        CredentialToken token = CredentialToken(tokenAddress);

        // Temporarily become minter
        address deployer = tx.origin;
        factory.setTokenMinter(tokenAddress, deployer);
        token.mint(deployer, tokenAmount);
        factory.setTokenMinter(tokenAddress, FEE_COLLECTOR_ADDRESS);

        // Approve and add liquidity
        token.approve(AMM_ADDRESS, tokenAmount);
        usdc.approve(AMM_ADDRESS, usdcAmount);

        uint256 liquidity = amm.addLiquidity(
            credentialId,
            tokenAmount,
            usdcAmount,
            0, // No minimum
            block.timestamp + 3600
        );

        console.log("Added liquidity:", liquidity);
    }

    function _logMarketSummary() internal view {
        console.log("MIT CS Token Address:", csToken);
        console.log("TechCorp Dev Token Address:", devToken);
        console.log("Blockchain Badge Token Address:", blockchainToken);

        console.log("\nFinal Market Prices:");
        console.log("MIT CS Degree:", amm.getTokenPrice(CS_DEGREE) / 10**6, "USDC per token");
        console.log("TechCorp Dev Cert:", amm.getTokenPrice(DEV_CERT) / 10**6, "USDC per token");
        console.log("Blockchain Badge:", amm.getTokenPrice(BLOCKCHAIN_BADGE) / 10**6, "USDC per token");

        console.log("\nPool Reserves:");
        _logPoolReserves(CS_DEGREE, "MIT CS");
        _logPoolReserves(DEV_CERT, "Dev Cert");
        _logPoolReserves(BLOCKCHAIN_BADGE, "Blockchain");
    }

    function _logPoolReserves(bytes32 credentialId, string memory name) internal view {
        // Get pool info using interface import
        ICredentialAMM.LiquidityPool memory pool = amm.getPool(credentialId);

        console.log(name, "Pool:");
        console.log("  Token Reserves:", pool.tokenReserves / 10**18);
        console.log("  USDC Reserves:", pool.usdcReserves / 10**6);
        console.log("  Total Liquidity:", pool.totalLiquidity / 10**18);
        console.log("  Active:", pool.isActive);
    }
}