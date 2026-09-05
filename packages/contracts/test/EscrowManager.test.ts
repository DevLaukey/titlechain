import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { EscrowManager } from "../typechain-types";

describe("EscrowManager", function () {
  let escrowManager: EscrowManager;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const TX_ID = ethers.encodeBytes32String("transaction-uuid-001");
  const MILESTONES = {
    descriptions: ["Initial deposit", "Survey completion", "Final transfer"],
    amounts: [
      ethers.parseEther("1.0"),
      ethers.parseEther("0.5"),
      ethers.parseEther("0.5"),
    ],
  };
  const TOTAL = ethers.parseEther("2.0");

  beforeEach(async function () {
    [owner, buyer, seller, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EscrowManager");
    escrowManager = (await Factory.deploy(owner.address)) as unknown as EscrowManager;
    await escrowManager.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await escrowManager.owner()).to.equal(owner.address);
    });

    it("should start with escrowCount = 0", async function () {
      expect(await escrowManager.escrowCount()).to.equal(0n);
    });
  });

  // ── Create Escrow ──────────────────────────────────────────────────────────

  describe("createEscrow", function () {
    it("should create an escrow and emit event", async function () {
      await expect(
        escrowManager.createEscrow(
          TX_ID,
          buyer.address,
          seller.address,
          MILESTONES.descriptions,
          MILESTONES.amounts
        )
      )
        .to.emit(escrowManager, "EscrowCreated")
        .withArgs(1n, TX_ID, buyer.address, seller.address, TOTAL);

      expect(await escrowManager.escrowCount()).to.equal(1n);
    });

    it("should store correct escrow data", async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );

      const [txId, b, s, total, released, status] =
        await escrowManager.getEscrow(1);

      expect(txId).to.equal(TX_ID);
      expect(b).to.equal(buyer.address);
      expect(s).to.equal(seller.address);
      expect(total).to.equal(TOTAL);
      expect(released).to.equal(0n);
      expect(status).to.equal(0); // Created
    });

    it("should store milestones correctly", async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );

      const milestones = await escrowManager.getMilestones(1);
      expect(milestones.length).to.equal(3);
      expect(milestones[0].description).to.equal("Initial deposit");
      expect(milestones[0].amount).to.equal(ethers.parseEther("1.0"));
      expect(milestones[0].released).to.equal(false);
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        escrowManager
          .connect(stranger)
          .createEscrow(
            TX_ID,
            buyer.address,
            seller.address,
            MILESTONES.descriptions,
            MILESTONES.amounts
          )
      ).to.be.revertedWithCustomError(escrowManager, "OwnableUnauthorizedAccount");
    });

    it("should revert with zero buyer address", async function () {
      await expect(
        escrowManager.createEscrow(
          TX_ID,
          ethers.ZeroAddress,
          seller.address,
          MILESTONES.descriptions,
          MILESTONES.amounts
        )
      ).to.be.revertedWithCustomError(escrowManager, "InvalidAddress");
    });

    it("should revert with empty milestones", async function () {
      await expect(
        escrowManager.createEscrow(TX_ID, buyer.address, seller.address, [], [])
      ).to.be.revertedWithCustomError(escrowManager, "NoMilestonesProvided");
    });

    it("should revert on duplicate transactionId", async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );

      await expect(
        escrowManager.createEscrow(
          TX_ID,
          buyer.address,
          seller.address,
          MILESTONES.descriptions,
          MILESTONES.amounts
        )
      ).to.be.revertedWithCustomError(
        escrowManager,
        "TransactionAlreadyHasEscrow"
      );
    });
  });

  // ── Fund Escrow ────────────────────────────────────────────────────────────

  describe("fundEscrow", function () {
    beforeEach(async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );
    });

    it("should accept correct ETH amount and emit event", async function () {
      await expect(
        escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL })
      )
        .to.emit(escrowManager, "EscrowFunded")
        .withArgs(1n, buyer.address, TOTAL, (ts: bigint) => ts > 0n);

      const balance = await escrowManager.getContractBalance();
      expect(balance).to.equal(TOTAL);
    });

    it("should update status to Funded", async function () {
      await escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL });
      const [, , , , , status] = await escrowManager.getEscrow(1);
      expect(status).to.equal(1); // Funded
    });

    it("should revert with wrong ETH amount", async function () {
      await expect(
        escrowManager
          .connect(buyer)
          .fundEscrow(1, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWithCustomError(escrowManager, "InvalidAmount");
    });

    it("should revert if already funded", async function () {
      await escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL });
      await expect(
        escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL })
      ).to.be.revertedWithCustomError(escrowManager, "InvalidStatus");
    });
  });

  // ── Release Milestone ──────────────────────────────────────────────────────

  describe("releaseMilestone", function () {
    beforeEach(async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );
      await escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL });
    });

    it("should release a milestone and transfer ETH to seller", async function () {
      const sellerBefore = await ethers.provider.getBalance(seller.address);

      await expect(escrowManager.releaseMilestone(1, 0))
        .to.emit(escrowManager, "MilestoneReleased")
        .withArgs(
          1n,
          0n,
          seller.address,
          ethers.parseEther("1.0"),
          (ts: bigint) => ts > 0n
        );

      const sellerAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("should update to PartiallyReleased after first milestone", async function () {
      await escrowManager.releaseMilestone(1, 0);
      const [, , , , released, status] = await escrowManager.getEscrow(1);
      expect(status).to.equal(2); // PartiallyReleased
      expect(released).to.equal(ethers.parseEther("1.0"));
    });

    it("should emit EscrowCompleted when all milestones released", async function () {
      await escrowManager.releaseMilestone(1, 0);
      await escrowManager.releaseMilestone(1, 1);
      await expect(escrowManager.releaseMilestone(1, 2))
        .to.emit(escrowManager, "EscrowCompleted")
        .withArgs(1n, (ts: bigint) => ts > 0n);

      const [, , , , , status] = await escrowManager.getEscrow(1);
      expect(status).to.equal(3); // Completed
    });

    it("should revert on double release", async function () {
      await escrowManager.releaseMilestone(1, 0);
      await expect(
        escrowManager.releaseMilestone(1, 0)
      ).to.be.revertedWithCustomError(escrowManager, "MilestoneAlreadyReleased");
    });

    it("should revert on out-of-bounds milestone index", async function () {
      await expect(
        escrowManager.releaseMilestone(1, 99)
      ).to.be.revertedWithCustomError(escrowManager, "MilestoneIndexOutOfBounds");
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        escrowManager.connect(stranger).releaseMilestone(1, 0)
      ).to.be.revertedWithCustomError(escrowManager, "OwnableUnauthorizedAccount");
    });
  });

  // ── Refund Escrow ──────────────────────────────────────────────────────────

  describe("refundEscrow", function () {
    beforeEach(async function () {
      await escrowManager.createEscrow(
        TX_ID,
        buyer.address,
        seller.address,
        MILESTONES.descriptions,
        MILESTONES.amounts
      );
      await escrowManager.connect(buyer).fundEscrow(1, { value: TOTAL });
    });

    it("should refund remaining funds to buyer", async function () {
      // Release first milestone first
      await escrowManager.releaseMilestone(1, 0);

      const buyerBefore = await ethers.provider.getBalance(buyer.address);

      await expect(escrowManager.refundEscrow(1))
        .to.emit(escrowManager, "EscrowRefunded")
        .withArgs(
          1n,
          buyer.address,
          ethers.parseEther("1.0"), // 2.0 - 1.0 released
          (ts: bigint) => ts > 0n
        );

      const buyerAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerAfter - buyerBefore).to.equal(ethers.parseEther("1.0"));
    });

    it("should set status to Refunded", async function () {
      await escrowManager.refundEscrow(1);
      const [, , , , , status] = await escrowManager.getEscrow(1);
      expect(status).to.equal(4); // Refunded
    });

    it("should revert if called by non-owner", async function () {
      await expect(
        escrowManager.connect(stranger).refundEscrow(1)
      ).to.be.revertedWithCustomError(escrowManager, "OwnableUnauthorizedAccount");
    });
  });
});
