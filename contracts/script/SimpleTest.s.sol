// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract SimpleTest is Script {

    // Deployed contract addresses (Moca Devnet) - NEW
    address constant USDC_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;
    address constant FACTORY_ADDRESS = 0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67;
    address constant FEE_COLLECTOR_ADDRESS = 0x94B03d30a4bdde64af2A713060dF1bE4dEb8BeC1;

    function run() external view {
        console.log("Testing deployed contracts...");

        // Simple check if contracts exist
        console.log("USDC code size:", USDC_ADDRESS.code.length);
        console.log("Factory code size:", FACTORY_ADDRESS.code.length);
        console.log("FeeCollector code size:", FEE_COLLECTOR_ADDRESS.code.length);

        // Simple function calls
        try this.testUSDC() {
            console.log("USDC works");
        } catch {
            console.log("USDC failed");
        }

        try this.testFeeCollector() {
            console.log("FeeCollector works");
        } catch {
            console.log("FeeCollector failed");
        }
    }

    function testUSDC() external view {
        (bool success, bytes memory data) = USDC_ADDRESS.staticcall(
            abi.encodeWithSignature("totalSupply()")
        );
        require(success, "USDC call failed");
        console.log("USDC total supply call successful");
    }

    function testFeeCollector() external view {
        (bool success, bytes memory data) = FEE_COLLECTOR_ADDRESS.staticcall(
            abi.encodeWithSignature("getUSDCAddress()")
        );
        require(success, "FeeCollector call failed");
        address usdcAddr = abi.decode(data, (address));
        console.log("FeeCollector USDC address:", usdcAddr);
    }
}