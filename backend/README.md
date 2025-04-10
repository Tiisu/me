# WasteVan Backend

This is the backend server for the WasteVan application, built with Express.js and MongoDB.

## Features

- User authentication and management
- Waste report creation and tracking
- Agent management and approval
- Integration with WasteVan smart contracts
- QR code generation for waste reports
- Geospatial queries for nearby waste reports

## Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Ethereum wallet with Sepolia testnet ETH (for blockchain interactions)

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wastevandapp
JWT_SECRET=your_jwt_secret_key_here
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_api_key
WASTE_VAN_ADDRESS=0xeE1399577B2aB84F696f2C28b4158968CF6640aC
WASTE_VAN_TOKEN_ADDRESS=0xaa1326432FA95521a1a5d2e44604554551b15092
ADMIN_PRIVATE_KEY=your_admin_private_key_for_blockchain_interactions
```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/connect-wallet` - Connect wallet to user account
- `POST /api/auth/verify-wallet` - Verify wallet ownership

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/token-balance` - Get user token balance
- `GET /api/users/waste-reports` - Get user waste reports
- `GET /api/users/statistics` - Get user statistics

### Waste Management

- `POST /api/waste/report` - Report waste collection
- `GET /api/waste/reports` - Get waste reports
- `GET /api/waste/reports/:id` - Get waste report by ID
- `GET /api/waste/qrcode/:hash` - Get QR code for a waste report
- `POST /api/waste/collect/:id` - Collect waste (agent only)
- `POST /api/waste/process/:id` - Process waste (agent only)
- `GET /api/waste/nearby` - Get nearby waste reports (agent only)

### Agents

- `GET /api/agents/profile` - Get agent profile
- `PUT /api/agents/profile` - Update agent profile
- `GET /api/agents/statistics` - Get agent statistics
- `POST /api/agents/service-area` - Add service area
- `DELETE /api/agents/service-area/:id` - Remove service area
- `POST /api/agents/register` - Register as an agent
- `POST /api/agents/upload-documents` - Upload verification documents
- `GET /api/agents/pending` - Get pending agents (admin only)
- `PUT /api/agents/:id/approve` - Approve agent (admin only)
- `PUT /api/agents/:id/reject` - Reject agent (admin only)
- `GET /api/agents/all` - Get all agents (admin only)

## Blockchain Integration

The backend integrates with the WasteVan smart contracts deployed on the Ethereum Sepolia testnet. It provides a bridge between the traditional web application and the blockchain, allowing users to:

- Register on the blockchain
- Report waste collections
- Collect and process waste
- Track token balances and rewards

## Database Models

- **User**: Stores user information and authentication details
- **WasteReport**: Tracks waste collection reports and their lifecycle
- **Agent**: Manages agent profiles, verification, and statistics

## Security

- JWT authentication for API endpoints
- Password hashing with bcrypt
- Role-based access control
- Middleware for protecting routes
