// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MockUSDC.sol";
import "../src/FeeCollector.sol";
import "../src/CredentialAMM.sol";
import "../src/CredentialTokenFactory.sol";
import "../src/CredentialToken.sol";

/**
 * @title DeployUSDCSystem
 * @dev Deployment script for the new USDC-based fee collection system
 * @notice Deploys all contracts and configures the system
 */
contract DeployUSDCSystem is Script {

    // Deployment configuration
    struct DeploymentConfig {
        uint256 globalMintingFee;      // 100 = 1%
        uint256 globalVerificationFee; // 50 = 0.5%
        uint256 globalHighValueFee;    // 200 = 2%
        uint256 protocolFeePercentage; // 500 = 5%
        uint256 initialUSDCMint;       // Initial USDC to mint for testing
        address deployer;
        address feeRecipient;
    }

    // Contract instances
    MockUSDC public usdcToken;
    FeeCollector public feeCollector;
    CredentialAMM public credentialAMM;
    CredentialTokenFactory public tokenFactory;

    // Events for deployment tracking
    event ContractDeployed(string contractName, address contractAddress);
    event SystemConfigured(address usdcToken, address feeCollector, address credentialAMM, address tokenFactory);

    function run() external virtual {
        DeploymentConfig memory config = _getDeploymentConfig();

        vm.startBroadcast(config.deployer);

        // Step 1: Deploy MockUSDC
        _deployMockUSDC(config);

        // Step 2: Deploy CredentialTokenFactory
        _deployCredentialTokenFactory();

        // Step 3: Deploy FeeCollector
        _deployFeeCollector(config);

        // Step 4: Deploy CredentialAMM
        _deployCredentialAMM(config);

        // Step 5: Configure system
        _configureSystem(config);

        // Step 6: Verify deployments
        _verifyDeployment();

        vm.stopBroadcast();

        // Log deployment summary
        _logDeploymentSummary();

        // Emit final event
        emit SystemConfigured(
            address(usdcToken),
            address(feeCollector),
            address(credentialAMM),
            address(tokenFactory)
        );
    }

    function _getDeploymentConfig() internal view returns (DeploymentConfig memory) {
        return DeploymentConfig({
            globalMintingFee: 100,        // 1%
            globalVerificationFee: 50,    // 0.5%
            globalHighValueFee: 200,      // 2%
            protocolFeePercentage: 500,   // 5%
            initialUSDCMint: 1000000 * 10**6, // 1M USDC
            deployer: msg.sender,
            feeRecipient: msg.sender
        });
    }

    function _deployMockUSDC(DeploymentConfig memory config) internal {
        console.log("Deploying MockUSDC...");

        usdcToken = new MockUSDC();
        emit ContractDeployed("MockUSDC", address(usdcToken));

        console.log("MockUSDC deployed at:", address(usdcToken));

        // Mint initial USDC for testing
        usdcToken.freeMint(config.deployer, config.initialUSDCMint);
        console.log("Minted initial USDC for deployer:", config.initialUSDCMint);
    }

    function _deployCredentialTokenFactory() internal {
        console.log("Deploying CredentialTokenFactory...");

        tokenFactory = new CredentialTokenFactory();
        emit ContractDeployed("CredentialTokenFactory", address(tokenFactory));

        console.log("CredentialTokenFactory deployed at:", address(tokenFactory));
    }

    function _deployFeeCollector(DeploymentConfig memory config) internal {
        console.log("Deploying FeeCollector...");

        feeCollector = new FeeCollector(
            address(tokenFactory),
            address(usdcToken)
        );
        emit ContractDeployed("FeeCollector", address(feeCollector));

        console.log("FeeCollector deployed at:", address(feeCollector));

        // Set global fees
        feeCollector.setGlobalFees(
            config.globalMintingFee,
            config.globalVerificationFee,
            config.globalHighValueFee
        );
        console.log("Global fees configured");
    }

    function _deployCredentialAMM(DeploymentConfig memory config) internal {
        console.log("Deploying CredentialAMM...");

        credentialAMM = new CredentialAMM(
            address(tokenFactory),
            address(usdcToken)
        );
        emit ContractDeployed("CredentialAMM", address(credentialAMM));

        console.log("CredentialAMM deployed at:", address(credentialAMM));

        // Set protocol fee percentage
        credentialAMM.setProtocolFeePercentage(config.protocolFeePercentage);
        credentialAMM.setFeeRecipient(config.feeRecipient);
        console.log("AMM fees configured");
    }

    function _configureSystem(DeploymentConfig memory config) internal {
        console.log("Configuring system connections...");

        // Configure CredentialTokenFactory
        tokenFactory.setFeeCollector(address(feeCollector));
        tokenFactory.setUSDCToken(address(usdcToken));
        console.log("CredentialTokenFactory configured");

        // Approve FeeCollector to spend USDC for deployer (for testing)
        usdcToken.approve(address(feeCollector), type(uint256).max);
        console.log("USDC approval granted to FeeCollector");
    }

    function _verifyDeployment() internal view {
        console.log("Verifying deployment...");

        // Verify MockUSDC
        require(usdcToken.totalSupply() > 0, "USDC should have supply");
        require(usdcToken.balanceOf(msg.sender) > 0, "Deployer should have USDC");

        // Verify FeeCollector
        require(feeCollector.getUSDCAddress() == address(usdcToken), "FeeCollector USDC mismatch");
        require(feeCollector.getFactory() == address(tokenFactory), "FeeCollector factory mismatch");

        // Verify CredentialAMM
        require(credentialAMM.getUSDCAddress() == address(usdcToken), "AMM USDC mismatch");

        // Verify CredentialTokenFactory
        require(tokenFactory.getFeeCollector() == address(feeCollector), "Factory FeeCollector mismatch");
        require(tokenFactory.getUSDCToken() == address(usdcToken), "Factory USDC mismatch");

        console.log("All verifications passed");
    }

    function _logDeploymentSummary() internal view {
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("MockUSDC:", address(usdcToken));
        console.log("CredentialTokenFactory:", address(tokenFactory));
        console.log("FeeCollector:", address(feeCollector));
        console.log("CredentialAMM:", address(credentialAMM));
        console.log("=========================");

        // Log configuration
        (uint256 mintingFee, uint256 verificationFee, uint256 highValueFee) = feeCollector.getGlobalFees();
        console.log("Global Minting Fee:", mintingFee, "basis points");
        console.log("Global Verification Fee:", verificationFee, "basis points");
        console.log("Global High Value Fee:", highValueFee, "basis points");
        console.log("Protocol Fee Percentage:", credentialAMM.getProtocolFeePercentage(), "basis points");
    }
}

