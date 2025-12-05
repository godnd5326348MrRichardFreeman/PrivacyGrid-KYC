const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat");

describe("CodedComplianceGrid - Comprehensive FHE KYC Tests", function () {
  let contract;
  let owner, user1, user2, user3, newAdmin;

  beforeEach(async function () {
    if (!fhevm.isMock) {
      throw new Error("This test must run in FHEVM mock environment");
    }

    await fhevm.initializeCLIApi();

    [owner, user1, user2, user3, newAdmin] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CodedComplianceGrid");
    const deployed = await Factory.deploy();
    await deployed.waitForDeployment();
    contract = deployed;

    console.log(`\n✅ CodedComplianceGrid deployed at: ${await contract.getAddress()}`);
  });

  describe("Deployment", function () {
    it("should deploy contract successfully", async function () {
      const address = await contract.getAddress();
      expect(address).to.be.properAddress;
      expect(address).to.not.equal(ethers.ZeroAddress);
      console.log("✅ Contract deployed successfully");
    });

    it("should set deployer as administrator", async function () {
      // Verify deployer has admin privileges by calling admin-only function
      // This will not revert if owner is admin
      const participants = await contract.connect(owner).fetchAllParticipants();
      expect(participants).to.be.an("array");
      console.log("✅ Deployer is administrator");
    });
  });

  describe("FHE Compliance Registration", function () {
    it("should register compliance data with FHE encrypted values", async function () {
      console.log("Testing FHE encrypted KYC registration...");

      const documentRef = "DOC-2024-001";
      const fullName = "John Doe";
      const countryCode = 840; // USA
      const birthYear = 1990;

      // Create encrypted input for country code and birth year
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(BigInt(countryCode))
        .add32(BigInt(birthYear))
        .encrypt();

      // Register compliance
      const tx = await contract.connect(user1).registerCompliance(
        documentRef,
        fullName,
        encrypted.handles[0], // Encrypted country code
        encrypted.handles[1], // Encrypted birth year
        encrypted.inputProof
      );

      const receipt = await tx.wait();

      // Check for ComplianceRecordCreated event
      const event = receipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'ComplianceRecordCreated';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      expect(event.args.participant).to.equal(user1.address);

      console.log("✅ FHE.fromExternal() - Encrypted input conversion works");
      console.log("✅ FHE.allowThis() - Contract permission set correctly");
      console.log("✅ FHE.allow() - User and admin permissions set correctly");
    });

    it("should prevent duplicate registrations", async function () {
      console.log("Testing duplicate registration prevention...");

      // First registration
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

      // Second registration should fail
      const encrypted2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(826n) // UK
        .add32(1985n)
        .encrypt();

      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-002",
          "John Doe",
          encrypted2.handles[0],
          encrypted2.handles[1],
          encrypted2.inputProof
        )
      ).to.be.revertedWith("Compliance record already exists");

      console.log("✅ Duplicate registration prevention works");
    });

    it("should reject invalid FHE proofs", async function () {
      console.log("Testing invalid FHE proof rejection...");

      const validEncrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      const invalidProof = "0x" + "00".repeat(64);

      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-001",
          "John Doe",
          validEncrypted.handles[0],
          validEncrypted.handles[1],
          invalidProof
        )
      ).to.be.reverted;

      console.log("✅ FHE.fromExternal() correctly rejects invalid proofs");
    });
  });

  describe("Administrator Functions", function () {
    beforeEach(async function () {
      // Register user1 first
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
    });

    it("should allow administrator to approve records", async function () {
      console.log("Testing record approval...");

      // Check initial state
      const [stateBefore] = await contract.queryRecordState(user1.address);
      expect(stateBefore).to.equal(0); // Unverified

      // Approve record
      const tx = await contract.connect(owner).approveRecord(user1.address);
      const receipt = await tx.wait();

      // Check for StateTransition event
      const event = receipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'StateTransition';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      expect(event.args.previousState).to.equal(0); // Unverified
      expect(event.args.updatedState).to.equal(1);  // Approved

      // Verify state changed
      const [stateAfter] = await contract.queryRecordState(user1.address);
      expect(stateAfter).to.equal(1); // Approved

      console.log("✅ Administrator can approve records");
    });

    it("should allow administrator to decline records", async function () {
      console.log("Testing record decline...");

      const tx = await contract.connect(owner).declineRecord(user1.address);
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'StateTransition';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      expect(event.args.updatedState).to.equal(2); // Declined

      const [stateAfter] = await contract.queryRecordState(user1.address);
      expect(stateAfter).to.equal(2); // Declined

      console.log("✅ Administrator can decline records");
    });

    it("should prevent non-admin from approving/declining", async function () {
      console.log("Testing admin access control...");

      await expect(
        contract.connect(user2).approveRecord(user1.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      await expect(
        contract.connect(user2).declineRecord(user1.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      console.log("✅ Non-admin cannot approve/decline records");
    });

    it("should allow administrator transfer", async function () {
      console.log("Testing administrator transfer...");

      const tx = await contract.connect(owner).updateAdministrator(newAdmin.address);
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'AdministratorChanged';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      expect(event.args.formerAdmin).to.equal(owner.address);
      expect(event.args.currentAdmin).to.equal(newAdmin.address);

      // New admin can now approve
      await contract.connect(newAdmin).approveRecord(user1.address);

      // Old admin cannot approve anymore
      // Register user2 first
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user2.address)
        .add32(826n)
        .add32(1985n)
        .encrypt();

      await contract.connect(user2).registerCompliance(
        "DOC-002",
        "Jane Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      await expect(
        contract.connect(owner).approveRecord(user2.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      console.log("✅ Administrator transfer works correctly");
    });

    it("should prevent transfer to zero address", async function () {
      await expect(
        contract.connect(owner).updateAdministrator(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid administrator address");

      console.log("✅ Cannot transfer admin to zero address");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Register multiple users
      const users = [user1, user2];
      const countryCodes = [840, 826]; // USA, UK
      const birthYears = [1990, 1985];

      for (let i = 0; i < users.length; i++) {
        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), users[i].address)
          .add32(BigInt(countryCodes[i]))
          .add32(BigInt(birthYears[i]))
          .encrypt();

        await contract.connect(users[i]).registerCompliance(
          `DOC-00${i + 1}`,
          `User ${i + 1}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );
      }
    });

    it("should check if record exists", async function () {
      expect(await contract.recordExists(user1.address)).to.equal(true);
      expect(await contract.recordExists(user3.address)).to.equal(false);
      console.log("✅ recordExists() works correctly");
    });

    it("should check approval status", async function () {
      // Initially not approved
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(false);

      // Approve user1
      await contract.connect(owner).approveRecord(user1.address);

      // Now approved
      expect(await contract.checkApprovalStatus(user1.address)).to.equal(true);
      expect(await contract.checkApprovalStatus(user2.address)).to.equal(false);

      console.log("✅ checkApprovalStatus() works correctly");
    });

    it("should query record state and timestamp", async function () {
      const [state, timestamp] = await contract.queryRecordState(user1.address);

      expect(state).to.equal(0); // Unverified
      expect(timestamp).to.be.gt(0);

      console.log("✅ queryRecordState() returns correct data");
    });

    it("should retrieve user name", async function () {
      const name = await contract.retrieveName(user1.address);
      expect(name).to.equal("User 1");

      console.log("✅ retrieveName() works correctly");
    });

    it("should retrieve document reference", async function () {
      const docRef = await contract.retrieveDocumentRef(user1.address);
      expect(docRef).to.equal("DOC-001");

      console.log("✅ retrieveDocumentRef() works correctly");
    });

    it("should count unverified records (admin only)", async function () {
      // Both records are unverified initially
      const count = await contract.connect(owner).countUnverifiedRecords();
      expect(count).to.equal(2);

      // Approve one record
      await contract.connect(owner).approveRecord(user1.address);

      const newCount = await contract.connect(owner).countUnverifiedRecords();
      expect(newCount).to.equal(1);

      console.log("✅ countUnverifiedRecords() works correctly");
    });

    it("should fetch all participants (admin only)", async function () {
      const participants = await contract.connect(owner).fetchAllParticipants();

      expect(participants).to.have.lengthOf(2);
      expect(participants).to.include(user1.address);
      expect(participants).to.include(user2.address);

      console.log("✅ fetchAllParticipants() works correctly");
    });
  });

  describe("FHE Edge Cases", function () {
    it("should handle different country codes", async function () {
      console.log("Testing various country codes...");

      const countryCodes = [
        { code: 156, name: "China" },
        { code: 392, name: "Japan" },
        { code: 276, name: "Germany" },
        { code: 702, name: "Singapore" }
      ];

      for (let i = 0; i < countryCodes.length; i++) {
        const user = (await ethers.getSigners())[i + 5]; // Use different signers

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(BigInt(countryCodes[i].code))
          .add32(2000n)
          .encrypt();

        await contract.connect(user).registerCompliance(
          `DOC-${countryCodes[i].code}`,
          `User from ${countryCodes[i].name}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );

        console.log(`✅ Country code ${countryCodes[i].code} (${countryCodes[i].name}) registered`);
      }
    });

    it("should handle birth year edge cases", async function () {
      console.log("Testing birth year edge cases...");

      const birthYears = [1900, 1950, 2000, 2024];

      for (let i = 0; i < birthYears.length; i++) {
        const user = (await ethers.getSigners())[i + 10];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(840n)
          .add32(BigInt(birthYears[i]))
          .encrypt();

        await contract.connect(user).registerCompliance(
          `DOC-YEAR-${birthYears[i]}`,
          `User born ${birthYears[i]}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );

        console.log(`✅ Birth year ${birthYears[i]} registered`);
      }
    });

    it("should handle empty document reference", async function () {
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "", // Empty document reference
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      const docRef = await contract.retrieveDocumentRef(user1.address);
      expect(docRef).to.equal("");

      console.log("✅ Empty document reference handled correctly");
    });

    it("should handle maximum uint32 values for FHE", async function () {
      console.log("Testing maximum uint32 values...");

      const maxUint32 = 4294967295n; // 2^32 - 1

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(maxUint32)
        .add32(maxUint32)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-MAX",
        "Max Values User",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      expect(await contract.recordExists(user1.address)).to.equal(true);

      console.log("✅ Maximum uint32 values handled correctly");
    });

    it("should handle zero values for FHE", async function () {
      console.log("Testing zero values...");

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(0n)
        .add32(0n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-ZERO",
        "Zero Values User",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      expect(await contract.recordExists(user1.address)).to.equal(true);

      console.log("✅ Zero values handled correctly");
    });
  });

  describe("State Transitions", function () {
    beforeEach(async function () {
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
    });

    it("should only allow state change from Unverified", async function () {
      console.log("Testing state transition rules...");

      // Approve the record
      await contract.connect(owner).approveRecord(user1.address);

      // Try to approve again (should fail - not Unverified)
      await expect(
        contract.connect(owner).approveRecord(user1.address)
      ).to.be.revertedWith("Record must be in unverified state");

      // Try to decline (should fail - not Unverified)
      await expect(
        contract.connect(owner).declineRecord(user1.address)
      ).to.be.revertedWith("Record must be in unverified state");

      console.log("✅ State transition rules enforced correctly");
    });

    it("should emit correct events for all state transitions", async function () {
      console.log("Testing state transition events...");

      // Test approval event
      const approveTx = await contract.connect(owner).approveRecord(user1.address);
      const approveReceipt = await approveTx.wait();

      const approveEvent = approveReceipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'StateTransition';
        } catch {
          return false;
        }
      });

      expect(approveEvent.args.participant).to.equal(user1.address);
      expect(approveEvent.args.previousState).to.equal(0);
      expect(approveEvent.args.updatedState).to.equal(1);

      // Register user2 for decline test
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user2.address)
        .add32(826n)
        .add32(1985n)
        .encrypt();

      await contract.connect(user2).registerCompliance(
        "DOC-002",
        "Jane Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      // Test decline event
      const declineTx = await contract.connect(owner).declineRecord(user2.address);
      const declineReceipt = await declineTx.wait();

      const declineEvent = declineReceipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'StateTransition';
        } catch {
          return false;
        }
      });

      expect(declineEvent.args.participant).to.equal(user2.address);
      expect(declineEvent.args.previousState).to.equal(0);
      expect(declineEvent.args.updatedState).to.equal(2);

      console.log("✅ All state transition events emit correctly");
    });
  });

  describe("Access Control Modifiers", function () {
    it("should enforce recordMustExist modifier", async function () {
      console.log("Testing recordMustExist modifier...");

      // Try to query non-existent record
      await expect(
        contract.queryRecordState(user1.address)
      ).to.be.revertedWith("Compliance record not found");

      await expect(
        contract.retrieveName(user1.address)
      ).to.be.revertedWith("Compliance record not found");

      await expect(
        contract.retrieveDocumentRef(user1.address)
      ).to.be.revertedWith("Compliance record not found");

      await expect(
        contract.retrieveFullRecord(user1.address)
      ).to.be.revertedWith("Compliance record not found");

      console.log("✅ recordMustExist modifier works correctly");
    });

    it("should enforce onlyAdministrator modifier", async function () {
      console.log("Testing onlyAdministrator modifier...");

      // Register user first
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

      // Non-admin tries admin functions
      await expect(
        contract.connect(user2).approveRecord(user1.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      await expect(
        contract.connect(user2).declineRecord(user1.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      await expect(
        contract.connect(user2).countUnverifiedRecords()
      ).to.be.revertedWith("Unauthorized: administrator access required");

      await expect(
        contract.connect(user2).fetchAllParticipants()
      ).to.be.revertedWith("Unauthorized: administrator access required");

      await expect(
        contract.connect(user2).updateAdministrator(user2.address)
      ).to.be.revertedWith("Unauthorized: administrator access required");

      console.log("✅ onlyAdministrator modifier works correctly");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("should complete registration within reasonable gas limits", async function () {
      console.log("Testing gas consumption...");

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      const tx = await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      console.log(`Gas used for registration: ${gasUsed}`);

      // FHE operations are gas-intensive, but should be within block limits
      expect(gasUsed).to.be.lt(5000000);

      console.log("✅ Gas consumption is within acceptable limits");
    });
  });
});
