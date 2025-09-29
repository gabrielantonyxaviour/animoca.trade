// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";

/**
 * @title QuickDeploy
 * @dev Simple deployment script for local testing
 */
contract QuickDeploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying with account:", deployer);
        console.log("Account balance:", deployer.balance);

        // Deploy contracts
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed:", address(usdc));

        CredentialTokenFactory factory = new CredentialTokenFactory();
        console.log("CredentialTokenFactory deployed:", address(factory));

        FeeCollector feeCollector = new FeeCollector(address(factory), address(usdc));
        console.log("FeeCollector deployed:", address(feeCollector));

        CredentialAMM amm = new CredentialAMM(address(factory), address(usdc));
        console.log("CredentialAMM deployed:", address(amm));

        // Configure system
        factory.setFeeCollector(address(feeCollector));
        factory.setUSDCToken(address(usdc));

        // Set reasonable fees for testing
        feeCollector.setGlobalFees(100, 50, 200); // 1%, 0.5%, 2%
        amm.setProtocolFeePercentage(500); // 5%

        // Mint test USDC
        usdc.freeMint(deployer, 10000 * 10**6); // 10,000 USDC
        console.log("Minted test USDC for deployer");

        vm.stopBroadcast();

        console.log("\n=== QUICK DEPLOY COMPLETE ===");
        console.log("Copy these addresses for testing:");
        console.log("export USDC_ADDRESS=%s", address(usdc));
        console.log("export FACTORY_ADDRESS=%s", address(factory));
        console.log("export FEE_COLLECTOR_ADDRESS=%s", address(feeCollector));
        console.log("export AMM_ADDRESS=%s", address(amm));
    }
}