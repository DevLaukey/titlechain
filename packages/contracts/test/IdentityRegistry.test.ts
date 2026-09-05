import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IdentityRegistry } from "../typechain-types";

describe("IdentityRegistry", function () {
  let registry: IdentityRegistry;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const KYC_HASH = "QmKycDocumentHash123456789AbCdEfGhIjKlMnOpQrStUv";

  beforeEach(async function () {
    [owner, user1, user2, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("IdentityRegistry");
    registry = (await Factory.deploy(owner.address)) as unknown as IdentityRegistry;
    await registry.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("should start with zero registered identities", async function () {
      expect(await registry.totalRegistered()).to.equal(0n);
      expect(await registry.totalVerified()).to.equal(0n);
    });
  });

  // ── Register Identity ──────────────────────────────────────────────────────

  describe("registerIdentity", function () {
    it("should allow a user to register their own identity", async function () {
      await expect(
        registry.connect(user1).registerIdentity(user1.address, KYC_HASH)
      )
        .to.emit(registry, "IdentityRegistered")
        .withArgs(user1.address, KYC_HASH, (ts: bigint) => ts > 0n);

      expect(await registry.totalRegistered()).to.equal(1n);
    });

    it("should allow the contract owner to register on behalf of user", async function () {
      await registry
        .connect(owner)
        .registerIdentity(user1.address, KYC_HASH);

      expect(await registry.totalRegistered()).to.equal(1n);
    });

    it("should set status to Pending (1)", async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      const status = await registry.getStatus(user1.address);
      expect(status).to.equal(1); // Pending
    });

    it("should store correct identity data", async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      const identity = await registry.getIdentity(user1.address);
      expect(identity.wallet).to.equal(user1.address);
      expect(identity.kycHash).to.equal(KYC_HASH);
      expect(identity.status).to.equal(1); // Pending
    });

    it("should revert if another wallet tries to register on behalf", async function () {
      await expect(
        registry
          .connect(stranger)
          .registerIdentity(user1.address, KYC_HASH)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("should revert on duplicate registration", async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      await expect(
        registry.connect(user1).registerIdentity(user1.address, KYC_HASH)
      ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
    });

    it("should revert with empty KYC hash", async function () {
      await expect(
        registry.connect(user1).registerIdentity(user1.address, "")
      ).to.be.revertedWithCustomError(registry, "EmptyKycHash");
    });

    it("should revert with zero address", async function () {
      await expect(
        registry
          .connect(owner)
          .registerIdentity(ethers.ZeroAddress, KYC_HASH)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });
  });

  // ── Verify Identity ────────────────────────────────────────────────────────

  describe("verifyIdentity", function () {
    beforeEach(async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
    });

    it("should verify a pending identity", async function () {
      await expect(registry.verifyIdentity(user1.address, "Verified by registrar"))
        .to.emit(registry, "IdentityVerified")
        .withArgs(user1.address, "Verified by registrar", (ts: bigint) => ts > 0n);

      expect(await registry.totalVerified()).to.equal(1n);
      expect(await registry.isVerified(user1.address)).to.equal(true);
    });

    it("should update status to Verified (2)", async function () {
      await registry.verifyIdentity(user1.address, "");
      const status = await registry.getStatus(user1.address);
      expect(status).to.equal(2); // Verified
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        registry.connect(stranger).verifyIdentity(user1.address, "")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert on double verification", async function () {
      await registry.verifyIdentity(user1.address, "");
      await expect(
        registry.verifyIdentity(user1.address, "")
      ).to.be.revertedWithCustomError(registry, "AlreadyVerified");
    });

    it("should revert if identity not registered", async function () {
      await expect(
        registry.verifyIdentity(stranger.address, "")
      ).to.be.revertedWithCustomError(registry, "NotRegistered");
    });
  });

  // ── Revoke Identity ────────────────────────────────────────────────────────

  describe("revokeIdentity", function () {
    beforeEach(async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      await registry.verifyIdentity(user1.address, "Initial verification");
    });

    it("should revoke a verified identity", async function () {
      await expect(registry.revokeIdentity(user1.address, "Fraudulent documents"))
        .to.emit(registry, "IdentityRevoked")
        .withArgs(
          user1.address,
          "Fraudulent documents",
          (ts: bigint) => ts > 0n
        );

      expect(await registry.isVerified(user1.address)).to.equal(false);
      expect(await registry.totalVerified()).to.equal(0n);
    });

    it("should set status to Revoked (3)", async function () {
      await registry.revokeIdentity(user1.address, "reason");
      const status = await registry.getStatus(user1.address);
      expect(status).to.equal(3); // Revoked
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        registry.connect(stranger).revokeIdentity(user1.address, "")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert on double revocation", async function () {
      await registry.revokeIdentity(user1.address, "reason");
      await expect(
        registry.revokeIdentity(user1.address, "reason2")
      ).to.be.revertedWithCustomError(registry, "AlreadyRevoked");
    });
  });

  // ── Update KYC Hash ────────────────────────────────────────────────────────

  describe("updateKycHash", function () {
    const NEW_HASH = "QmNewKycHashAfterResubmission123456789";

    beforeEach(async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
    });

    it("should allow the user to update their own KYC hash", async function () {
      await expect(
        registry.connect(user1).updateKycHash(user1.address, NEW_HASH)
      )
        .to.emit(registry, "KycHashUpdated")
        .withArgs(user1.address, KYC_HASH, NEW_HASH, (ts: bigint) => ts > 0n);

      const identity = await registry.getIdentity(user1.address);
      expect(identity.kycHash).to.equal(NEW_HASH);
    });

    it("should allow the platform owner to update", async function () {
      await registry.connect(owner).updateKycHash(user1.address, NEW_HASH);
      const identity = await registry.getIdentity(user1.address);
      expect(identity.kycHash).to.equal(NEW_HASH);
    });

    it("should revert if called by another user", async function () {
      await expect(
        registry.connect(stranger).updateKycHash(user1.address, NEW_HASH)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("should revert with empty hash", async function () {
      await expect(
        registry.connect(user1).updateKycHash(user1.address, "")
      ).to.be.revertedWithCustomError(registry, "EmptyKycHash");
    });
  });

  // ── View Functions ─────────────────────────────────────────────────────────

  describe("isVerified", function () {
    it("should return false for unregistered address", async function () {
      expect(await registry.isVerified(stranger.address)).to.equal(false);
    });

    it("should return false for pending identity", async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      expect(await registry.isVerified(user1.address)).to.equal(false);
    });

    it("should return true after verification", async function () {
      await registry.connect(user1).registerIdentity(user1.address, KYC_HASH);
      await registry.verifyIdentity(user1.address, "");
      expect(await registry.isVerified(user1.address)).to.equal(true);
    });
  });
});
