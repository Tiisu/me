import WasteVanABI from './WasteVan.json';
import WasteVanTokenABI from './WasteVanToken.json';

// Sepolia testnet deployed contract addresses
export const WASTE_VAN_ADDRESS = '0xeE1399577B2aB84F696f2C28b4158968CF6640aC';
export const WASTE_VAN_TOKEN_ADDRESS = '0xaa1326432FA95521a1a5d2e44604554551b15092';

export const WASTE_VAN_ABI = WasteVanABI.abi;
export const WASTE_VAN_TOKEN_ABI = WasteVanTokenABI.abi;

// Enum values from the contract
export const UserType = {
  Regular: 0,
  Agent: 1
};

export const AgentStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2
};

export const WasteStatus = {
  Reported: 0,
  Collected: 1,
  Processed: 2
};

export const PlasticType = {
  PET: 0,
  HDPE: 1,
  PVC: 2,
  LDPE: 3,
  PP: 4,
  PS: 5,
  Other: 6
};