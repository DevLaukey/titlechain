# ◈ TitleChain

> AI-powered Digital Property Transaction Platform

TitleChain eliminates property title fraud and bureaucratic delay by combining AI document verification, immutable on-chain ownership records, and milestone-based smart escrow into a single end-to-end platform for buyers, sellers, and government registrars.

---

## The Problem

Property fraud costs African economies billions of dollars annually — duplicate titles, forged deeds, and phantom sellers prey on buyers who have no way to verify ownership history. Traditional land registries are paper-based, opaque, and siloed: a transaction that should take days takes months because documents travel physically between offices, approvals are undocumented, and there is no single source of truth. Buyers release funds before title is confirmed, sellers wait months for payment, and registrars have no digital workflow to track or audit their decisions.

## Our Solution

TitleChain creates a fully digital property transaction pipeline anchored to Base, an Ethereum L2. Every property title is registered on-chain via the `PropertyRegistry` smart contract, making ownership records immutable and publicly verifiable. Before any transaction proceeds, an AI engine performs OCR and fraud analysis on submitted documents, producing a quantified fraud score. Funds are held in the `EscrowManager` smart contract and released in milestone tranches — initial deposit, government approval, title transfer — so neither party can be cheated. A dedicated registrar workflow routes each transaction through the official government approval chain with a full, tamper-proof audit log.

---

## Key Features