/**
 * @title DeployToSepolia
 * @dev Specific deployment configuration for Sepolia testnet
 */
contract DeployToSepolia is DeployUSDCSystem {
    function run() external override {
        require(block.chainid == 11155111, "Must be on Sepolia");

        DeploymentConfig memory config = _getDeploymentConfig();

        vm.startBroadcast(config.deployer);

        // Step 1: Deploy MockUSDC
        _deployMockUSDC(config);

        // Step 2: Deploy CredentialTokenFactory
        _deployCredentialTokenFactory();

        // Step 3: Deploy FeeCollector
        _deployFeeCollector(config);

        // Step 4: Deploy CredentialAMM
        _deployCredentialAMM(config);

        // Step 5: Configure system
        _configureSystem(config);

        // Step 6: Verify deployments
        _verifyDeployment();

        vm.stopBroadcast();

        // Log deployment summary
        _logDeploymentSummary();

        // Export deployment data for frontend
        _exportDeploymentData();
    }

    function _exportDeploymentData() internal {
        string memory json = _generateDeploymentJSON();
        string memory filename = string(abi.encodePacked("deployments/", vm.toString(block.chainid), "-latest.json"));
        vm.writeFile(filename, json);
        console.log("Deployment data exported to:", filename);
    }

    function _generateDeploymentJSON() internal view returns (string memory) {
        return string(abi.encodePacked(
            '{\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deploymentTimestamp": ', vm.toString(block.timestamp), ',\n',
            '  "contracts": {\n',
            '    "MockUSDC": "', vm.toString(address(usdcToken)), '",\n',
            '    "CredentialTokenFactory": "', vm.toString(address(tokenFactory)), '",\n',
            '    "FeeCollector": "', vm.toString(address(feeCollector)), '",\n',
            '    "CredentialAMM": "', vm.toString(address(credentialAMM)), '"\n',
            '  }\n',
            '}'
        ));
    }
}

