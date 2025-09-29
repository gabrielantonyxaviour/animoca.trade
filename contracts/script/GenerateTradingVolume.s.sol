// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";

contract GenerateTradingVolume is Script {

    // Contract addresses - Updated from QuickDeploy
    address constant USDC_ADDRESS = 0x229869949693f1467b8b43d2907bDAE3C58E3047;
    address constant FACTORY_ADDRESS = 0x48B051F3e565E394ED8522ac453d87b3Fa40ad62;
    address constant AMM_ADDRESS = 0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb;

    // Credential IDs
    bytes32 constant MIT_CS = keccak256("MIT_COMPUTER_SCIENCE_DEGREE");
    bytes32 constant TECH_DEV = keccak256("TECHCORP_SENIOR_DEVELOPER_CERT");
    bytes32 constant CRYPTO_EXPERT = keccak256("CRYPTOACADEMY_BLOCKCHAIN_EXPERT_BADGE");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        MockUSDC usdc = MockUSDC(USDC_ADDRESS);
        CredentialAMM amm = CredentialAMM(AMM_ADDRESS);
        CredentialTokenFactory factory = CredentialTokenFactory(FACTORY_ADDRESS);

        console.log("Generating trading volume...");
        console.log("Deployer:", deployer);

        // Mint more USDC for trading
        usdc.freeMint(deployer, 100000 * 10**6); // 100,000 USDC
        console.log("USDC balance:", usdc.balanceOf(deployer) / 10**6);

        // Generate trades for each market
        _generateVolumeForMarket(MIT_CS, "MIT CS", amm, usdc, factory, deployer);
        _generateVolumeForMarket(TECH_DEV, "TechCorp Dev", amm, usdc, factory, deployer);
        _generateVolumeForMarket(CRYPTO_EXPERT, "Blockchain Expert", amm, usdc, factory, deployer);

        vm.stopBroadcast();

        console.log("\n=== TRADING VOLUME GENERATED ===");
        _logFinalPrices(MIT_CS, TECH_DEV, CRYPTO_EXPERT, amm);
    }

    function _generateVolumeForMarket(
        bytes32 credentialId,
        string memory name,
        CredentialAMM amm,
        MockUSDC usdc,
        CredentialTokenFactory factory,
        address deployer
    ) internal {
        console.log("Generating volume for", name);

        uint256 initialPrice = amm.getTokenPrice(credentialId);
        console.log("Initial price:", initialPrice / 10**6);

        // Execute multiple buy trades of varying sizes
        uint256[5] memory buyAmounts;
        buyAmounts[0] = 50 * 10**6;   // 50 USDC
        buyAmounts[1] = 150 * 10**6;  // 150 USDC
        buyAmounts[2] = 300 * 10**6;  // 300 USDC
        buyAmounts[3] = 100 * 10**6;  // 100 USDC
        buyAmounts[4] = 250 * 10**6;  // 250 USDC

        for (uint i = 0; i < buyAmounts.length; i++) {
            _executeBuyTrade(credentialId, buyAmounts[i], amm, usdc);
        }

        // Get tokens for selling
        address tokenAddress = factory.getTokenByCredential(credentialId);
        _getTokensForSelling(tokenAddress, 500 * 10**18, factory, deployer); // Get 500 tokens

        // Execute sell trades
        uint256[3] memory sellAmounts;
        sellAmounts[0] = 100 * 10**18; // 100 tokens
        sellAmounts[1] = 200 * 10**18; // 200 tokens
        sellAmounts[2] = 150 * 10**18; // 150 tokens

        for (uint i = 0; i < sellAmounts.length; i++) {
            _executeSellTrade(credentialId, sellAmounts[i], amm, tokenAddress);
        }

        uint256 finalPrice = amm.getTokenPrice(credentialId);
        console.log("Final price:", finalPrice / 10**6);
        console.log("Price change %:", ((finalPrice * 100) / initialPrice) - 100);
    }

    function _executeBuyTrade(
        bytes32 credentialId,
        uint256 usdcAmount,
        CredentialAMM amm,
        MockUSDC usdc
    ) internal {
        usdc.approve(AMM_ADDRESS, usdcAmount);

        uint256 tokensOut = amm.swapUSDCForTokens(
            credentialId,
            usdcAmount,
            0, // No minimum for demo
            block.timestamp + 3600
        );

        console.log("Bought tokens:", tokensOut / 10**18);
        console.log("With USDC:", usdcAmount / 10**6);
    }

    function _executeSellTrade(
        bytes32 credentialId,
        uint256 tokenAmount,
        CredentialAMM amm,
        address tokenAddress
    ) internal {
        CredentialToken token = CredentialToken(tokenAddress);
        token.approve(AMM_ADDRESS, tokenAmount);

        uint256 usdcOut = amm.swapTokensForUSDC(
            credentialId,
            tokenAmount,
            0, // No minimum for demo
            block.timestamp + 3600
        );

        console.log("Sold tokens:", tokenAmount / 10**18);
        console.log("For USDC:", usdcOut / 10**6);
    }

    function _getTokensForSelling(
        address tokenAddress,
        uint256 amount,
        CredentialTokenFactory factory,
        address deployer
    ) internal {
        CredentialToken token = CredentialToken(tokenAddress);

        // Temporarily set deployer as minter
        factory.setTokenMinter(tokenAddress, deployer);
        token.mint(deployer, amount);
        // Restore fee collector as minter
        factory.setTokenMinter(tokenAddress, 0x12D2162F47AAAe1B0591e898648605daA186D644);
    }

    function _logFinalPrices(
        bytes32 mitCs,
        bytes32 techDev,
        bytes32 cryptoExpert,
        CredentialAMM amm
    ) internal view {
        console.log("Final Prices:");
        console.log("MIT CS price:", amm.getTokenPrice(mitCs) / 10**6);
        console.log("TechCorp Dev price:", amm.getTokenPrice(techDev) / 10**6);
        console.log("Blockchain Expert price:", amm.getTokenPrice(cryptoExpert) / 10**6);

        // Log pool stats
        console.log("\nPool Statistics:");
        _logPoolStats(mitCs, "MIT CS", amm);
        _logPoolStats(techDev, "TechCorp Dev", amm);
        _logPoolStats(cryptoExpert, "Blockchain Expert", amm);
    }

    function _logPoolStats(bytes32 credentialId, string memory name, CredentialAMM amm) internal view {
        ICredentialAMM.LiquidityPool memory pool = amm.getPool(credentialId);
        console.log(name);
        console.log("Tokens:", pool.tokenReserves / 10**18);
        console.log("USDC:", pool.usdcReserves / 10**6);
    }
}