- **AI Fraud Detection** — OCR pipeline extracts text from title deeds and survey reports using Google Cloud Vision API, then scores each document with a `fraudScore` (0–1) and `riskScore` (0–1) before human review
- **On-Chain Property Registry** — `PropertyRegistry.sol` (Solidity 0.8.20, OpenZeppelin `Ownable` + `Pausable`) anchors each title with an immutable `bytes32` on-chain ID, IPFS metadata hash, and current owner address
- **Multi-Milestone Smart Escrow** — `EscrowManager.sol` (OpenZeppelin `ReentrancyGuard`) locks funds and releases them in configurable tranches (30% initial deposit, 50% on government approval, 20% on title transfer) with `nonReentrant` protection on all ETH transfers
- **Government Registrar Workflow** — dedicated `/registrar` queue page and `/api/workflow` endpoints give REGISTRAR-role users an approval interface with RBAC enforcement; approvals and rejections are recorded in `GovApproval` and reflected in the transaction status machine
- **Role-Based Access Control** — four distinct roles (BUYER, SELLER, REGISTRAR, ADMIN) enforced via JWT middleware and per-route `rbac()` guards on every protected API endpoint
- **KYC Identity Verification** — identity document hashes stored with status tracking (`PENDING`, `VERIFIED`, `REJECTED`); KYC must be `VERIFIED` before a party can initiate or participate in a transaction
- **IPFS Document Storage** — all property documents are pinned via Pinata and referenced by content-addressed IPFS hashes stored in the database, making document tampering detectable
- **Immutable Audit Trail** — every platform action (user registration, document upload, AI verdict, escrow funding, government approval) is written to the `AuditLog` table with an optional `blockchainHash`, giving a complete chain of custody
- **Full Transaction Lifecycle** — seven-stage status machine (`INITIATED` → `AI_REVIEW` → `ESCROW_FUNDED` → `GOV_REVIEW` → `APPROVED` → `TRANSFER_COMPLETE`) covering the entire title transfer from offer to on-chain ownership change
- **Production Infrastructure** — Docker multi-stage builds, nginx reverse proxy, separate `docker-compose.prod.yml`, Prisma migrations, and Hardhat deployment scripts for both local and Base Sepolia testnet

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BROWSER / CLIENT                                │
│                   Next.js 14 App Router  (port 3000)                    │
│    / · /dashboard · /properties · /transactions · /registrar · /audit   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  HTTP / REST  (JSON)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   nginx reverse proxy  (port 80)                         │
│            /api/*  ──►  api:3001     |     /*  ──►  web:3000             │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Express REST API  (port 3001)                          │
│   /auth  /identity  /property  /documents  /ai  /transactions            │
│   /escrow  /workflow  /blockchain                                         │
│                                                                          │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │
│  │   Prisma ORM     │  │  Blockchain Svc   │  │   AI / OCR Service   │  │
│  │  (PostgreSQL)    │  │  (Ethers.js v6)   │  │ (Google Vision API)  │  │
│  └────────┬─────────┘  └────────┬──────────┘  └──────────┬───────────┘  │
└───────────┼────────────────────┼─────────────────────────┼──────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌─────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐
│   PostgreSQL    │   │   Base Network        │   │    IPFS / Pinata       │
│   (port 5432)   │   │  Base Sepolia  or     │   │   Document Storage     │
│                 │   │  Hardhat local :8545  │   │  (content-addressed)   │
│  User           │   │                       │   └────────────────────────┘
│  KycRecord      │   │  PropertyRegistry.sol │
│  Property       │   │  EscrowManager.sol    │
│  Transaction    │   │                       │
│  Escrow         │   └──────────────────────┘
│  GovApproval    │
│  AuditLog       │
└─────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript | Server-side rendering, page routing, UI |
| Styling | Tailwind CSS | Utility-first CSS; dark gold/black design system |
| Backend | Express.js 4, TypeScript | REST API, middleware, routing |
| ORM | Prisma 5 | Type-safe database access, schema migrations |
| Database | PostgreSQL 15 | Relational data — users, properties, transactions |
| Blockchain | Hardhat, Ethers.js v6, Solidity 0.8.20 | Smart contract compile, test, deploy |
| Contract Safety | OpenZeppelin 5 (`Ownable`, `Pausable`, `ReentrancyGuard`) | Audited security primitives |
| AI / OCR | Google Cloud Vision API | Document text extraction and fraud scoring |
| Document Storage | IPFS + Pinata | Decentralised, content-addressed file pinning |
| Authentication | JWT (jsonwebtoken), bcryptjs | Stateless auth, bcrypt password hashing (cost 12) |
| Infrastructure | Docker 24, Docker Compose 2, nginx | Containerised deployment, reverse proxy |
| Monorepo | npm workspaces | `apps/api`, `apps/web`, `packages/contracts`, `packages/shared` |
| Runtime | Node.js 20 | Minimum required version |

---

## Smart Contracts

| Contract | Network | Purpose |
|---|---|---|
| `PropertyRegistry` | Base Sepolia testnet / Hardhat local | Immutable on-chain registry of property titles. Stores `titleNumber`, IPFS `metadataHash`, and `currentOwner` address per `bytes32` on-chain ID. Emits `PropertyRegistered` and `PropertyTransferred` events. |
| `EscrowManager` | Base Sepolia testnet / Hardhat local | Multi-milestone ETH escrow. Locks buyer funds at creation and releases individual milestones to the seller on registrar approval. `nonReentrant` on all ETH transfers. Emits `EscrowCreated`, `EscrowFunded`, `MilestoneReleased`, and `EscrowCompleted` events. |

Deploy to Base Sepolia testnet (requires `BASE_SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `.env`):

```bash
cd packages/contracts && npx hardhat run scripts/deploy.ts --network baseSepolia
```

Deploy to the local Hardhat node (started by `docker compose up`):

```bash
cd packages/contracts && npx hardhat run scripts/deploy.ts --network localhost
```

---

## Platform Modules

| Module | Description | Status |
|---|---|---|
| Identity & KYC | User registration, JWT auth, KYC document submission (PASSPORT / NATIONAL_ID), status tracking | Complete |
| Property Registry | Create, list, and manage properties with title number, land area, property type, and estimated value | Complete |
| Document Management | Upload title deeds, survey reports, and valuation certificates; IPFS storage via Pinata | Complete |
| AI Verification | Google Vision OCR extracts document text; `fraudScore` and `riskScore` (0–1 scale) persisted per document | Complete |
| Blockchain Anchor | `PropertyRegistry.sol` registers each approved property on-chain; `onChainId` and `blockchainTxHash` stored in DB | Complete |
| Transaction Engine | Full buyer-seller transaction initiation with 7-stage status machine | Complete |
| Smart Escrow | `EscrowManager.sol` three-milestone escrow (30 / 50 / 20%); REGISTRAR-gated milestone release | Complete |
| Government Workflow | Registrar approval queue, approve/reject actions with notes, approval history, atomic DB updates | Complete |
| Audit Trail | Immutable `AuditLog` table capturing every actor, action, entity, and optional `blockchainHash` | Complete |

---

## Property Transaction Lifecycle

1. **KYC Registration** — Buyer and seller register accounts and submit government-issued ID documents. KYC status must be `VERIFIED` before transacting.
2. **Property Registration** — Seller creates a property record (`DRAFT` status) with address, land area, property type, and estimated value in KES.
3. **Document Upload** — Seller uploads title deeds, survey reports, and other certificates via `POST /api/property/:id/documents`. Files are stored via IPFS.
4. **AI Document Review** — `POST /api/ai/analyze/:documentId` calls Google Cloud Vision API to OCR each document and compute `fraudScore` and `riskScore`. Clean documents score below 0.10 on both metrics.
5. **Blockchain Registration** — Admin or registrar calls `POST /api/blockchain/property/register` to anchor the property on-chain via `PropertyRegistry.sol`. Property status advances to `APPROVED`; `onChainId` and `blockchainTxHash` are persisted.
6. **Transaction Initiation** — Buyer initiates a transaction against the approved property via `POST /api/transactions`. Status: `INITIATED`.
7. **Smart Escrow Funding** — Buyer creates a three-milestone escrow via `POST /api/escrow` and funds it via `POST /api/escrow/:id/fund`. Milestone 1 (30%) is released on funding. Status: `ESCROW_FUNDED`.
8. **Government Review** — Seller submits via `POST /api/workflow/submit/:transactionId`. Transaction enters `GOV_REVIEW`. Registrar sees it in the `/registrar` queue (`GET /api/workflow/pending`).
9. **Registrar Approval** — Registrar approves via `POST /api/workflow/:transactionId/approve`. A `GovApproval` record is created; Milestone 2 (50%) becomes eligible for release. Status: `APPROVED`.
10. **Title Transfer** — Registrar calls `POST /api/blockchain/property/transfer` to transfer the on-chain title to the buyer's wallet. Milestone 3 (20%) is released. Property status: `TRANSFERRED`. Transaction status: `TRANSFER_COMPLETE`.
11. **Audit** — Every step is logged in `AuditLog` with actor ID, timestamp, entity reference, and `blockchainHash` where applicable, forming a permanent chain of custody.

---

## API Overview

All endpoints are prefixed with `/api`. JWT tokens are obtained from `POST /api/auth/login`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | API health check — returns `{ status: "ok" }` |
| `POST` | `/api/auth/register` | None | Register a new user (email, password, role) |
| `POST` | `/api/auth/login` | None | Login and receive a signed JWT |
| `GET` | `/api/auth/me` | JWT | Return the authenticated user's profile |
| `POST` | `/api/identity/kyc` | JWT | Submit KYC document for verification |
| `GET` | `/api/identity/kyc/status` | JWT | Get current KYC status |
| `GET` | `/api/property` | JWT | List properties (role-filtered) |
| `POST` | `/api/property` | JWT | Create a new property record |
| `GET` | `/api/property/:id` | JWT | Get full property detail including documents |
| `PUT` | `/api/property/:id` | JWT | Update property metadata |
| `POST` | `/api/property/:id/documents` | JWT | Upload a property document |
| `GET` | `/api/documents/:id` | JWT | Get document detail including AI scores |
| `POST` | `/api/ai/analyze/:documentId` | JWT | Run AI OCR and fraud analysis on a document |
| `GET` | `/api/ai/analysis/:documentId` | JWT | Retrieve stored AI analysis results |
| `POST` | `/api/ai/analyze-pending` | JWT (ADMIN) | Batch-analyze all unverified documents |
| `GET` | `/api/transactions` | JWT | List transactions (role-filtered) |
| `POST` | `/api/transactions` | JWT | Initiate a new transaction |
| `GET` | `/api/transactions/:id` | JWT | Get full transaction including escrow and approvals |
| `POST` | `/api/escrow` | JWT (BUYER/ADMIN) | Create escrow for a transaction |
| `GET` | `/api/escrow/transaction/:transactionId` | JWT | Get escrow details by transaction ID |
| `POST` | `/api/escrow/:id/fund` | JWT (BUYER/ADMIN) | Mark escrow as funded |
| `POST` | `/api/escrow/:id/milestone/:index/release` | JWT (REGISTRAR/ADMIN) | Release a specific milestone to the seller |
| `POST` | `/api/escrow/:id/refund` | JWT (REGISTRAR/ADMIN) | Refund remaining escrow to the buyer |
| `POST` | `/api/workflow/submit/:transactionId` | JWT (SELLER/ADMIN) | Submit transaction for government review |
| `GET` | `/api/workflow/pending` | JWT (REGISTRAR/ADMIN) | Get pending approval queue |
| `POST` | `/api/workflow/:transactionId/approve` | JWT (REGISTRAR/ADMIN) | Approve a transaction |
| `POST` | `/api/workflow/:transactionId/reject` | JWT (REGISTRAR/ADMIN) | Reject a transaction with notes |
| `GET` | `/api/workflow/:transactionId/history` | JWT | Get full approval history |
| `GET` | `/api/blockchain/health` | None | Blockchain connectivity status and block number |
| `GET` | `/api/blockchain/property/:onChainId` | None | Read property directly from smart contract |
| `POST` | `/api/blockchain/property/register` | JWT (ADMIN/REGISTRAR) | Register property on-chain via `PropertyRegistry.sol` |
| `POST` | `/api/blockchain/property/transfer` | JWT (ADMIN/REGISTRAR) | Transfer on-chain title to new owner wallet |

---

## Getting Started

**Prerequisites:** Node.js 20+, Docker 24+, Docker Compose 2+

```bash
# 1. Clone the repository
git clone https://github.com/your-org/title-chain.git
cd title-chain

# 2. Install all workspace dependencies
npm install

# 3. Copy the environment file and fill in your values
cp .env.example .env

# 4. Start PostgreSQL and the Hardhat local node
docker compose up -d

# 5. Apply database migrations and seed demo data
cd apps/api && npx prisma migrate dev --schema=src/prisma/schema.prisma && npx prisma db seed
```

The frontend is available at `http://localhost:3000` and the API at `http://localhost:3001/api/health`.

For the full deployment guide including production Docker builds, Base Sepolia contract deployment, nginx configuration, and all environment variables, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Demo Accounts

Populated by `cd apps/api && npx prisma db seed`.

| Email | Password | Role | KYC Status | Notes |
|---|---|---|---|---|
| `admin@titlechain.io` | `Admin@1234` | ADMIN | VERIFIED | Platform administrator — full access |
| `alice.johnson@email.com` | `Buyer@1234` | BUYER | VERIFIED | Active buyer in the demo transaction |
| `david.osei@email.com` | `Seller@1234` | SELLER | VERIFIED | Owner of 24 Maple Ridge Drive |
| `registrar.amara@gov.ke` | `Registrar@1234` | REGISTRAR | VERIFIED | Government registrar handling the approval |
| `john.smith@email.com` | `User@1234` | BUYER | PENDING | KYC not yet approved — shows onboarding state |

---

## Demo Scenario

The seed creates a realistic mid-transaction scenario centred on **24 Maple Ridge Drive, Nairobi** (title number `TC-2024-KE-0047`), a 450 sqm residential property valued at KES 12,500,000. David Osei (seller) has registered the property, uploaded a title deed (`TC-2024-KE-0047-Title-Deed.pdf`) and survey report (`TC-2024-KE-0047-Survey-Report.pdf`), and both documents have been AI-verified — the title deed scores `fraudScore: 0.02, riskScore: 0.08` and the survey report `fraudScore: 0.01, riskScore: 0.05`, both well within the clean threshold. The property is registered on-chain with an `onChainId` and `blockchainTxHash`. Alice Johnson (buyer) has initiated a purchase transaction which is currently at `GOV_REVIEW` status, with a three-milestone escrow of KES 12,500,000 fully funded: Milestone 1 (30% / KES 3,750,000) was released on funding; Milestone 2 (50% / KES 6,250,000) and Milestone 3 (20% / KES 2,500,000) are pending government approval and title transfer respectively. Amara Diallo (registrar) has opened a review and is ready to approve.

---

## Hackathon Submission

**Blockchain Legal Institute Hackathon 2026**

The live demo shows:
- An AI-verified, on-chain registered property title flowing through the complete transaction lifecycle
- A funded multi-milestone smart escrow contract with real milestone release logic enforced on-chain
- A government registrar approving a transaction in real time, triggering atomic status updates across the transaction, escrow, and audit log
- A ten-entry immutable audit trail with blockchain hashes covering every step from user registration to government approval request

---

## License

MIT
