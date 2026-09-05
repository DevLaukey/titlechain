// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  BUYER = "BUYER",
  SELLER = "SELLER",
  REGISTRAR = "REGISTRAR",
  ADMIN = "ADMIN",
}

export enum KycStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum PropertyStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  TRANSFERRED = "TRANSFERRED",
}

export enum TransactionStatus {
  INITIATED = "INITIATED",
  AI_REVIEW = "AI_REVIEW",
  ESCROW_FUNDED = "ESCROW_FUNDED",
  GOV_REVIEW = "GOV_REVIEW",
  APPROVED = "APPROVED",
  TRANSFER_COMPLETE = "TRANSFER_COMPLETE",
  CANCELLED = "CANCELLED",
}

export enum EscrowStatus {
  CREATED = "CREATED",
  FUNDED = "FUNDED",
  PARTIALLY_RELEASED = "PARTIALLY_RELEASED",
  COMPLETED = "COMPLETED",
  REFUNDED = "REFUNDED",
}

export enum AuditAction {
  USER_REGISTERED = "USER_REGISTERED",
  USER_LOGIN = "USER_LOGIN",
  WALLET_CONNECTED = "WALLET_CONNECTED",
  KYC_SUBMITTED = "KYC_SUBMITTED",
  KYC_VERIFIED = "KYC_VERIFIED",
  KYC_REJECTED = "KYC_REJECTED",
  PROPERTY_CREATED = "PROPERTY_CREATED",
  PROPERTY_UPDATED = "PROPERTY_UPDATED",
  PROPERTY_SUBMITTED = "PROPERTY_SUBMITTED",
  PROPERTY_APPROVED = "PROPERTY_APPROVED",
  PROPERTY_REJECTED = "PROPERTY_REJECTED",
  PROPERTY_TRANSFERRED = "PROPERTY_TRANSFERRED",
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  DOCUMENT_VERIFIED = "DOCUMENT_VERIFIED",
  TRANSACTION_INITIATED = "TRANSACTION_INITIATED",
  TRANSACTION_AI_REVIEWED = "TRANSACTION_AI_REVIEWED",
  ESCROW_CREATED = "ESCROW_CREATED",
  ESCROW_FUNDED = "ESCROW_FUNDED",
  ESCROW_MILESTONE_RELEASED = "ESCROW_MILESTONE_RELEASED",
  ESCROW_COMPLETED = "ESCROW_COMPLETED",
  ESCROW_REFUNDED = "ESCROW_REFUNDED",
  GOV_APPROVAL_REQUESTED = "GOV_APPROVAL_REQUESTED",
  GOV_APPROVAL_GRANTED = "GOV_APPROVAL_GRANTED",
  GOV_APPROVAL_REJECTED = "GOV_APPROVAL_REJECTED",
  CONTRACT_DEPLOYED = "CONTRACT_DEPLOYED",
  BLOCKCHAIN_TX_SUBMITTED = "BLOCKCHAIN_TX_SUBMITTED",
  BLOCKCHAIN_TX_CONFIRMED = "BLOCKCHAIN_TX_CONFIRMED",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  walletAddress?: string | null;
  role: UserRole;
  kycStatus: KycStatus;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  titleNumber: string;
  ownerId: string;
  owner?: Partial<User>;
  status: PropertyStatus;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string | null;
  landArea?: number | null;
  landAreaUnit?: string | null;
  propertyType: string;
  estimatedValue?: string | null;
  metadataHash?: string | null;
  blockchainTxHash?: string | null;
  onChainId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  documents?: PropertyDocument[];
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  documentType: string;
  fileName: string;
  ipfsHash?: string | null;
  storageUrl?: string | null;
  aiVerified: boolean;
  fraudScore?: number | null;
  riskScore?: number | null;
  ocrText?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  propertyId: string;
  property?: Partial<Property>;
  buyerId: string;
  buyer?: Partial<User>;
  sellerId: string;
  seller?: Partial<User>;
  status: TransactionStatus;
  salePrice: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  escrow?: Escrow;
  govApprovals?: GovApproval[];
}

export interface EscrowMilestone {
  id: string;
  description: string;
  amount: string;
  released: boolean;
  releasedAt?: string | null;
}

export interface Escrow {
  id: string;
  transactionId: string;
  contractAddress?: string | null;
  amount: string;
  status: EscrowStatus;
  milestones: EscrowMilestone[];
  fundedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovApproval {
  id: string;
  transactionId: string;
  registrarId: string;
  registrar?: Partial<User>;
  action: string;
  notes?: string | null;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  actor?: Partial<User>;
  propertyId?: string | null;
  transactionId?: string | null;
  metadata?: Record<string, unknown> | null;
  blockchainHash?: string | null;
  createdAt: Date;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
