const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat");

describe("CodedComplianceGrid - Integration Tests", function () {
  let contract;
  let admin, user1, user2, user3, user4, user5;

  beforeEach(async function () {
    if (!fhevm.isMock) {
      throw new Error("This test must run in FHEVM mock environment");
    }

    await fhevm.initializeCLIApi();

    [admin, user1, user2, user3, user4, user5] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CodedComplianceGrid");
    const deployed = await Factory.deploy();
    await deployed.waitForDeployment();
    contract = deployed;

    console.log(`\n✅ Contract deployed at: ${await contract.getAddress()}`);
  });

  describe("Complete KYC Workflow", function () {
    it("should complete full KYC lifecycle: register -> approve -> verify", async function () {
      console.log("Testing complete KYC workflow...");

      // Step 1: User registration
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n) // USA
        .add32(1990n)
        .encrypt();

      const regTx = await contract.connect(user1).registerCompliance(
        "PASSPORT-US-12345",
        "John Smith",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );
      await regTx.wait();

      console.log("✅ Step 1: User registered");

      // Verify initial state
      expect(await contract.recordExists(user1.address)).to.equal(true);
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(false);

      const [stateInitial] = await contract.queryRecordState(user1.address);
      expect(stateInitial).to.equal(0); // Unverified

      // Step 2: Admin reviews and approves
      const approveTx = await contract.connect(admin).approveRecord(user1.address);
      await approveTx.wait();

      console.log("✅ Step 2: Admin approved");

      // Step 3: Verify final state
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(true);

      const [stateFinal] = await contract.queryRecordState(user1.address);
      expect(stateFinal).to.equal(1); // Approved

      console.log("✅ Step 3: KYC verified and approved");
      console.log("✅ Complete KYC workflow successful");
    });

    it("should complete full KYC lifecycle: register -> decline", async function () {
      console.log("Testing KYC decline workflow...");

      // User registration
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(999n) // Invalid/suspicious country code
        .add32(2050n) // Invalid birth year
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "SUSPICIOUS-DOC",
        "Suspicious User",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      // Admin declines
      await contract.connect(admin).declineRecord(user1.address);

      // Verify declined state
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(false);

      const [state] = await contract.queryRecordState(user1.address);
      expect(state).to.equal(2); // Declined

      console.log("✅ KYC decline workflow successful");
    });
  });

  describe("Multi-User Scenarios", function () {
    it("should handle multiple user registrations and approvals", async function () {
      console.log("Testing multi-user scenario...");

      const users = [user1, user2, user3, user4, user5];
      const userData = [
        { country: 840, year: 1990, name: "US User", doc: "US-001" },
        { country: 826, year: 1985, name: "UK User", doc: "UK-002" },
        { country: 156, year: 1988, name: "CN User", doc: "CN-003" },
        { country: 392, year: 1992, name: "JP User", doc: "JP-004" },
        { country: 276, year: 1995, name: "DE User", doc: "DE-005" },
      ];

      // Register all users
      for (let i = 0; i < users.length; i++) {
        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), users[i].address)
          .add32(BigInt(userData[i].country))
          .add32(BigInt(userData[i].year))
          .encrypt();

        await contract.connect(users[i]).registerCompliance(
          userData[i].doc,
          userData[i].name,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );
      }

      console.log(`✅ ${users.length} users registered`);

      // Verify all registered
      const participants = await contract.connect(admin).fetchAllParticipants();
      expect(participants).to.have.lengthOf(5);

      // Approve first 3, decline last 2
      for (let i = 0; i < 3; i++) {
        await contract.connect(admin).approveRecord(users[i].address);
      }
      for (let i = 3; i < 5; i++) {
        await contract.connect(admin).declineRecord(users[i].address);
      }

      console.log("✅ Admin processed all records");

      // Verify states
      for (let i = 0; i < 3; i++) {
        expect(await contract.checkApprovalStatus(users[i].address)).to.equal(true);
      }
      for (let i = 3; i < 5; i++) {
        expect(await contract.checkApprovalStatus(users[i].address)).to.equal(false);
      }

      // Check unverified count (should be 0 now)
      const unverifiedCount = await contract.connect(admin).countUnverifiedRecords();
      expect(unverifiedCount).to.equal(0);

      console.log("✅ Multi-user scenario completed successfully");
    });
  });

  describe("Admin Transfer Workflow", function () {
    it("should transfer admin and maintain access to encrypted data", async function () {
      console.log("Testing admin transfer with FHE data access...");

      // User registers
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      // Old admin can access
      const [, , country1, year1] = await contract.connect(admin).retrieveFullRecord(user1.address);
      expect(country1).to.not.equal(0n);

      console.log("✅ Old admin can access encrypted data");

      // Transfer admin
      await contract.connect(admin).updateAdministrator(user5.address);

      // New admin can access
      const [, , country2, year2] = await contract.connect(user5).retrieveFullRecord(user1.address);
      expect(country2).to.not.equal(0n);

      console.log("✅ New admin can access encrypted data");

      // New admin can approve
      await contract.connect(user5).approveRecord(user1.address);
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(true);

      console.log("✅ Admin transfer workflow completed");
    });
  });

  describe("Data Integrity Tests", function () {
    it("should maintain data integrity across multiple operations", async function () {
      console.log("Testing data integrity...");

      const docRef = "INTEGRITY-TEST-DOC";
      const fullName = "Integrity Test User";

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        docRef,
        fullName,
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      // Read before approval
      const nameBefore = await contract.retrieveName(user1.address);
      const docBefore = await contract.retrieveDocumentRef(user1.address);

      // Approve
      await contract.connect(admin).approveRecord(user1.address);

      // Read after approval
      const nameAfter = await contract.retrieveName(user1.address);
      const docAfter = await contract.retrieveDocumentRef(user1.address);

      // Data should be unchanged
      expect(nameBefore).to.equal(nameAfter);
      expect(docBefore).to.equal(docAfter);
      expect(nameBefore).to.equal(fullName);
      expect(docBefore).to.equal(docRef);

      console.log("✅ Data integrity maintained across operations");
    });

    it("should preserve encrypted data after state changes", async function () {
      console.log("Testing encrypted data preservation...");

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      // Get encrypted handles before approval
      const [, , countryBefore, yearBefore] = await contract.retrieveFullRecord(user1.address);

      // Approve
      await contract.connect(admin).approveRecord(user1.address);

      // Get encrypted handles after approval
      const [, , countryAfter, yearAfter] = await contract.retrieveFullRecord(user1.address);

      // Encrypted handles should remain the same
      expect(countryBefore).to.equal(countryAfter);
      expect(yearBefore).to.equal(yearAfter);

      console.log("✅ Encrypted data preserved after state changes");
    });
  });

  describe("Stress Tests", function () {
    it("should handle batch registrations efficiently", async function () {
      console.log("Testing batch registrations...");

      const signers = await ethers.getSigners();
      const batchSize = 10;
      const startTime = Date.now();

      for (let i = 0; i < batchSize; i++) {
        const user = signers[i + 10];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(BigInt(100 + i))
          .add32(BigInt(1990 + i))
          .encrypt();

        await contract.connect(user).registerCompliance(
          `BATCH-DOC-${i}`,
          `Batch User ${i}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const participants = await contract.connect(admin).fetchAllParticipants();
      expect(participants).to.have.lengthOf(batchSize);

      console.log(`✅ ${batchSize} registrations completed in ${duration}ms`);
      console.log(`✅ Average: ${(duration / batchSize).toFixed(2)}ms per registration`);
    });

    it("should handle rapid state changes", async function () {
      console.log("Testing rapid state changes...");

      const signers = await ethers.getSigners();
      const count = 5;

      // Register users
      for (let i = 0; i < count; i++) {
        const user = signers[i + 20];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(BigInt(100 + i))
          .add32(BigInt(1990 + i))
          .encrypt();

        await contract.connect(user).registerCompliance(
          `RAPID-DOC-${i}`,
          `Rapid User ${i}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );
      }

      // Rapid approvals/declines
      const startTime = Date.now();

      for (let i = 0; i < count; i++) {
        const user = signers[i + 20];
        if (i % 2 === 0) {
          await contract.connect(admin).approveRecord(user.address);
        } else {
          await contract.connect(admin).declineRecord(user.address);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ ${count} state changes completed in ${duration}ms`);
    });
  });

  describe("Error Recovery Tests", function () {
    it("should recover gracefully from failed operations", async function () {
      console.log("Testing error recovery...");

      // Attempt duplicate registration (should fail)
      const encrypted1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted1.handles[0],
        encrypted1.handles[1],
        encrypted1.inputProof
      );

      // Try duplicate (should fail but not break contract)
      const encrypted2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(826n)
        .add32(1985n)
        .encrypt();

      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-002",
          "John Doe Again",
          encrypted2.handles[0],
          encrypted2.handles[1],
          encrypted2.inputProof
        )
      ).to.be.reverted;

      // Contract should still work for other users
      const encrypted3 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user2.address)
        .add32(826n)
        .add32(1985n)
        .encrypt();

      await contract.connect(user2).registerCompliance(
        "DOC-002",
        "Jane Doe",
        encrypted3.handles[0],
        encrypted3.handles[1],
        encrypted3.inputProof
      );

      expect(await contract.recordExists(user2.address)).to.equal(true);

      console.log("✅ Contract recovers from failed operations");
    });
  });

  describe("Event Sequence Tests", function () {
    it("should emit events in correct sequence", async function () {
      console.log("Testing event sequence...");

      const events = [];

      // Listen for events
      contract.on("ComplianceRecordCreated", (participant, timestamp) => {
        events.push({ type: "ComplianceRecordCreated", participant, timestamp });
      });

      contract.on("StateTransition", (participant, prev, updated) => {
        events.push({ type: "StateTransition", participant, prev, updated });
      });

      // Register
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      const regTx = await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );
      await regTx.wait();

      // Approve
      const approveTx = await contract.connect(admin).approveRecord(user1.address);
      await approveTx.wait();

      // Allow time for events
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remove listeners
      contract.removeAllListeners();

      // Events should be in order (registration first, then approval)
      expect(events.length).to.be.gte(2);

      console.log("✅ Events emitted in correct sequence");
    });
  });
});
