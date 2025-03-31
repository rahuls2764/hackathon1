# CrossChain Crowdfunding

## Description
CrossChain Crowdfunding is a decentralized platform that allows users to create and contribute to fundraising campaigns using any blockchain network. The unique feature of this platform is its ability to accept donations from multiple chains through a single smart contract, making crowdfunding more accessible and flexible for both campaign creators and donors.

## Technologies Used
- **Frontend**: React with Vite.js
- **Smart Contracts**: Solidity
- **Cross-Chain Functionality**: LayerZero Protocol
- **Deployment Network**: Ethereum

## Features
- **Cross-Chain Donations**: Accept contributions from various blockchain networks
- **Campaign Creation**: Users can create their own fundraising campaigns
- **Single Contract Architecture**: All functionality managed through a unified smart contract
- **User-Friendly Interface**: Easy-to-use UI built with React
- **Real-Time Updates**: Track campaign progress and contributions in real-time

## Installation

### Prerequisites
- Node.js (v14.0.0 or higher)
- npm or yarn
- MetaMask or other Web3 wallet

### Setup
```bash
# Clone the repository
git clone https://github.com/rahuls2764/hackathon1.git
cd hackathon1

# Install dependencies
npm install
# or
yarn install

# Start the development server
npm run dev
# or
yarn dev
```

## Smart Contract Deployment
```bash
# Navigate to the contracts directory
cd contracts

# Compile contracts
npx hardhat compile

# Deploy to Ethereum network
npx hardhat run scripts/deploy.js --network ethereum
```

## Usage

### Creating a Campaign
1. Connect your Web3 wallet
2. Click on "Create Campaign"
3. Fill in the campaign details:
   - Title
   - Description
   - Funding goal
   - Campaign duration
4. Submit and sign the transaction

### Making a Donation
1. Browse available campaigns
2. Select a campaign to support
3. Choose your preferred blockchain network for donation
4. Enter the amount to donate
5. Confirm the transaction in your wallet

## Architecture
The platform uses LayerZero's cross-chain messaging protocol to facilitate donations from different blockchain networks:

1. User initiates a donation from Chain A
2. The transaction is relayed through LayerZero
3. The main smart contract on Ethereum receives and processes the donation
4. Campaign funds are updated and visible to all users

## Configuration
Create a `.env` file in the root directory with the following variables:
```
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_INFURA_ID=your_infura_id
VITE_SUPPORTED_CHAINS=chain1,chain2,chain3
VITE_LAYERZERO_ENDPOINT=your_layerzero_endpoint
```

## Contributing
We welcome contributions to the CrossChain Crowdfunding platform!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Contact
Rahul - sonirahul2764@gmail.com

Project Link: [https://github.com/rahuls2764/hackathon1](https://github.com/rahuls2764/hackathon1)
