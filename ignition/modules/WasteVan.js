const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("WasteVanModule", (m) => {
  // First deploy the WasteVanToken contract
  const wasteVanToken = m.contract("WasteVanToken", []);

  // Then deploy the WasteVan contract with the token address
  const wasteVan = m.contract("WasteVan", [wasteVanToken]);

  return { wasteVanToken, wasteVan };
});