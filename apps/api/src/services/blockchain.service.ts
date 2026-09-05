import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import type {
  OnChainProperty,
  RegisterPropertyResult,
  TransferPropertyResult,
  RegisterIdentityResult,
  CreateEscrowResult,
  BlockchainHealthResult,
} from "./blockchain.types";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Standard first-deployment addresses when running `npx hardhat node`.
 * These are deterministic across all Hardhat environments — not secrets.
 */
const FALLBACK_ADDRESSES: Record<string, string> = {
  PropertyRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  EscrowManager: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  IdentityRegistry: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
};

/**
 * Well-known Hardhat account #0 private key, published in Hardhat docs.
 * Used ONLY when NODE_ENV is not 'production' and DEPLOYER_PRIVATE_KEY is absent.
 */
const HARDHAT_TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// ─── Service ──────────────────────────────────────────────────────────────────

class BlockchainService {
  private provider!: ethers.JsonRpcProvider;
  private signer!: ethers.Wallet;
  private propertyRegistry!: ethers.Contract;
  private escrowManager!: ethers.Contract;
  private identityRegistry!: ethers.Contract;
  private _isConnected: boolean = false;

  constructor() {
    try {
      // ── Load ABIs ────────────────────────────────────────────────────────
      const artifactsBase = path.resolve(
        __dirname,
        "../../../../packages/contracts/artifacts/contracts"
      );

      const propertyRegistryArtifact = JSON.parse(
        fs.readFileSync(
          path.join(artifactsBase, "PropertyRegistry.sol", "PropertyRegistry.json"),
          "utf-8"
        )
      ) as { abi: ethers.InterfaceAbi };

      const escrowManagerArtifact = JSON.parse(
        fs.readFileSync(
          path.join(artifactsBase, "EscrowManager.sol", "EscrowManager.json"),
          "utf-8"
        )
      ) as { abi: ethers.InterfaceAbi };

      const identityRegistryArtifact = JSON.parse(
        fs.readFileSync(
          path.join(artifactsBase, "IdentityRegistry.sol", "IdentityRegistry.json"),
          "utf-8"
        )
      ) as { abi: ethers.InterfaceAbi };

      // ── Provider ─────────────────────────────────────────────────────────
      const network = config.hardhatNetwork;
      const rpcUrl =
        network === "sepolia"
          ? config.sepoliaRpcUrl || "https://rpc.sepolia.org"
          : "http://127.0.0.1:8545";

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // ── Signer ───────────────────────────────────────────────────────────
      const privateKey = config.isProduction
        ? config.deployerPrivateKey
        : config.deployerPrivateKey || HARDHAT_TEST_PRIVATE_KEY;

      if (!privateKey) {
        throw new Error(
          "No private key available. Set DEPLOYER_PRIVATE_KEY in production environment."
        );
      }

      this.signer = new ethers.Wallet(privateKey, this.provider);

      // ── Deployment addresses ──────────────────────────────────────────────
      const addresses = { ...FALLBACK_ADDRESSES };
      try {
        const deploymentsDir = path.resolve(
          __dirname,
          "../../../../packages/contracts/deployments"
        );
        const deploymentFile = path.join(deploymentsDir, `${network}.json`);
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8")) as Record<
          string,
          string
        >;
        if (deployment.PropertyRegistry) addresses.PropertyRegistry = deployment.PropertyRegistry;
        if (deployment.EscrowManager) addresses.EscrowManager = deployment.EscrowManager;
        if (deployment.IdentityRegistry) addresses.IdentityRegistry = deployment.IdentityRegistry;
        console.log("[BlockchainService] Loaded deployment addresses from", deploymentFile);
      } catch {
        console.warn(
          `[BlockchainService] No deployment file found for network '${network}'. Using fallback addresses.`
        );
      }

      // ── Contract instances ────────────────────────────────────────────────
      this.propertyRegistry = new ethers.Contract(
        addresses.PropertyRegistry,
        propertyRegistryArtifact.abi,
        this.signer
      );
      this.escrowManager = new ethers.Contract(
        addresses.EscrowManager,
        escrowManagerArtifact.abi,
        this.signer
      );
      this.identityRegistry = new ethers.Contract(
        addresses.IdentityRegistry,
        identityRegistryArtifact.abi,
        this.signer
      );

      this._isConnected = true;
      console.log("[BlockchainService] Initialized. Network:", network, "RPC:", rpcUrl);
    } catch (err) {
      console.error("[BlockchainService] Initialization failed:", err);
      this._isConnected = false;
    }
  }

  // ── Guards ──────────────────────────────────────────────────────────────────

  private checkAvailable(): void {
    if (!this._isConnected) {
      throw new AppError("Blockchain service not available", 503);
    }
  }

