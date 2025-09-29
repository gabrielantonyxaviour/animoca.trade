// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";

contract DebugVolume is Script {

    address constant USDC_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;
    address constant FACTORY_ADDRESS = 0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67;
    address constant AMM_ADDRESS = 0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Debug deployer:", deployer);

        MockUSDC usdc = MockUSDC(USDC_ADDRESS);

        // Check current balance
        uint256 currentBalance = usdc.balanceOf(deployer);
        console.log("Current USDC balance:", currentBalance / 10**6);

        // Try a small mint first
        try usdc.freeMint(deployer, 1000 * 10**6) {
            console.log("Small mint successful");
        } catch {
            console.log("Small mint failed");
        }

        // Check balance after
        uint256 newBalance = usdc.balanceOf(deployer);
        console.log("New USDC balance:", newBalance / 10**6);

        vm.stopBroadcast();
    }
}