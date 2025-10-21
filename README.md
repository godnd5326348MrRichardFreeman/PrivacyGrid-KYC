# PrivacyGrid KYC

> **Privacy-Preserving Identity Verification powered by Zama FHE Technology**

PrivacyGrid KYC is an innovative blockchain-based identity verification platform that leverages Fully Homomorphic Encryption (FHE) to enable privacy-preserving KYC processes. Built on Zama's fhEVM technology, the platform allows sensitive user data to remain encrypted throughout the entire verification lifecycle - from submission to storage and computation on-chain.

The platform addresses a critical challenge in decentralized identity systems: how to verify user credentials without exposing personal information to validators, smart contracts, or even the blockchain itself. By utilizing FHE, PrivacyGrid KYC enables computations on encrypted data, ensuring that sensitive information such as country codes and birth years never exist in plaintext on-chain.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://privacygrid-kyc.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Sepolia](https://img.shields.io/badge/network-sepolia-orange)](https://sepolia.etherscan.io/)

## 🎯 Project Status: Demo & Educational Purpose

**⚠️ IMPORTANT NOTICE**

This project is currently in the **demonstration phase** and serves as an **educational showcase** of Zama's FHE technology applied to identity verification scenarios.

### Current Limitations

- **No Real Identity Verification**: This platform does NOT perform actual identity verification or KYC compliance checks
- **Functional Validation Only**: The system demonstrates FHE encryption capabilities without validating the authenticity of submitted information
- **Legal & Compliance Constraints**: Due to regional regulatory requirements and legal compliance considerations, real identity verification features are not implemented
- **Development Scope**: Limited by development timeline and resource constraints for this demonstration phase

### Future Roadmap

The next phases of development will consider:
- Integration with real identity verification services
- Compliance with regional KYC/AML regulations (GDPR, CCPA, etc.)
- Enhanced data collection and verification workflows
- Partnership with licensed identity verification providers
- Security audits and penetration testing

**Use this project for educational purposes, technical demonstrations, and understanding FHE technology applications only.**

---

## 🌟 Features