/**
 * @title DeployToMainnet
 * @dev Specific deployment configuration for mainnet (with real USDC)
 */
contract DeployToMainnet is Script {
    // Mainnet USDC address
    address constant MAINNET_USDC = 0xa0b86A33e6441f8f10C8e8c7C9C6c06Cb0E73D4D;

    CredentialTokenFactory public tokenFactory;
    FeeCollector public feeCollector;
    CredentialAMM public credentialAMM;

    function run() external {
        require(block.chainid == 1, "Must be on mainnet");

        vm.startBroadcast();

        // Deploy CredentialTokenFactory
        tokenFactory = new CredentialTokenFactory();
        console.log("CredentialTokenFactory deployed at:", address(tokenFactory));

        // Deploy FeeCollector (using real USDC)
        feeCollector = new FeeCollector(
            address(tokenFactory),
            MAINNET_USDC
        );
        console.log("FeeCollector deployed at:", address(feeCollector));

        // Deploy CredentialAMM (using real USDC)
        credentialAMM = new CredentialAMM(
            address(tokenFactory),
            MAINNET_USDC
        );
        console.log("CredentialAMM deployed at:", address(credentialAMM));

        // Configure system
        tokenFactory.setFeeCollector(address(feeCollector));
        tokenFactory.setUSDCToken(MAINNET_USDC);

        // Set conservative fees for mainnet
        feeCollector.setGlobalFees(50, 25, 100); // 0.5%, 0.25%, 1%
        credentialAMM.setProtocolFeePercentage(300); // 3%

        vm.stopBroadcast();

        console.log("=== MAINNET DEPLOYMENT COMPLETE ===");
        console.log("CredentialTokenFactory:", address(tokenFactory));
        console.log("FeeCollector:", address(feeCollector));
        console.log("CredentialAMM:", address(credentialAMM));
        console.log("USDC Token:", MAINNET_USDC);
    }
}

/**
 * @title TestDeployment
 * @dev Test script to verify deployment works correctly
 */
contract TestDeployment is Script {
    function run() external {
        // This should be run after deployment to test the system
        address factoryAddr = vm.envAddress("FACTORY_ADDRESS");
        address feeCollectorAddr = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        address ammAddr = vm.envAddress("AMM_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");

        CredentialTokenFactory factory = CredentialTokenFactory(factoryAddr);
        FeeCollector feeCollector = FeeCollector(feeCollectorAddr);
        CredentialAMM amm = CredentialAMM(ammAddr);
        MockUSDC usdc = MockUSDC(usdcAddr);

        vm.startBroadcast();

        // Test 1: Create a credential token
        bytes32 testCredentialId = keccak256("TEST_CREDENTIAL");

        // Mint USDC for testing
        usdc.freeMint(msg.sender, 1000 * 10**6); // 1000 USDC
        usdc.approve(feeCollectorAddr, type(uint256).max);

        // Create token (should collect minting fee)
        address tokenAddr = factory.createToken(
            testCredentialId,
            "Test Credential Token",
            "TCT",
            10 * 10**18, // 10 tokens per day
            1000000 * 10**18 // 1M max supply
        );

        console.log("Test token created at:", tokenAddr);

        // Test 2: Check fee collection
        IFeeCollector.RevenuePool memory pool = feeCollector.getRevenuePool(testCredentialId);
        console.log("Fees collected:", pool.totalCollected);

        // Test 3: Create AMM pool
        CredentialToken token = CredentialToken(tokenAddr);
        token.mint(msg.sender, 1000 * 10**18); // Mint some tokens

        token.approve(ammAddr, type(uint256).max);
        usdc.approve(ammAddr, type(uint256).max);

        uint256 liquidityMinted = amm.createPool(
            testCredentialId,
            tokenAddr,
            100 * 10**18, // 100 tokens
            100 * 10**6   // 100 USDC
        );

        console.log("AMM pool created, liquidity minted:", liquidityMinted);

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT TEST SUCCESSFUL ===");
    }
}