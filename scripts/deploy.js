const hre = require("hardhat");

async function main() {
  console.log("Deploying WasteVan contracts...");

  // Deploy WasteVanToken first
  const WasteVanToken = await hre.ethers.getContractFactory("WasteVanToken");
  const wasteVanToken = await WasteVanToken.deploy();
  await wasteVanToken.waitForDeployment();

  const tokenAddress = await wasteVanToken.getAddress();
  console.log("WasteVanToken deployed to:", tokenAddress);

  // Then deploy WasteVan with the token address
  const WasteVan = await hre.ethers.getContractFactory("WasteVan");
  const wasteVan = await WasteVan.deploy(tokenAddress);
  await wasteVan.waitForDeployment();

  const wasteVanAddress = await wasteVan.getAddress();
  console.log("WasteVan deployed to:", wasteVanAddress);

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
