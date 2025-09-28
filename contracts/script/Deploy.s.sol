// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/interfaces/ICredentialToken.sol";
import "../src/interfaces/ICredentialTokenFactory.sol";
import "../src/interfaces/ICredentialPool.sol";
import "../src/interfaces/IPassiveTokenGenerator.sol";
import "../src/interfaces/IReputationOracle.sol";
import "../src/CredentialTokenFactory.sol";

/**
 * @title Deploy
 * @dev Deployment script for credential token ecosystem contracts
 * @notice Session 1: Interface verification and deployment preparation
 * @notice Sessions 2-7: Actual contract deployment
 */
contract Deploy is Script {
    // ============ Session 1: Interface Verification ============

    function run() external {
        uint256 deployerPrivateKey;
        address deployer;

        // Use environment variable if available, otherwise use test private key
        try vm.envUint("PRIVATE_KEY") returns (uint256 privateKey) {
            deployerPrivateKey = privateKey;
            deployer = vm.addr(deployerPrivateKey);
        } catch {
            // Use test private key for local deployment
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            deployer = vm.addr(deployerPrivateKey);
            console.log("Using test private key for local deployment");
        }

        console.log("=== Credential Token Ecosystem Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Session 1: Verify interfaces compile and are ready
        verifyInterfaceDefinitions();

        // Session 2: Deploy actual contracts
        address factoryAddress = deployCredentialTokenFactory();

        // Future Sessions: Deploy additional contracts
        // deployPassiveTokenGenerator();
        // deployReputationOracle();

        vm.stopBroadcast();

        console.log("=== Session 2 Complete ===");
        console.log("CredentialTokenFactory deployed at:", factoryAddress);
        console.log("Core token contracts ready for token creation");
        console.log("Next: Session 3 - Implement AMM Pool contracts");
    }

    /**
     * @dev Verifies that all interface definitions are properly structured
     * @notice This ensures Session 1 deliverables are complete
     */
    function verifyInterfaceDefinitions() internal view {
        console.log("Verifying Interface Definitions...");

        // Verify interface IDs can be calculated (confirms proper compilation)
        bytes4 credentialTokenId = type(ICredentialToken).interfaceId;
        bytes4 factoryId = type(ICredentialTokenFactory).interfaceId;
        bytes4 poolId = type(ICredentialPool).interfaceId;
        bytes4 generatorId = type(IPassiveTokenGenerator).interfaceId;
        bytes4 oracleId = type(IReputationOracle).interfaceId;

        console.log("ICredentialToken interface ID:", vm.toString(credentialTokenId));
        console.log("ICredentialTokenFactory interface ID:", vm.toString(factoryId));
        console.log("ICredentialPool interface ID:", vm.toString(poolId));
        console.log("IPassiveTokenGenerator interface ID:", vm.toString(generatorId));
        console.log("IReputationOracle interface ID:", vm.toString(oracleId));

        // Verify all interfaces have non-zero IDs
        require(credentialTokenId != bytes4(0), "ICredentialToken interface ID invalid");
        require(factoryId != bytes4(0), "ICredentialTokenFactory interface ID invalid");
        require(poolId != bytes4(0), "ICredentialPool interface ID invalid");
        require(generatorId != bytes4(0), "IPassiveTokenGenerator interface ID invalid");
        require(oracleId != bytes4(0), "IReputationOracle interface ID invalid");

        console.log("All interface definitions verified");
        console.log("");
    }

    // ============ Future Sessions: Contract Deployment ============

    /**
     * @dev Deploy CredentialTokenFactory contract
     * @notice Session 2 implementation
     */
    function deployCredentialTokenFactory() internal returns (address) {
        console.log("Deploying CredentialTokenFactory...");

        CredentialTokenFactory factory = new CredentialTokenFactory();

        console.log("CredentialTokenFactory deployed at:", address(factory));
        console.log("Factory owner:", factory.owner());

        return address(factory);
    }

    /**
     * @dev Deploy PassiveTokenGenerator contract
     * @notice To be implemented in Session 6
     */
    function deployPassiveTokenGenerator() internal {
        console.log("PassiveTokenGenerator deployment - Session 6");
        // Implementation placeholder for Session 6
    }

    /**
     * @dev Deploy ReputationOracle contract
     * @notice To be implemented in Session 7
     */
    function deployReputationOracle() internal {
        console.log("ReputationOracle deployment - Session 7");
        // Implementation placeholder for Session 7
    }

    // ============ Environment Configuration ============

    /**
     * @dev Gets deployment configuration for current network
     */
    function getNetworkConfig() internal view returns (
        string memory networkName,
        address expectedDeployer
    ) {
        uint256 chainId = block.chainid;

        if (chainId == 11155111) {
            // Sepolia testnet
            networkName = "Sepolia";
            expectedDeployer = vm.envAddress("SEPOLIA_DEPLOYER");
        } else if (chainId == 1) {
            // Ethereum mainnet
            networkName = "Mainnet";
            expectedDeployer = vm.envAddress("MAINNET_DEPLOYER");
        } else {
            // Local/other networks
            networkName = "Local";
            expectedDeployer = address(0);
        }
    }

    /**
     * @dev Validates deployment environment
     */
    function validateDeploymentEnvironment() internal view {
        (string memory networkName, address expectedDeployer) = getNetworkConfig();

        console.log("Network:", networkName);
        console.log("Chain ID:", block.chainid);

        if (expectedDeployer != address(0)) {
            address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
            require(
                deployer == expectedDeployer,
                "Deployer address does not match expected address for this network"
            );
            console.log("Deployer address validated");
        }

        // Verify required environment variables
        if (block.chainid == 11155111 || block.chainid == 1) {
            vm.envString("ETHERSCAN_API_KEY"); // Will revert if not set
            console.log("Etherscan API key configured");
        }
    }
}