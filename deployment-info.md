# WasteVan Deployment Information

## Sepolia Testnet Deployment

### Deployment Date
- Date: May 28, 2024

### Contract Addresses
- WasteVanToken: `0xaa1326432FA95521a1a5d2e44604554551b15092`
- WasteVan: `0xeE1399577B2aB84F696f2C28b4158968CF6640aC`

### Network Information
- Network: Ethereum Sepolia Testnet
- Chain ID: 11155111
- RPC URL: https://eth-sepolia.g.alchemy.com/v2/[YOUR_API_KEY]

### Deployer Account
- Address: The account associated with the private key in your .env file

## Contract Verification

### Getting an Etherscan API Key
1. Create an account on [Etherscan](https://etherscan.io/)
2. Go to your profile and navigate to the API Keys section
3. Create a new API key
4. Add the API key to your .env file:
   ```
   ETHERSCAN_API_KEY='YOUR_ETHERSCAN_API_KEY'
   ```

### Verifying Contracts
After adding your Etherscan API key to the .env file, you can verify the contracts using the following commands:

```bash
# Verify WasteVanToken
npx hardhat verify --network ethereumSepolia 0xaa1326432FA95521a1a5d2e44604554551b15092

# Verify WasteVan
npx hardhat verify --network ethereumSepolia 0xeE1399577B2aB84F696f2C28b4158968CF6640aC 0xaa1326432FA95521a1a5d2e44604554551b15092
```

## Interacting with the Contracts
You can interact with the deployed contracts using:
1. Etherscan's "Write Contract" functionality
2. A web3 library like ethers.js or web3.js
3. The WasteVan frontend application (when available)

## Important Functions

### WasteVanToken
- `mint(address to, uint256 amount)`: Mint new tokens (only owner)

### WasteVan
- `registerUser()`: Register as a regular user
- `registerAgent()`: Register as an agent (requires ETH)
- `updateAgentStatus(address agentAddress, AgentStatus status)`: Approve or reject agent (only owner)
- `reportWaste(PlasticType plasticType, uint256 quantityInGrams, string calldata qrCodeHash)`: Report waste collection
- `collectWaste(string calldata qrCodeHash)`: Agent collects waste
- `processWaste(uint256 reportId)`: Mark waste as processed
