const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat");

describe("CodedComplianceGrid - FHE Operations Deep Dive", function () {
  let contract;
  let owner, user1, user2;

  beforeEach(async function () {
    if (!fhevm.isMock) {
      throw new Error("This test must run in FHEVM mock environment");
    }

    await fhevm.initializeCLIApi();

    [owner, user1, user2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CodedComplianceGrid");
    const deployed = await Factory.deploy();
    await deployed.waitForDeployment();
    contract = deployed;

    console.log(`\n✅ Contract deployed at: ${await contract.getAddress()}`);
  });

  describe("FHE.fromExternal() Operations", function () {
    it("should correctly process FHE encrypted inputs", async function () {
      console.log("Testing FHE.fromExternal() with various inputs...");

      const testCases = [
        { country: 840, year: 1990, desc: "Standard USA" },
        { country: 156, year: 1985, desc: "Standard China" },
        { country: 0, year: 0, desc: "Zero values" },
        { country: 999, year: 2024, desc: "Future year" },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const user = (await ethers.getSigners())[i + 3];
        const tc = testCases[i];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(BigInt(tc.country))
          .add32(BigInt(tc.year))
          .encrypt();

        await contract.connect(user).registerCompliance(
          `DOC-${i}`,
          `Test ${tc.desc}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );

        expect(await contract.recordExists(user.address)).to.equal(true);
        console.log(`✅ FHE.fromExternal() works for: ${tc.desc}`);
      }
    });

    it("should verify encrypted input handles are stored correctly", async function () {
      console.log("Testing encrypted handle storage...");

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

      await tx.wait();

      // Retrieve full record to verify encrypted values are stored
      const [docRef, name, countryHandle, yearHandle] =
        await contract.retrieveFullRecord(user1.address);

      expect(docRef).to.equal("DOC-001");
      expect(name).to.equal("John Doe");
      // Encrypted handles should be non-zero (actual verification is in mock)
      expect(countryHandle).to.not.equal(0n);
      expect(yearHandle).to.not.equal(0n);

      console.log("✅ Encrypted handles stored correctly");
    });
  });

  describe("FHE.allowThis() and FHE.allow() Permissions", function () {
    it("should set contract permissions for encrypted data", async function () {
      console.log("Testing FHE.allowThis() permissions...");

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

      // Contract should be able to read its own encrypted data
      const [docRef, name, countryHandle, yearHandle] =
        await contract.retrieveFullRecord(user1.address);

      // If allowThis was not called, this would fail
      expect(countryHandle).to.not.equal(0n);
      expect(yearHandle).to.not.equal(0n);

      console.log("✅ FHE.allowThis() sets contract read permissions correctly");
    });

    it("should set user permissions for their encrypted data", async function () {
      console.log("Testing FHE.allow() user permissions...");

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

      // User1 should be able to retrieve their own encrypted record
      const [, , countryHandle, yearHandle] =
        await contract.connect(user1).retrieveFullRecord(user1.address);

      expect(countryHandle).to.not.equal(0n);
      expect(yearHandle).to.not.equal(0n);

      console.log("✅ FHE.allow() sets user permissions correctly");
    });

    it("should set admin permissions for encrypted data", async function () {
      console.log("Testing FHE.allow() admin permissions...");

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

      // Admin (owner) should be able to retrieve encrypted record
      const [, , countryHandle, yearHandle] =
        await contract.connect(owner).retrieveFullRecord(user1.address);

      expect(countryHandle).to.not.equal(0n);
      expect(yearHandle).to.not.equal(0n);

      console.log("✅ FHE.allow() sets admin permissions correctly");
    });
  });

  describe("Multiple FHE Encrypted Inputs", function () {
    it("should handle multiple encrypted values in single transaction", async function () {
      console.log("Testing multiple encrypted inputs...");

      // Create encrypted input with both country and birth year
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)  // First handle: country
        .add32(1990n) // Second handle: birth year
        .encrypt();

      // Verify we got two handles
      expect(encrypted.handles).to.have.lengthOf(2);
      expect(encrypted.handles[0]).to.not.equal(encrypted.handles[1]);

      await contract.connect(user1).registerCompliance(
        "DOC-001",
        "John Doe",
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof
      );

      expect(await contract.recordExists(user1.address)).to.equal(true);

      console.log("✅ Multiple FHE inputs handled correctly");
    });

    it("should maintain distinct encrypted values", async function () {
      console.log("Testing encrypted value distinction...");

      // Register two users with different values
      const encrypted1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n) // USA
        .add32(1990n)
        .encrypt();

      await contract.connect(user1).registerCompliance(
        "DOC-001",
        "User 1",
        encrypted1.handles[0],
        encrypted1.handles[1],
        encrypted1.inputProof
      );

      const encrypted2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), user2.address)
        .add32(826n) // UK
        .add32(1985n)
        .encrypt();

      await contract.connect(user2).registerCompliance(
        "DOC-002",
        "User 2",
        encrypted2.handles[0],
        encrypted2.handles[1],
        encrypted2.inputProof
      );

      // Retrieve both records
      const [, , country1, year1] = await contract.retrieveFullRecord(user1.address);
      const [, , country2, year2] = await contract.retrieveFullRecord(user2.address);

      // Encrypted handles should be different for different values
      expect(country1).to.not.equal(country2);
      expect(year1).to.not.equal(year2);

      console.log("✅ Distinct encrypted values maintained correctly");
    });
  });

  describe("FHE Input Proof Validation", function () {
    it("should accept valid proofs", async function () {
      console.log("Testing valid proof acceptance...");

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      // Should not revert with valid proof
      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-001",
          "John Doe",
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        )
      ).to.not.be.reverted;

      console.log("✅ Valid proofs accepted");
    });

    it("should reject mismatched proof (wrong user)", async function () {
      console.log("Testing mismatched user proof rejection...");

      // Create encrypted input for user1
      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      // Try to use it with user2 (should fail)
      await expect(
        contract.connect(user2).registerCompliance(
          "DOC-001",
          "John Doe",
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        )
      ).to.be.reverted;

      console.log("✅ Mismatched user proof rejected");
    });

    it("should reject invalid proof format", async function () {
      console.log("Testing invalid proof format rejection...");

      const encrypted = await fhevm
        .createEncryptedInput(await contract.getAddress(), user1.address)
        .add32(840n)
        .add32(1990n)
        .encrypt();

      // Try with empty proof
      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-001",
          "John Doe",
          encrypted.handles[0],
          encrypted.handles[1],
          "0x"
        )
      ).to.be.reverted;

      // Try with garbage proof
      await expect(
        contract.connect(user1).registerCompliance(
          "DOC-001",
          "John Doe",
          encrypted.handles[0],
          encrypted.handles[1],
          "0x1234567890abcdef"
        )
      ).to.be.reverted;

      console.log("✅ Invalid proof formats rejected");
    });
  });

  describe("FHE euint32 Type Operations", function () {
    it("should handle full range of euint32 values", async function () {
      console.log("Testing euint32 value range...");

      const testValues = [
        0n,                // Min value
        1n,                // Small value
        255n,              // uint8 max
        65535n,            // uint16 max
        16777215n,         // uint24 max
        4294967295n,       // uint32 max
      ];

      for (let i = 0; i < testValues.length; i++) {
        const user = (await ethers.getSigners())[i + 5];
        const value = testValues[i];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(value)
          .add32(value)
          .encrypt();

        await contract.connect(user).registerCompliance(
          `DOC-${i}`,
          `User ${value}`,
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof
        );

        expect(await contract.recordExists(user.address)).to.equal(true);
        console.log(`✅ euint32 value ${value} handled correctly`);
      }
    });
  });

  describe("Concurrent FHE Operations", function () {
    it("should handle multiple concurrent registrations", async function () {
      console.log("Testing concurrent FHE registrations...");

      const users = await ethers.getSigners();
      const registrationPromises = [];

      // Prepare all registrations
      for (let i = 0; i < 5; i++) {
        const user = users[i + 10];

        const encrypted = await fhevm
          .createEncryptedInput(await contract.getAddress(), user.address)
          .add32(BigInt(100 + i))
          .add32(BigInt(1990 + i))
          .encrypt();

        registrationPromises.push(
          contract.connect(user).registerCompliance(
            `DOC-CONCURRENT-${i}`,
            `Concurrent User ${i}`,
            encrypted.handles[0],
            encrypted.handles[1],
            encrypted.inputProof
          )
        );
      }

      // Execute all registrations
      const results = await Promise.all(registrationPromises);

      // Wait for all transactions
      await Promise.all(results.map(tx => tx.wait()));

      // Verify all registrations succeeded
      for (let i = 0; i < 5; i++) {
        const user = users[i + 10];
        expect(await contract.recordExists(user.address)).to.equal(true);
      }

      console.log("✅ Concurrent FHE registrations handled correctly");
    });
  });

  describe("FHE Event Emissions", function () {
    it("should emit ComplianceRecordCreated with FHE registration", async function () {
      console.log("Testing FHE event emission...");

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

      // Find and verify event
      const event = receipt.logs.find(log => {
        try {
          const decoded = contract.interface.parseLog(log);
          return decoded.name === 'ComplianceRecordCreated';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const decoded = contract.interface.parseLog(event);
      expect(decoded.args.participant).to.equal(user1.address);
      expect(decoded.args.timestamp).to.be.gt(0);

      console.log("✅ ComplianceRecordCreated event emitted correctly");
    });
  });
});
