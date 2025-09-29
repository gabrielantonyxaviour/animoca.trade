// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";
import "../src/interfaces/IFeeCollector.sol";

contract DebugTokenCreation is Script {

    // Deployed contract addresses (Moca Devnet)
    address constant USDC_ADDRESS = 0x12D2162F47AAAe1B0591e898648605daA186D644;
    address constant FACTORY_ADDRESS = 0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb;
    address constant FEE_COLLECTOR_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;
    address constant AMM_ADDRESS = 0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67;

    // Contract instances
    MockUSDC public usdc;
    CredentialTokenFactory public factory;
    FeeCollector public feeCollector;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        // Initialize contracts
        usdc = MockUSDC(USDC_ADDRESS);
        factory = CredentialTokenFactory(FACTORY_ADDRESS);
        feeCollector = FeeCollector(FEE_COLLECTOR_ADDRESS);

        console.log("Deployer:", deployer);
        console.log("USDC balance:", usdc.balanceOf(deployer));

        // Try to mint some USDC first
        usdc.freeMint(deployer, 10 * 10**6); // 10 USDC
        console.log("After minting - USDC balance:", usdc.balanceOf(deployer));

        // Check fee requirements
        bytes32 testCredentialId = keccak256("TEST_CREDENTIAL");

        // Try to get the fee amount required
        try feeCollector.collectMintingFee(testCredentialId, deployer) returns (uint256 feeAmount) {
            console.log("Minting fee would be:", feeAmount);
        } catch {
            console.log("Fee collection would fail - checking why...");

            // Check if credential is valid
            console.log("FeeCollector address:", address(feeCollector));
            console.log("Factory address:", address(factory));

            // Try to check fee config
            try feeCollector.getFeeConfig(testCredentialId) returns (IFeeCollector.FeeConfig memory config) {
                console.log("Fee config found:");
                console.log("  Minting fee:", config.mintingFee);
                console.log("  Active:", config.isActive);
            } catch {
                console.log("No fee config found for credential");
            }
        }

        // Approve USDC for fee payment
        uint256 approveAmount = 5 * 10**6; // 5 USDC
        usdc.approve(FEE_COLLECTOR_ADDRESS, approveAmount);
        console.log("Approved", approveAmount, "USDC for fee collector");

        // Try to create a simple token
        try factory.createToken(
            testCredentialId,
            "Test Token",
            "TEST",
            100 * 10**18,  // 100 tokens per day
            1000000 * 10**18 // 1M max supply
        ) returns (address tokenAddress) {
            console.log("Token created successfully at:", tokenAddress);
        } catch Error(string memory reason) {
            console.log("Token creation failed with reason:", reason);
        } catch {
            console.log("Token creation failed with unknown error");
        }

        vm.stopBroadcast();
    }
}