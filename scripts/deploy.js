const hre = require("hardhat");

async function main() {
  console.log("Deploying CodedComplianceGrid contract...");

  const CodedComplianceGrid = await hre.ethers.getContractFactory("CodedComplianceGrid");
  const contract = await CodedComplianceGrid.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ CodedComplianceGrid deployed to:", contractAddress);
  console.log("\nUpdate the frontend CONTRACT_ADDRESS in:");
  console.log("  frontend/src/lib/contractABI.ts");
  console.log("\nVerify contract with:");
  console.log(`  npx hardhat verify --network sepolia ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