- **🔐 FHE Encryption**: Country code and birth year encrypted using Zama's fully homomorphic encryption
- **⚡ Web3 Integration**: Seamless wallet connection via RainbowKit
- **🎨 Modern UI**: Clean, responsive interface built with React + TypeScript + Tailwind CSS
- **📱 Mobile-Friendly**: Fully responsive design for all devices
- **🔗 On-Chain Storage**: Encrypted data stored on Sepolia testnet
- **🎥 Video Demo**: Interactive demonstration walkthrough

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend│
│   (Vite + TS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  FHE Encryption │◄────►│  Zama fhEVM SDK  │
│  (Client-side)  │      │  (v0.2.0)        │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Smart Contract  │◄────►│  Sepolia Testnet │
│ (Solidity 0.8.24)│      │  (Ethereum)      │
└─────────────────┘      └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH (for transactions)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/godnd5326348MrRichardFreeman/PrivacyGrid-KYC.git
cd PrivacyGrid-KYC
```

2. **Install dependencies**
```bash
# Install root dependencies (Hardhat)
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. **Configure environment**
```bash
# Create .env file in root directory
cp .env.example .env

# Add your configuration
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

4. **Run development server**
```bash
# From root directory
npm run dev

# Or from frontend directory
cd frontend
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📁 Project Structure

```
PrivacyGrid-KYC/
├── contracts/                    # Solidity smart contracts
│   └── CodedComplianceGrid.sol  # Main KYC contract with FHE
├── scripts/                      # Deployment scripts
│   └── deploy.js                # Contract deployment script
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks (useKYC)
│   │   ├── lib/                 # Utilities (FHE, contracts)
│   │   └── config/              # Configuration (wagmi, etc.)
│   └── public/
│       ├── demo-video.mp4       # Demo walkthrough video
│       └── *.wasm               # FHE SDK files
├── hardhat.config.js            # Hardhat configuration
└── package.json                 # Project dependencies
```

## 🔧 Smart Contract

### Deployment

The contract is deployed on Sepolia testnet:

**Contract Address**: `0x889Ef1BDe022A309606012f721A76801Eb973001`

[View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x889Ef1BDe022A309606012f721A76801Eb973001)

### Key Functions

```solidity
// Submit KYC data (encrypted)
function registerCompliance(
    string calldata _documentReference,
    string calldata _fullName,
    externalEuint32 _countryCode,      // FHE encrypted
    externalEuint32 _yearOfBirth,      // FHE encrypted
    bytes calldata validationProof
) external

// Check verification status
function queryRecordState(address participant)
    external view returns (VerificationState, uint256)

// Administrator functions
function approveRecord(address participant) external
function declineRecord(address participant) external
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui
- **Web3**:
  - wagmi v2 (React hooks for Ethereum)
  - RainbowKit (wallet connection)
  - ethers.js v6 (blockchain interaction)
- **FHE**: @zama-fhe/relayer-sdk v0.2.0

### Smart Contracts
- **Language**: Solidity 0.8.24
- **Framework**: Hardhat 2.22
- **FHE Library**: @fhevm/solidity v0.8.0
- **Network**: Sepolia Testnet

### Deployment
- **Frontend**: Vercel
- **Blockchain**: Sepolia Ethereum Testnet

## 🔐 FHE Implementation

This project demonstrates Zama's Fully Homomorphic Encryption for privacy-preserving data storage:

### Client-Side Encryption

```typescript
// Encrypt multiple values with shared proof
const encrypted = await encryptMultipleUint32(
  [countryCode, birthYear],
  contractAddress,
  userAddress
);

// Submit to blockchain
await contract.registerCompliance(
  documentHash,
  fullName,
  encrypted.handles[0],  // Encrypted country code
  encrypted.handles[1],  // Encrypted birth year
  encrypted.signature    // Shared proof
);
```

### Smart Contract Processing

```solidity
// Import encrypted data
euint32 encryptedCountry = FHE.fromExternal(_countryCode, validationProof);
euint32 encryptedYear = FHE.fromExternal(_yearOfBirth, validationProof);

// Set access control
FHE.allowThis(encryptedCountry);
FHE.allow(encryptedCountry, administrator);
FHE.allow(encryptedCountry, msg.sender);
```

## 📖 Usage Guide

1. **Connect Wallet**: Click "Connect Wallet" and select your Web3 wallet
2. **Start KYC**: Click "Start KYC Verification" button
3. **Enter Data**: Fill in demonstration data:
   - Full Name (stored as plain text)
   - Country (encrypted with FHE)
   - Birth Year (encrypted with FHE)
4. **Submit**: Click "Submit KYC" to encrypt and store data on-chain
5. **Confirmation**: Wait for transaction confirmation on Sepolia

## 🎥 Demo Video

A complete walkthrough video is available on the website's "How It Works" section, demonstrating:
- Wallet connection process
- KYC form submission
- FHE encryption in action
- On-chain transaction confirmation

## 🧪 Development Commands

```bash
# Compile smart contracts
npm run compile

# Deploy to Sepolia
npm run deploy

# Run tests
npm run test

# Start frontend dev server
npm run dev

# Build frontend for production
cd frontend && npm run build

# Verify contract on Etherscan
npm run verify
```

## 🌐 Live Demo

Visit the live demonstration: **[https://privacygrid-kyc.vercel.app](https://privacygrid-kyc.vercel.app)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**FOR DEMONSTRATION AND EDUCATIONAL PURPOSES ONLY**

This software is provided as a technical demonstration of FHE technology and should NOT be used for:
- Real identity verification
- Production KYC/AML compliance
- Handling actual personal identifiable information (PII)
- Regulatory compliance purposes

Users and developers assume all responsibility for compliance with applicable laws and regulations in their jurisdiction.

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) - For FHE technology and fhEVM
- [RainbowKit](https://www.rainbowkit.com/) - For wallet connection UI
- [shadcn/ui](https://ui.shadcn.com/) - For UI components

## 📞 Contact

- **Project**: PrivacyGrid KYC
- **GitHub**: [https://github.com/godnd5326348MrRichardFreeman/PrivacyGrid-KYC](https://github.com/godnd5326348MrRichardFreeman/PrivacyGrid-KYC)
- **Live Demo**: [https://privacygrid-kyc.vercel.app](https://privacygrid-kyc.vercel.app)

---

**Built with ❤️ using Zama FHE Technology**
