// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";

contract CreateBasicMarkets is Script {

    // NEW contract addresses from QuickDeploy
    address constant USDC_ADDRESS = 0x229869949693f1467b8b43d2907bDAE3C58E3047;
    address constant FACTORY_ADDRESS = 0x48B051F3e565E394ED8522ac453d87b3Fa40ad62;
    address constant FEE_COLLECTOR_ADDRESS = 0x12D2162F47AAAe1B0591e898648605daA186D644;
    address constant AMM_ADDRESS = 0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        MockUSDC usdc = MockUSDC(USDC_ADDRESS);
        CredentialTokenFactory factory = CredentialTokenFactory(FACTORY_ADDRESS);
        CredentialAMM amm = CredentialAMM(AMM_ADDRESS);

        console.log("Creating basic credential markets...");
        console.log("Deployer:", deployer);

        // Mint some USDC for testing
        usdc.freeMint(deployer, 50000 * 10**6); // 50,000 USDC
        console.log("USDC balance:", usdc.balanceOf(deployer));

        // Approve USDC for fee payment
        usdc.approve(FEE_COLLECTOR_ADDRESS, 10 * 10**6); // 10 USDC for fees

        // Create three credential tokens for the shown credentials
        bytes32 MIT_CS = keccak256("MIT_COMPUTER_SCIENCE_DEGREE");
        bytes32 TECH_DEV = keccak256("TECHCORP_SENIOR_DEVELOPER_CERT");
        bytes32 CRYPTO_EXPERT = keccak256("CRYPTOACADEMY_BLOCKCHAIN_EXPERT_BADGE");

        // Create tokens
        console.log("Creating MIT CS token...");
        address mitToken = factory.createToken(
            MIT_CS,
            "MIT Computer Science Degree",
            "MIT-CS",
            100 * 10**18,  // 100 tokens per day
            1000000 * 10**18 // 1M max supply
        );
        console.log("MIT CS Token:", mitToken);

        console.log("Creating TechCorp Dev token...");
        address devToken = factory.createToken(
            TECH_DEV,
            "TechCorp Senior Developer Certification",
            "TECH-DEV",
            75 * 10**18,   // 75 tokens per day
            750000 * 10**18 // 750K max supply
        );
        console.log("TechCorp Dev Token:", devToken);

        console.log("Creating Blockchain Expert token...");
        address cryptoToken = factory.createToken(
            CRYPTO_EXPERT,
            "CryptoAcademy Blockchain Expert Badge",
            "CRYPTO-BE",
            50 * 10**18,   // 50 tokens per day
            500000 * 10**18 // 500K max supply
        );
        console.log("Blockchain Expert Token:", cryptoToken);

        // Create initial liquidity for MIT CS token
        console.log("Creating market for MIT CS...");
        _createBasicMarket(MIT_CS, mitToken, factory, amm, usdc, deployer);

        // Create initial liquidity for TechCorp Dev token
        console.log("Creating market for TechCorp Dev...");
        _createBasicMarket(TECH_DEV, devToken, factory, amm, usdc, deployer);

        // Create initial liquidity for Blockchain Expert token
        console.log("Creating market for Blockchain Expert...");
        _createBasicMarket(CRYPTO_EXPERT, cryptoToken, factory, amm, usdc, deployer);

        vm.stopBroadcast();

        console.log("\n=== BASIC MARKETS CREATED ===");
        console.log("MIT CS Token:", mitToken);
        console.log("TechCorp Dev Token:", devToken);
        console.log("Blockchain Expert Token:", cryptoToken);
        console.log("All markets are ready for trading!");
    }

    function _createBasicMarket(
        bytes32 credentialId,
        address tokenAddress,
        CredentialTokenFactory factory,
        CredentialAMM amm,
        MockUSDC usdc,
        address deployer
    ) internal {
        CredentialToken token = CredentialToken(tokenAddress);

        // Temporarily set deployer as minter
        factory.setTokenMinter(tokenAddress, deployer);

        // Mint initial tokens for liquidity
        uint256 tokenAmount = 1000 * 10**18; // 1000 tokens
        token.mint(deployer, tokenAmount);

        // Restore FeeCollector as minter
        factory.setTokenMinter(tokenAddress, FEE_COLLECTOR_ADDRESS);

        // Approve tokens for AMM
        token.approve(AMM_ADDRESS, tokenAmount);
        usdc.approve(AMM_ADDRESS, 1000 * 10**6); // 1000 USDC

        // Create pool with 1:1 ratio (1000 tokens : 1000 USDC)
        uint256 liquidity = amm.createPool(
            credentialId,
            tokenAddress,
            tokenAmount,
            1000 * 10**6
        );

        console.log("Market created with liquidity:", liquidity);
        console.log("Initial price:", amm.getTokenPrice(credentialId) / 10**6, "USDC per token");
    }
}