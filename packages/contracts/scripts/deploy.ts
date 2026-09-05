import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying TitleChain contracts...");
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── Deploy PropertyRegistry ──────────────────────────────────────────────
  console.log("\n[1/3] Deploying PropertyRegistry...");
  const PropertyRegistryFactory = await ethers.getContractFactory(
    "PropertyRegistry"
  );
  const propertyRegistry = await PropertyRegistryFactory.deploy(
    deployer.address
  );
  await propertyRegistry.waitForDeployment();
  const propertyRegistryAddress = await propertyRegistry.getAddress();
  console.log("   PropertyRegistry deployed to:", propertyRegistryAddress);

  // ── Deploy EscrowManager ─────────────────────────────────────────────────
  console.log("\n[2/3] Deploying EscrowManager...");
  const EscrowManagerFactory = await ethers.getContractFactory("EscrowManager");
  const escrowManager = await EscrowManagerFactory.deploy(deployer.address);
  await escrowManager.waitForDeployment();
  const escrowManagerAddress = await escrowManager.getAddress();
  console.log("   EscrowManager deployed to:", escrowManagerAddress);

  // ── Deploy IdentityRegistry ──────────────────────────────────────────────
  console.log("\n[3/3] Deploying IdentityRegistry...");
  const IdentityRegistryFactory = await ethers.getContractFactory(
    "IdentityRegistry"
  );
  const identityRegistry = await IdentityRegistryFactory.deploy(
    deployer.address
  );
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("   IdentityRegistry deployed to:", identityRegistryAddress);

  // ── Write deployment addresses to file ──────────────────────────────────
  const network = await ethers.provider.getNetwork();
  const deploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PropertyRegistry: propertyRegistryAddress,
      EscrowManager: escrowManagerAddress,
      IdentityRegistry: identityRegistryAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${network.chainId}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log("\nDeployment complete!");
  console.log("Addresses written to:", deploymentFile);
  console.log("\nContract addresses:");
  console.log("  PropertyRegistry:", propertyRegistryAddress);
  console.log("  EscrowManager:   ", escrowManagerAddress);
  console.log("  IdentityRegistry:", identityRegistryAddress);

  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
