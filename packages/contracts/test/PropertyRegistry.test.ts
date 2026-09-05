import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { PropertyRegistry } from "../typechain-types";

describe("PropertyRegistry", function () {
  let registry: PropertyRegistry;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const TITLE_NUMBER = "TC-2024-NGR-TEST01";
  const METADATA_HASH = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

  beforeEach(async function () {
    [owner, buyer, seller, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PropertyRegistry");
    registry = (await Factory.deploy(owner.address)) as unknown as PropertyRegistry;
    await registry.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("should start with zero total properties", async function () {
      expect(await registry.totalProperties()).to.equal(0n);
    });

    it("should not be paused initially", async function () {
      expect(await registry.paused()).to.equal(false);
    });
  });

  // ── Register Property ──────────────────────────────────────────────────────

  describe("registerProperty", function () {
    it("should register a new property and emit an event", async function () {
      const tx = await registry.registerProperty(
        TITLE_NUMBER,
        METADATA_HASH,
        seller.address
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      expect(await registry.totalProperties()).to.equal(1n);
    });

    it("should store correct property data", async function () {
      await registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address);

      const onChainId = await registry.getOnChainId(TITLE_NUMBER);
      expect(onChainId).to.not.equal(ethers.ZeroHash);

      const prop = await registry.getProperty(onChainId);
      expect(prop.titleNumber).to.equal(TITLE_NUMBER);
      expect(prop.metadataHash).to.equal(METADATA_HASH);
      expect(prop.currentOwner).to.equal(seller.address);
      expect(prop.exists).to.equal(true);
    });

    it("should emit PropertyRegistered event with correct args", async function () {
      await expect(
        registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address)
      )
        .to.emit(registry, "PropertyRegistered")
        .withArgs(
          (onChainId: string) => onChainId !== ethers.ZeroHash,
          TITLE_NUMBER,
          seller.address,
          METADATA_HASH,
          (ts: bigint) => ts > 0n
        );
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        registry
          .connect(stranger)
          .registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("should revert with empty title number", async function () {
      await expect(
        registry.registerProperty("", METADATA_HASH, seller.address)
      ).to.be.revertedWithCustomError(registry, "EmptyTitleNumber");
    });

    it("should revert with empty metadata hash", async function () {
      await expect(
        registry.registerProperty(TITLE_NUMBER, "", seller.address)
      ).to.be.revertedWithCustomError(registry, "EmptyMetadataHash");
    });

    it("should revert with zero address owner", async function () {
      await expect(
        registry.registerProperty(TITLE_NUMBER, METADATA_HASH, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("should revert on duplicate title number", async function () {
      await registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address);
      await expect(
        registry.registerProperty(TITLE_NUMBER, METADATA_HASH, buyer.address)
      ).to.be.revertedWithCustomError(registry, "PropertyAlreadyExists");
    });

    it("should revert when paused", async function () {
      await registry.pause();
      await expect(
        registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address)
      ).to.be.revertedWithCustomError(registry, "EnforcedPause");
    });
  });

  // ── Transfer Property ──────────────────────────────────────────────────────

  describe("transferProperty", function () {
    let onChainId: string;

    beforeEach(async function () {
      await registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address);
      onChainId = await registry.getOnChainId(TITLE_NUMBER);
    });

    it("should allow the current owner to transfer", async function () {
      await expect(
        registry.connect(seller).transferProperty(onChainId, buyer.address)
      )
        .to.emit(registry, "PropertyTransferred")
        .withArgs(onChainId, seller.address, buyer.address, (ts: bigint) => ts > 0n);

      const prop = await registry.getProperty(onChainId);
      expect(prop.currentOwner).to.equal(buyer.address);
    });

    it("should allow the contract owner (registrar) to transfer", async function () {
      await registry.connect(owner).transferProperty(onChainId, buyer.address);
      const prop = await registry.getProperty(onChainId);
      expect(prop.currentOwner).to.equal(buyer.address);
    });

    it("should revert if non-owner attempts transfer", async function () {
      await expect(
        registry.connect(stranger).transferProperty(onChainId, buyer.address)
      ).to.be.revertedWithCustomError(registry, "NotPropertyOwner");
    });

    it("should revert transfer to zero address", async function () {
      await expect(
        registry.connect(seller).transferProperty(onChainId, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("should revert for non-existent property", async function () {
      await expect(
        registry.transferProperty(ethers.randomBytes(32), buyer.address)
      ).to.be.revertedWithCustomError(registry, "PropertyNotFound");
    });
  });

  // ── Update Metadata ────────────────────────────────────────────────────────

  describe("updateMetadata", function () {
    let onChainId: string;
    const NEW_HASH = "QmNewHashAfterDocumentUpdate123456789";

    beforeEach(async function () {
      await registry.registerProperty(TITLE_NUMBER, METADATA_HASH, seller.address);
      onChainId = await registry.getOnChainId(TITLE_NUMBER);
    });

    it("should allow owner to update metadata", async function () {
      await expect(registry.connect(seller).updateMetadata(onChainId, NEW_HASH))
        .to.emit(registry, "MetadataUpdated")
        .withArgs(onChainId, METADATA_HASH, NEW_HASH, (ts: bigint) => ts > 0n);

      const prop = await registry.getProperty(onChainId);
      expect(prop.metadataHash).to.equal(NEW_HASH);
    });

    it("should revert with empty new hash", async function () {
      await expect(
        registry.connect(seller).updateMetadata(onChainId, "")
      ).to.be.revertedWithCustomError(registry, "EmptyMetadataHash");
    });
  });

  // ── View Functions ─────────────────────────────────────────────────────────

  describe("getPropertiesByOwner", function () {
    it("should return correct properties for an owner", async function () {
      await registry.registerProperty("TC-001", METADATA_HASH, seller.address);
      await registry.registerProperty("TC-002", METADATA_HASH, seller.address);

      const ids = await registry.getPropertiesByOwner(seller.address);
      expect(ids.length).to.equal(2);
    });

    it("should return empty array for address with no properties", async function () {
      const ids = await registry.getPropertiesByOwner(stranger.address);
      expect(ids.length).to.equal(0);
    });
  });

  // ── Pause/Unpause ──────────────────────────────────────────────────────────

  describe("pause / unpause", function () {
    it("should allow owner to pause and unpause", async function () {
      await registry.pause();
      expect(await registry.paused()).to.equal(true);

      await registry.unpause();
      expect(await registry.paused()).to.equal(false);
    });

    it("should revert pause from non-owner", async function () {
      await expect(
        registry.connect(stranger).pause()
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });
});
