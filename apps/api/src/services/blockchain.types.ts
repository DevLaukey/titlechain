// ─── Blockchain service shared TypeScript types ───────────────────────────────

export interface OnChainProperty {
  titleNumber: string;
  metadataHash: string;
  currentOwner: string;
  registeredAt: Date;
  lastTransferAt: Date;
}

export interface BlockchainTxResult {
  txHash: string;
}

export interface RegisterPropertyResult extends BlockchainTxResult {
  onChainId: string;
}

export interface TransferPropertyResult extends BlockchainTxResult {}

export interface RegisterIdentityResult extends BlockchainTxResult {}

export interface CreateEscrowResult extends BlockchainTxResult {
  escrowId: string;
  contractAddress: string;
}

export interface BlockchainHealthResult {
  connected: boolean;
  network: string;
  blockNumber?: number;
}
