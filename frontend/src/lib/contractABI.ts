export const CODED_COMPLIANCE_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [
      { internalType: "string", name: "_documentReference", type: "string" },
      { internalType: "string", name: "_fullName", type: "string" },
      { internalType: "bytes32", name: "_countryCode", type: "bytes32" },
      { internalType: "bytes32", name: "_yearOfBirth", type: "bytes32" },
      { internalType: "bytes", name: "validationProof", type: "bytes" }
    ],
    name: "registerCompliance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "approveRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "declineRecord",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "queryRecordState",
    outputs: [
      { internalType: "uint8", name: "", type: "uint8" },
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "retrieveName",
    outputs: [
      { internalType: "string", name: "", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "checkApprovalStatus",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "participant", type: "address" }
    ],
    name: "recordExists",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "countUnverifiedRecords",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "fetchAllParticipants",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "participant", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "ComplianceRecordCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "participant", type: "address" },
      { indexed: false, internalType: "uint8", name: "previousState", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "updatedState", type: "uint8" }
    ],
    name: "StateTransition",
    type: "event"
  }
] as const;

// CodedComplianceGrid 合约地址 (Sepolia)
export const CONTRACT_ADDRESS = "0x889Ef1BDe022A309606012f721A76801Eb973001";
