# PrivacyGrid KYC

> **Privacy-Preserving Identity Verification Protocol powered by Zama fhEVM**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://privacygrid-kyc.vercel.app)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636)](https://soliditylang.org/)
[![fhEVM](https://img.shields.io/badge/fhEVM-0.9.1-blue)](https://docs.zama.ai/fhevm)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Sepolia](https://img.shields.io/badge/network-Sepolia-orange)](https://sepolia.etherscan.io/address/0x39b22fe394eaf8ded37ec288e92814F692Df067d)

## Overview

PrivacyGrid KYC is a next-generation decentralized identity verification protocol that leverages **Fully Homomorphic Encryption (FHE)** to enable privacy-preserving KYC processes on-chain. Built on Zama's fhEVM v0.9.1, the platform ensures sensitive user data remains encrypted throughout the entire verification lifecycle—from client-side encryption to on-chain storage and computation.

### The Privacy Challenge

Traditional KYC systems require users to expose sensitive personal information to validators, centralized databases, and smart contracts. This creates significant privacy risks:

- **Data Exposure**: Personal data visible to validators and contract administrators
- **On-chain Transparency**: Blockchain's inherent transparency conflicts with privacy requirements
- **Centralization Risk**: Aggregated PII becomes high-value attack targets

### The FHE Solution

PrivacyGrid KYC solves this by utilizing **Fully Homomorphic Encryption**, allowing:

- **Encrypted Computation**: Operations performed directly on encrypted data
- **Zero Knowledge Storage**: Sensitive fields never exist in plaintext on-chain
- **Granular Access Control**: Cryptographic permissions determine who can decrypt
- **Verifiable Compliance**: Prove regulatory compliance without data exposure

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  React 18 + TS  │───►│  Zama Relayer   │───►│  Wallet Provider │          │
│  │  (Vite 5.4)     │    │  SDK 0.3.0-5    │    │  (RainbowKit)    │          │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘          │
│                                  │                                           │
│                    ┌─────────────▼─────────────┐                            │
│                    │   FHE Input Encryption    │                            │
│                    │   - createEncryptedInput  │                            │
│                    │   - add32() for euint32   │                            │
│                    │   - encrypt() → handles   │                            │
│                    └─────────────┬─────────────┘                            │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           BLOCKCHAIN LAYER                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                    CodedComplianceGrid.sol                         │      │
│  │                    (Solidity 0.8.27 + fhEVM 0.9.1)                │      │
│  ├───────────────────────────────────────────────────────────────────┤      │
│  │  Storage:                                                          │      │
│  │  ├─ mapping(address => ComplianceRecord) complianceData           │      │
│  │  │    ├─ documentReference: string                                │      │
│  │  │    ├─ fullName: string                                         │      │
│  │  │    ├─ countryCode: euint32  ◄── FHE Encrypted                 │      │
│  │  │    ├─ yearOfBirth: euint32  ◄── FHE Encrypted                 │      │
│  │  │    ├─ currentState: VerificationState                          │      │
│  │  │    └─ submissionTime: uint256                                  │      │
│  │  └─ address[] participantRegistry                                 │      │
│  ├───────────────────────────────────────────────────────────────────┤      │
│  │  FHE Operations:                                                   │      │
│  │  ├─ FHE.fromExternal() → Convert encrypted input to euint32      │      │
│  │  ├─ FHE.allowThis()    → Grant contract read permission          │      │
│  │  └─ FHE.allow()        → Grant user/admin read permission        │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                   │                                          │
│  ┌────────────────────────────────▼──────────────────────────────────┐      │
│  │                    Zama Gateway / KMS                              │      │
│  │  - Threshold decryption network                                    │      │
│  │  - Access Control List (ACL) management                           │      │
│  │  - Cryptographic key management                                    │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Specification

### Contract: `CodedComplianceGrid.sol`

**Deployed Address (Sepolia)**: [`0x39b22fe394eaf8ded37ec288e92814F692Df067d`](https://sepolia.etherscan.io/address/0x39b22fe394eaf8ded37ec288e92814F692Df067d)

#### Inheritance

```solidity
contract CodedComplianceGrid is ZamaEthereumConfig
```

The contract inherits from `ZamaEthereumConfig` which provides:
- Pre-configured FHE library addresses
- Gateway/KMS integration for Ethereum Sepolia
- Standardized ACL management

#### Data Structures

```solidity
enum VerificationState {
    Unverified,  // 0 - Initial state after registration
    Approved,    // 1 - Administrator approved
    Declined     // 2 - Administrator rejected
}

struct ComplianceRecord {
    string documentReference;      // Document ID (plaintext)
    string fullName;              // User name (plaintext)
    euint32 countryCode;          // ISO 3166-1 numeric (FHE encrypted)
    euint32 yearOfBirth;          // Birth year (FHE encrypted)
    VerificationState currentState;
    uint256 submissionTime;
    bool isActive;
}
```

#### Core Functions

| Function | Access | Description |
|----------|--------|-------------|
| `registerCompliance()` | Public | Submit encrypted KYC data |
| `approveRecord()` | Admin | Approve a pending record |
| `declineRecord()` | Admin | Decline a pending record |
| `queryRecordState()` | Public | Get verification status |
| `checkApprovalStatus()` | Public | Boolean approval check |
| `retrieveFullRecord()` | Public | Get complete record with encrypted handles |
| `countUnverifiedRecords()` | Admin | Count pending verifications |
| `fetchAllParticipants()` | Admin | List all registered addresses |
| `updateAdministrator()` | Admin | Transfer admin privileges |

#### FHE Integration Details

```solidity
function registerCompliance(
    string calldata _documentReference,
    string calldata _fullName,
    externalEuint32 _countryCode,    // Encrypted handle from client
    externalEuint32 _yearOfBirth,    // Encrypted handle from client
    bytes calldata validationProof    // ZK proof for both values
) external {
    // Convert external encrypted inputs to internal euint32
    euint32 encryptedCountry = FHE.fromExternal(_countryCode, validationProof);
    euint32 encryptedYear = FHE.fromExternal(_yearOfBirth, validationProof);

    // Store encrypted values
    complianceData[msg.sender] = ComplianceRecord({
        countryCode: encryptedCountry,
        yearOfBirth: encryptedYear,
        // ...
    });

    // Set FHE Access Control
    FHE.allowThis(encryptedCountry);          // Contract can read
    FHE.allow(encryptedCountry, administrator); // Admin can decrypt
    FHE.allow(encryptedCountry, msg.sender);    // User can decrypt own data
}
```

#### Events

```solidity
event ComplianceRecordCreated(address indexed participant, uint256 timestamp);
event StateTransition(address indexed participant, VerificationState previousState, VerificationState updatedState);
event AdministratorChanged(address indexed formerAdmin, address indexed currentAdmin);
```

---

## Dependency Versions

### Smart Contract Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@fhevm/solidity` | ^0.9.1 | FHE types and operations |
| `@openzeppelin/contracts` | ^5.0.2 | Security utilities |
| `hardhat` | ^2.26.3 | Development framework |
| `@fhevm/hardhat-plugin` | 0.3.0-1 | FHE testing support |
| `@fhevm/mock-utils` | 0.3.0-1 | Mock FHE for testing |
| `@zama-fhe/relayer-sdk` | 0.3.0-5 | Client SDK integration |

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `vite` | ^5.4.19 | Build tool |
| `typescript` | ^5.8.3 | Type safety |
| `ethers` | ^6.15.0 | Ethereum interaction |
| `wagmi` | ^2.18.1 | React hooks for Ethereum |
| `viem` | ^2.38.3 | TypeScript Ethereum library |
| `@rainbow-me/rainbowkit` | ^2.2.9 | Wallet connection UI |
| `@tanstack/react-query` | ^5.90.5 | Async state management |
| `tailwindcss` | ^3.4.17 | Styling |
| `sonner` | ^1.7.4 | Toast notifications |

### Compiler Configuration

```javascript
// hardhat.config.js
solidity: {
  version: "0.8.27",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: "cancun",
    viaIR: true,  // Required for FHE contracts
  },
}
```

---

## Project Structure

```
PrivacyGridKYC/
├── contracts/
│   └── CodedComplianceGrid.sol    # Main FHE KYC contract
├── scripts/
│   └── deploy.js                   # Deployment script
├── test/
│   ├── CodedComplianceGrid.test.js # Core functionality tests
│   ├── FHEOperations.test.js       # FHE-specific tests
│   └── Integration.test.js         # End-to-end tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx          # Navigation header
│   │   │   ├── Hero.tsx            # Landing section
│   │   │   ├── KYCForm.tsx         # KYC submission form
│   │   │   ├── Features.tsx        # Feature showcase
│   │   │   └── HowItWorks.tsx      # Tutorial section
│   │   ├── hooks/
│   │   │   └── useKYC.tsx          # KYC submission hook
│   │   ├── lib/
│   │   │   ├── fhe.ts              # FHE SDK wrapper
│   │   │   ├── contractABI.ts      # Contract ABI & address
│   │   │   └── utils.ts            # Utility functions
│   │   └── config/
│   │       └── wagmi.ts            # Wallet configuration
│   ├── index.html                   # Entry HTML with FHE SDK
│   └── package.json
├── hardhat.config.js
├── package.json
└── README.md
```

---

## FHE Implementation Guide

### Client-Side Encryption Flow

```typescript
// frontend/src/lib/fhe.ts

// 1. Initialize FHE SDK (loaded via CDN)
export const initializeFHE = async (provider?: any) => {
  const sdk = window.RelayerSDK;
  const { initSDK, createInstance, SepoliaConfig } = sdk;

  await initSDK();
  const config = { ...SepoliaConfig, network: provider };
  fheInstance = await createInstance(config);
  return fheInstance;
};

// 2. Encrypt KYC Data
export const encryptKYCData = async (
  countryCode: number,
  birthYear: number,
  userAddress: Address
) => {
  const instance = await getInstance();
  const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);

  // Add multiple euint32 values to single input
  input.add32(countryCode);
  input.add32(birthYear);

  // Generate encrypted handles and proof
  const { handles, inputProof } = await input.encrypt();

  return {
    countryHandle: bytesToHex(handles[0]),
    birthYearHandle: bytesToHex(handles[1]),
    proof: bytesToHex(inputProof),
  };
};
```

### Transaction Flow with Toast Notifications

```typescript
// frontend/src/hooks/useKYC.tsx

const submitKYC = async (documentHash, fullName, countryCode, birthYear) => {
  // Step 1: Initialize FHE
  toast.info('Initializing encryption...');
  await initializeFHE();

  // Step 2: Encrypt sensitive data
  toast.info('Encrypting sensitive data...');
  const encrypted = await encryptKYCData(countryCode, birthYear, address);

  // Step 3: Submit transaction
  toast.info('Submitting KYC to blockchain...');
  const tx = await contract.registerCompliance(
    documentHash,
    fullName,
    encrypted.countryHandle,
    encrypted.birthYearHandle,
    encrypted.proof
  );

  // Step 4: Show pending with explorer link
  toast.info(
    <TxToast message="Waiting for confirmation..." hash={tx.hash} />,
    { duration: 10000 }
  );

  // Step 5: Wait and show result
  const receipt = await tx.wait();
  if (receipt.status === 1) {
    toast.success(<TxToast message="KYC submitted!" hash={tx.hash} />);
  } else {
    toast.error(<TxToast message="Transaction failed" hash={tx.hash} />);
  }
};
```

---

## Testing

### Test Suite Overview

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `CodedComplianceGrid.test.js` | 25 | Core functionality, access control, state transitions |
| `FHEOperations.test.js` | 15 | FHE encryption, proofs, permissions |
| `Integration.test.js` | 12 | End-to-end workflows, stress tests |

### Running Tests

```bash
# Run all tests with FHE mock
npx hardhat test

# Run specific test file
npx hardhat test test/CodedComplianceGrid.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Test Environment

Tests run in FHEVM mock mode using `@fhevm/hardhat-plugin`:

```javascript
// Test setup
beforeEach(async function () {
  if (!fhevm.isMock) {
    throw new Error("Tests require FHEVM mock environment");
  }
  await fhevm.initializeCLIApi();
  // ...
});

// Create encrypted test inputs
const encrypted = await fhevm
  .createEncryptedInput(contractAddress, userAddress)
  .add32(840n)  // Country code
  .add32(1990n) // Birth year
  .encrypt();
```

---

## Deployment

### Prerequisites

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Environment Variables

```bash
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

### Deploy Contract

```bash
# Compile
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Deploy Frontend

```bash
cd frontend
npm install
npm run build

# Deploy to Vercel
vercel --prod
```

---

## Security Considerations

### FHE Security Model

1. **Client-Side Encryption**: All sensitive data encrypted before transmission
2. **On-Chain Privacy**: Encrypted values (`euint32`) never decrypted on-chain
3. **Access Control**: Cryptographic ACL determines decryption permissions
4. **Threshold Decryption**: Zama Gateway requires multi-party cooperation

### Access Control

| Role | Permissions |
|------|-------------|
| User | Register own data, view own encrypted record, decrypt own values |
| Admin | Approve/decline records, view all participants, decrypt all records |
| Contract | Read encrypted values for internal operations |

### Best Practices Implemented

- Input validation before FHE operations
- Duplicate registration prevention
- State transition constraints
- Admin privilege restrictions
- Event logging for auditability

---

## Limitations & Future Work

### Current Limitations

- **Demo Purpose**: No real identity verification performed
- **Single Admin**: No multi-sig administrator support
- **No Decryption UI**: Encrypted values viewable but not decryptable in UI
- **Testnet Only**: Not audited for mainnet deployment

### Planned Enhancements

- [ ] Multi-signature administrator governance
- [ ] Integration with identity verification oracles
- [ ] Encrypted computation for age/region verification
- [ ] Cross-chain identity portability
- [ ] GDPR-compliant data deletion mechanisms

---

## Resources

### Documentation

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [fhEVM 0.9.1 Migration Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/migration)
- [Hardhat Documentation](https://hardhat.org/docs)

### Related Projects

- [Zama fhEVM](https://github.com/zama-ai/fhevm)
- [fhevm-react-template](https://github.com/zama-ai/fhevm-react-template)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

**FOR DEMONSTRATION AND EDUCATIONAL PURPOSES ONLY**

This software demonstrates FHE technology capabilities and should NOT be used for:
- Production identity verification
- Regulatory KYC/AML compliance
- Processing real personal identifiable information (PII)

Users assume all responsibility for compliance with applicable laws and regulations.

---

**Built with Zama FHE Technology**

