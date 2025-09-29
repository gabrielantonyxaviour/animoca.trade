// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

contract CheckContracts is Script {

    address constant USDC_ADDRESS = 0x62A3E29afc75a91f40599f4f7314fF46eBa9bF93;
    address constant FACTORY_ADDRESS = 0x60DdECC1f8Fa85b531D4891Ac1901Ab263066A67;
    address constant AMM_ADDRESS = 0x15ad9d57A5A6Fea6b7efdA228ef117a4A7ed9ef9;

    function run() external view {
        console.log("Checking contract code sizes...");

        console.log("USDC code size:", USDC_ADDRESS.code.length);
        console.log("Factory code size:", FACTORY_ADDRESS.code.length);
        console.log("AMM code size:", AMM_ADDRESS.code.length);

        if (USDC_ADDRESS.code.length == 0) {
            console.log("USDC contract not found!");
        }
        if (FACTORY_ADDRESS.code.length == 0) {
            console.log("Factory contract not found!");
        }
        if (AMM_ADDRESS.code.length == 0) {
            console.log("AMM contract not found!");
        }
    }
}