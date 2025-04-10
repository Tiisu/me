const hre = require("hardhat");

// Contract addresses from deployment
const WASTE_VAN_TOKEN_ADDRESS = "0xaa1326432FA95521a1a5d2e44604554551b15092";
const WASTE_VAN_ADDRESS = "0xeE1399577B2aB84F696f2C28b4158968CF6640aC";

async function main() {
  console.log("Interacting with WasteVan contracts...");

  // Get contract instances
  const wasteVanToken = await hre.ethers.getContractAt("WasteVanToken", WASTE_VAN_TOKEN_ADDRESS);
  const wasteVan = await hre.ethers.getContractAt("WasteVan", WASTE_VAN_ADDRESS);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address);

  // Get token name and symbol
  const name = await wasteVanToken.name();
  const symbol = await wasteVanToken.symbol();
  console.log(`Token: ${name} (${symbol})`);

  // Get token balance
  const balance = await wasteVanToken.balanceOf(signer.address);
  console.log(`Token balance: ${hre.ethers.formatEther(balance)} ${symbol}`);

  // Check if user is registered
  const user = await wasteVan.users(signer.address);
  if (user.isRegistered) {
    console.log("User is registered");
    console.log(`User ID: ${user.id}`);
    console.log(`User type: ${user.userType === 0 ? "Regular" : "Agent"}`);
    console.log(`Token balance in WasteVan: ${user.tokenBalance}`);
  } else {
    console.log("User is not registered");
    
    // Register as a user
    console.log("Registering as a user...");
    const tx = await wasteVan.registerUser();
    await tx.wait();
    console.log("User registered successfully!");
    
    // Check user details again
    const updatedUser = await wasteVan.users(signer.address);
    console.log(`User ID: ${updatedUser.id}`);
    console.log(`User type: ${updatedUser.userType === 0 ? "Regular" : "Agent"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
