// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialTokenFactory.sol";

contract TestFeeCalculation is Script {

    // Deployed contract addresses (Moca Devnet)
    address constant USDC_ADDRESS = 0x12D2162F47AAAe1B0591e898648605daA186D644;
    address constant FACTORY_ADDRESS = 0xa6a621e9C92fb8DFC963d2C20e8C5CB4C5178cBb;
    address constant FEE_COLLECTOR_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        // Initialize contracts
        MockUSDC usdc = MockUSDC(USDC_ADDRESS);
        FeeCollector feeCollector = FeeCollector(FEE_COLLECTOR_ADDRESS);
        CredentialTokenFactory factory = CredentialTokenFactory(FACTORY_ADDRESS);

        console.log("Deployer:", deployer);

        // Test credential
        bytes32 testCredentialId = keccak256("TEST_CREDENTIAL");

        // Check current USDC balance
        uint256 balance = usdc.balanceOf(deployer);
        console.log("Current USDC balance:", balance);

        // Check fee calculation without collection
        try feeCollector.calculateFee(testCredentialId, 0, 10 * 10**6) returns (uint256 calculatedFee) {
            console.log("Calculated minting fee:", calculatedFee);
        } catch {
            console.log("Fee calculation failed");
        }

        // Check global fees
        try feeCollector.getGlobalFees() returns (uint256 minting, uint256 verification, uint256 highValue) {
            console.log("Global minting fee:", minting);
            console.log("Global verification fee:", verification);
            console.log("Global high value fee:", highValue);
        } catch {
            console.log("Could not get global fees");
        }

        // Check if USDC token is set correctly
        try feeCollector.getUSDCAddress() returns (address usdcAddr) {
            console.log("FeeCollector USDC address:", usdcAddr);
            console.log("Expected USDC address:", USDC_ADDRESS);
            console.log("Match:", usdcAddr == USDC_ADDRESS);
        } catch {
            console.log("Could not get USDC address from fee collector");
        }

        // Check factory configuration
        try factory.getFeeCollector() returns (address fcAddr) {
            console.log("Factory fee collector address:", fcAddr);
            console.log("Expected fee collector address:", FEE_COLLECTOR_ADDRESS);
            console.log("Match:", fcAddr == FEE_COLLECTOR_ADDRESS);
        } catch {
            console.log("Could not get fee collector from factory");
        }

        try factory.getUSDCToken() returns (address factoryUsdcAddr) {
            console.log("Factory USDC address:", factoryUsdcAddr);
            console.log("Expected USDC address:", USDC_ADDRESS);
            console.log("Match:", factoryUsdcAddr == USDC_ADDRESS);
        } catch {
            console.log("Could not get USDC address from factory");
        }

        // Check credential ownership validation
        try factory.validateCredentialOwnership(testCredentialId, deployer) returns (bool isValid) {
            console.log("Credential ownership validation:", isValid);
        } catch {
            console.log("Credential ownership validation failed");
        }

        vm.stopBroadcast();
    }
}