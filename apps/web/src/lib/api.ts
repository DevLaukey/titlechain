import { ApiResponse, PaginatedResponse } from "@title-chain/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

class ApiError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("tc_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error ?? `HTTP ${response.status}`,
      response.status
    );
  }

  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "BUYER" | "SELLER";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface WalletLoginPayload {
  walletAddress: string;
  message: string;
  signature: string;
}

export interface AuthData {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    kycStatus: string;
    walletAddress?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<ApiResponse<AuthData>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<ApiResponse<AuthData>>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  walletLogin: (payload: WalletLoginPayload) =>
    request<ApiResponse<AuthData>>("/auth/wallet", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () => request<ApiResponse<AuthData["user"]>>("/auth/me"),
};

// ── Identity ───────────────────────────────────────────────────────────────────

export interface KycSubmitPayload {
  documentType: string;
  documentHash: string;
}

export const identityApi = {
  submitKyc: (payload: KycSubmitPayload) =>
    request<ApiResponse<unknown>>("/identity/kyc", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getKycStatus: () => request<ApiResponse<unknown>>("/identity/kyc/status"),
};

// ── Properties ─────────────────────────────────────────────────────────────────

export interface CreatePropertyPayload {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  landArea?: number;
  landAreaUnit?: string;
  propertyType: string;
  estimatedValue?: number;
}

export interface Property {
  id: string;
  titleNumber: string;
  ownerId: string;
  status: string;
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
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export interface ListPropertiesQuery {
  page?: number;
  limit?: number;
  status?: string;
  city?: string;
  country?: string;
  ownerId?: string;
}

export const propertyApi = {
  create: (payload: CreatePropertyPayload) =>
    request<ApiResponse<Property>>("/property", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  list: (query: ListPropertiesQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    const qs = params.toString();
    return request<PaginatedResponse<Property>>(
      `/property${qs ? `?${qs}` : ""}`
    );
  },

  getById: (id: string) => request<ApiResponse<Property>>(`/property/${id}`),

  update: (id: string, payload: Partial<CreatePropertyPayload>) =>
    request<ApiResponse<Property>>(`/property/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

// ── Health ─────────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () =>
    request<{ status: string; timestamp: string; version: string }>(
      "/health"
    ),
};

// ── Transactions ───────────────────────────────────────────────────────────────

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
  contractAddress?: string;
  amount: string;
  status: string;
  milestones: EscrowMilestone[];
  fundedAt?: string;
  completedAt?: string;
}

export interface GovApproval {
  id: string;
  transactionId: string;
  registrarId: string;
  action: string;
  notes?: string;
  createdAt: string;
  registrar?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface Transaction {
  id: string;
  propertyId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  salePrice: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    titleNumber: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
  buyer?: { id: string; email: string; firstName?: string; lastName?: string };
  seller?: { id: string; email: string; firstName?: string; lastName?: string };
  escrow?: Escrow;
  govApprovals?: GovApproval[];
}

export const transactionApi = {
  create: (data: {
    propertyId: string;
    sellerId: string;
    salePrice: number;
    currency?: string;
  }) =>
    request<ApiResponse<Transaction>>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const qs = searchParams.toString();
    return request<PaginatedResponse<Transaction>>(
      `/transactions${qs ? `?${qs}` : ""}`
    );
  },

  getById: (id: string) =>
    request<ApiResponse<Transaction>>(`/transactions/${id}`),

  updateStatus: (id: string, status: string) =>
    request<ApiResponse<Transaction>>(`/transactions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ── Escrow ─────────────────────────────────────────────────────────────────────

export const escrowApi = {
  create: (data: {
    transactionId: string;
    amount: number;
    milestones: Array<{ description: string; amount: number }>;
  }) =>
    request<ApiResponse<Escrow>>("/escrow", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getByTransaction: (transactionId: string) =>
    request<ApiResponse<Escrow>>(`/escrow/transaction/${transactionId}`),

  fund: (escrowId: string) =>
    request<ApiResponse<Escrow>>(`/escrow/${escrowId}/fund`, {
      method: "POST",
    }),

  releaseMilestone: (escrowId: string, index: number) =>
    request<ApiResponse<Escrow>>(
      `/escrow/${escrowId}/milestone/${index}/release`,
      { method: "POST" }
    ),

  refund: (escrowId: string) =>
    request<ApiResponse<Escrow>>(`/escrow/${escrowId}/refund`, {
      method: "POST",
    }),
};

// ── Workflow ───────────────────────────────────────────────────────────────────

export const workflowApi = {
  submit: (transactionId: string) =>
    request<ApiResponse<unknown>>(`/workflow/submit/${transactionId}`, {
      method: "POST",
    }),

  getPending: () =>
    request<ApiResponse<Transaction[]>>("/workflow/pending"),

  approve: (transactionId: string, notes?: string) =>
    request<ApiResponse<unknown>>(`/workflow/${transactionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  reject: (transactionId: string, notes: string) =>
    request<ApiResponse<unknown>>(`/workflow/${transactionId}/reject`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  getHistory: (transactionId: string) =>
    request<ApiResponse<GovApproval[]>>(`/workflow/${transactionId}/history`),
};

export { ApiError };