  isAvailable(): boolean {
    return this._isConnected;
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  /**
   * Parse a named event from a transaction receipt's log array.
   * Returns the parsed log args, or null if the event is not found.
   */
  private parseEventFromReceipt(
    receipt: ethers.TransactionReceipt,
    contract: ethers.Contract,
    eventName: string
  ): ethers.Result | null {
    const iface = contract.interface;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: Array.from(log.topics), data: log.data });
        if (parsed?.name === eventName) {
          return parsed.args;
        }
      } catch {
        // Not a log from this contract — skip
      }
    }
    return null;
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    this.checkAvailable();
    return this.provider.getTransactionReceipt(txHash);
  }

  async healthCheck(): Promise<BlockchainHealthResult> {
    if (!this._isConnected) {
      return { connected: false, network: config.hardhatNetwork };
    }
    try {
      const [networkInfo, blockNumber] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
      ]);
      return {
        connected: true,
        network: networkInfo.name,
        blockNumber,
      };
    } catch {
      return { connected: false, network: config.hardhatNetwork };
    }
  }

  // ── Property Registry ────────────────────────────────────────────────────────

  /**
   * Registers a property on-chain and returns the transaction hash and the
   * bytes32 `onChainId` emitted by the `PropertyRegistered` event.
   */
  async registerPropertyOnChain(
    titleNumber: string,
    metadataHash: string,
    ownerWalletAddress: string
  ): Promise<RegisterPropertyResult> {
    this.checkAvailable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: ethers.ContractTransactionResponse = await (this.propertyRegistry as any)[
      "registerProperty"
    ](titleNumber, metadataHash, ownerWalletAddress);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new AppError("Transaction failed — no receipt returned", 500);
    }

    const args = this.parseEventFromReceipt(receipt, this.propertyRegistry, "PropertyRegistered");
    const onChainId: string = args?.onChainId ?? "";

    return { txHash: receipt.hash, onChainId };
  }

  /**
   * Transfers property ownership on-chain.
   * The signer must be the current property owner or the contract owner.
   */
  async transferPropertyOnChain(
    onChainId: string,
    newOwnerWalletAddress: string
  ): Promise<TransferPropertyResult> {
    this.checkAvailable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: ethers.ContractTransactionResponse = await (this.propertyRegistry as any)[
      "transferProperty"
    ](onChainId, newOwnerWalletAddress);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new AppError("Transaction failed — no receipt returned", 500);
    }

    return { txHash: receipt.hash };
  }

  /**
   * Reads a property record from the chain.
   */
  async getPropertyFromChain(onChainId: string): Promise<OnChainProperty> {
    this.checkAvailable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: ethers.Result = await (this.propertyRegistry as any)["getProperty"](onChainId);

    return {
      titleNumber: result.titleNumber as string,
      metadataHash: result.metadataHash as string,
      currentOwner: result.currentOwner as string,
      registeredAt: new Date(Number(result.registeredAt) * 1000),
      lastTransferAt: new Date(Number(result.lastTransferAt) * 1000),
    };
  }

  // ── Identity Registry ────────────────────────────────────────────────────────

  /**
   * Registers a KYC identity on-chain.
   */
  async registerIdentityOnChain(
    walletAddress: string,
    kycHash: string
  ): Promise<RegisterIdentityResult> {
    this.checkAvailable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: ethers.ContractTransactionResponse = await (this.identityRegistry as any)[
      "registerIdentity"
    ](walletAddress, kycHash);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new AppError("Transaction failed — no receipt returned", 500);
    }

    return { txHash: receipt.hash };
  }

  /**
   * Returns true if the wallet address has a VERIFIED identity on-chain.
   */
  async verifyIdentityOnChain(walletAddress: string): Promise<boolean> {
    this.checkAvailable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verified: boolean = await (this.identityRegistry as any)["isVerified"](walletAddress);
    return verified;
  }

  // ── Escrow Manager ───────────────────────────────────────────────────────────

  /**
   * Creates an escrow on-chain for a property transaction.
   *
   * @param propertyIdBytes32 - bytes32 hex string used as the escrow's transactionId
   * @param sellerAddress     - seller's wallet address
   * @param buyerAddress      - buyer's wallet address
   * @param milestoneAmountsWei - array of milestone amounts in wei (bigint)
   *
   * Returns the txHash, the numeric escrowId (as string), and the EscrowManager
   * contract address (since this contract holds all escrow state rather than
   * deploying per-escrow contracts).
   */
  async createEscrowOnChain(
    propertyIdBytes32: string,
    sellerAddress: string,
    buyerAddress: string,
    milestoneAmountsWei: bigint[]
  ): Promise<CreateEscrowResult> {
    this.checkAvailable();

    const milestoneDescriptions = milestoneAmountsWei.map(
      (_, i) => `Milestone ${i + 1}`
    );

    // Contract signature: createEscrow(transactionId, buyer, seller, descriptions[], amounts[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx: ethers.ContractTransactionResponse = await (this.escrowManager as any)[
      "createEscrow"
    ](propertyIdBytes32, buyerAddress, sellerAddress, milestoneDescriptions, milestoneAmountsWei);

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new AppError("Transaction failed — no receipt returned", 500);
    }

    const args = this.parseEventFromReceipt(receipt, this.escrowManager, "EscrowCreated");
    const escrowId: string = args?.escrowId !== undefined ? String(args.escrowId) : "";

    const contractAddress = this.escrowManager.target as string;

    return { txHash: receipt.hash, escrowId, contractAddress };
  }
}

// ─── Singleton export ────────────────────────────────────────────────────────

export const blockchainService = new BlockchainService();
