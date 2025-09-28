// Deploy script for PassiveTokenGenerator
const hre = require("hardhat");

async function main() {
  console.log("Deploying PassiveTokenGenerator system...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get the factory address (should already be deployed)
  // Replace with actual deployed factory address
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("Please set FACTORY_ADDRESS environment variable");
    process.exit(1);
  }

  console.log("Using Factory address:", FACTORY_ADDRESS);

  // Deploy PassiveTokenGenerator
  const PassiveTokenGenerator = await hre.ethers.getContractFactory("PassiveTokenGenerator");
  const generator = await PassiveTokenGenerator.deploy(FACTORY_ADDRESS);
  await generator.deployed();

  console.log("PassiveTokenGenerator deployed to:", generator.address);

  // Get factory contract instance
  const Factory = await hre.ethers.getContractAt("CredentialTokenFactory", FACTORY_ADDRESS);

  // Set the generator as the passive token generator in factory
  console.log("Setting PassiveTokenGenerator in Factory...");
  const tx = await Factory.setPassiveTokenGenerator(generator.address);
  await tx.wait();

  console.log("PassiveTokenGenerator set in Factory");

  // Configure initial emission parameters (optional)
  console.log("\nConfiguring initial parameters...");

  // Set base emission rate (10 tokens per day)
  const baseRate = hre.ethers.utils.parseEther("10");
  await generator.setBaseEmissionRate(baseRate);
  console.log("Base emission rate set to:", hre.ethers.utils.formatEther(baseRate), "tokens/day");

  // Set anti-inflation factor (1.0x = 10000 basis points)
  await generator.setAntiInflationFactor(10000);
  console.log("Anti-inflation factor set to: 1.0x");

  // Set some initial credential type multipliers
  const credentialTypes = [
    { name: "HIGH_SCHOOL", multiplier: 100 },      // 1.0x
    { name: "BACHELORS", multiplier: 150 },        // 1.5x
    { name: "MASTERS", multiplier: 200 },          // 2.0x
    { name: "PHD", multiplier: 300 },              // 3.0x
    { name: "BASIC_CERT", multiplier: 120 },       // 1.2x
    { name: "ADVANCED_CERT", multiplier: 180 },    // 1.8x
    { name: "EXPERT_CERT", multiplier: 250 },      // 2.5x
    { name: "LEADER_CERT", multiplier: 400 },      // 4.0x
  ];

  for (const credType of credentialTypes) {
    const credId = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(credType.name));
    await generator.setEmissionMultiplier(credId, credType.multiplier);
    console.log(`Set multiplier for ${credType.name}: ${credType.multiplier / 100}x`);
  }

  console.log("\n=== Deployment Complete ===");
  console.log("PassiveTokenGenerator:", generator.address);
  console.log("Factory:", FACTORY_ADDRESS);

  // Verify on Etherscan (if not on localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nVerifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: generator.address,
        constructorArguments: [FACTORY_ADDRESS],
      });
      console.log("PassiveTokenGenerator verified on Etherscan");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PassiveTokenGenerator: generator.address,
      CredentialTokenFactory: FACTORY_ADDRESS,
    },
  };

  fs.writeFileSync(
    `deployments/generator-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to deployments/generator-" + hre.network.name + ".json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });