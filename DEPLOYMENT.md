# TitleChain — Deployment Guide

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 20.x | Use [nvm](https://github.com/nvm-sh/nvm) or the official installer |
| npm | 10.x | Bundled with Node 20 |
| Docker | 24.x | Desktop or Engine |
| Docker Compose | 2.x | Plugin (`docker compose`) or standalone |
| Git | any | For cloning the repository |

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/title-chain.git
cd title-chain

# 2. Install all workspace dependencies
npm install

# 3. Copy the environment file and fill in your values
cp .env.example .env

# 4. Start the database (and all other services) with Docker Compose
docker compose up -d

# 5. Run the API in development mode (hot-reload)
npm run dev
```

The development compose file starts:
- **PostgreSQL** on `localhost:5432`
- **Hardhat local node** on `localhost:8545`

The API server listens on `http://localhost:3001` and the Next.js dev server on `http://localhost:3000`.

---

## Database Migrations

```bash
# Apply pending migrations (development)
cd apps/api && npx prisma migrate dev --schema=src/prisma/schema.prisma

# Apply migrations in production / CI (no prompts, no new migration files)
cd apps/api && npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

---

## Seeding Demo Data

```bash
cd apps/api && npx prisma db seed
```

This wipes and recreates all demo data. See the **Demo accounts** table below.

---

## Smart Contract Development

```bash
# Compile contracts
cd packages/contracts && npx hardhat compile

# Run contract tests
cd packages/contracts && npx hardhat test

# Deploy to the local Hardhat node (must be running via docker compose up)
cd packages/contracts && npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Base Sepolia testnet (requires BASE_SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env)
cd packages/contracts && npx hardhat run scripts/deploy.ts --network baseSepolia
```

---

## Production Deployment with Docker

```bash
# 1. Ensure your .env file has all required variables set (see table below)
cp .env.example .env
# Edit .env with production values

# 2. Build images and start all services in the background
docker compose -f docker-compose.prod.yml up -d --build

# 3. Check service health
docker compose -f docker-compose.prod.yml ps

# 4. Tail logs
docker compose -f docker-compose.prod.yml logs -f
```

### Service ports (production)

| Service | Internal | External | Notes |
|---------|----------|----------|-------|
| nginx | 80 | 80 | Reverse proxy — entry point |
| web | 3000 | 3000 | Next.js standalone |
| api | 3001 | 3001 | Express REST API |
| postgres | 5432 | none | Internal only |

Traffic flow: `Browser -> nginx:80 -> /api/* -> api:3001 | /* -> web:3000`

### Stopping the stack

```bash
docker compose -f docker-compose.prod.yml down

# Remove volumes too (destroys database data)
docker compose -f docker-compose.prod.yml down -v
```

---

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://titlechain:titlechain@localhost:5432/titlechain` |
| `PORT` | API server port | No | `3001` |
| `NODE_ENV` | Runtime environment | Yes | `production` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | Yes | `super-secret-value-change-in-prod-32c` |
| `HARDHAT_NETWORK` | Blockchain network name | No | `localhost` or `baseSepolia` |
| `BASE_SEPOLIA_RPC_URL` | Infura / Alchemy RPC endpoint for Base Sepolia | No | `https://sepolia.base.org` |
| `DEPLOYER_PRIVATE_KEY` | Private key for contract deployment | No | `0x_your_private_key` |
| `IPFS_GATEWAY` | IPFS HTTP gateway base URL | No | `https://ipfs.io/ipfs/` |
| `PINATA_API_KEY` | Pinata IPFS pinning API key | No | `your_pinata_key` |
| `PINATA_SECRET_KEY` | Pinata IPFS pinning secret | No | `your_pinata_secret` |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key (OCR / fraud detection) | No | `your_google_vision_key` |
| `NEXT_PUBLIC_API_URL` | API base URL visible to the browser | Yes | `http://localhost:3001/api` |
| `NEXT_PUBLIC_HARDHAT_CHAIN_ID` | Chain ID for local Hardhat network | No | `31337` |
| `NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID` | Chain ID for Base Sepolia testnet | No | `84532` |
| `POSTGRES_USER` | PostgreSQL username (prod compose only) | No | `titlechain` |
| `POSTGRES_PASSWORD` | PostgreSQL password (prod compose only) | Yes in prod | `titlechain` |
| `POSTGRES_DB` | PostgreSQL database name (prod compose only) | No | `titlechain` |

---

## Demo Accounts

Populated by `npx prisma db seed`.

| Email | Password | Role | KYC Status |
|-------|----------|------|-----------|
| `admin@titlechain.io` | `Admin@1234` | ADMIN | VERIFIED |
| `alice.johnson@email.com` | `Buyer@1234` | BUYER | VERIFIED |
| `david.osei@email.com` | `Seller@1234` | SELLER | VERIFIED |
| `registrar.amara@gov.ke` | `Registrar@1234` | REGISTRAR | VERIFIED |
| `john.smith@email.com` | `User@1234` | BUYER | PENDING |

The seed also creates:
- **Property TC-2024-KE-0047** — 24 Maple Ridge Drive, Nairobi (APPROVED, on-chain)
- **Transaction** — Alice buying from David, status `GOV_REVIEW`, escrow `FUNDED` with 30 % released

---

## Key API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check |
| `POST` | `/api/auth/register` | None | Register a new user |
| `POST` | `/api/auth/login` | None | Login and receive JWT |
| `GET` | `/api/auth/me` | JWT | Current user profile |
| `POST` | `/api/identity/kyc` | JWT | Submit KYC documents |
| `GET` | `/api/identity/kyc/status` | JWT | Get own KYC status |
| `GET` | `/api/property` | JWT | List properties |
| `POST` | `/api/property` | JWT | Create a property |
| `GET` | `/api/property/:id` | JWT | Get property by ID |
| `PUT` | `/api/property/:id` | JWT | Update property |
| `POST` | `/api/property/:id/documents` | JWT | Upload property document |
| `GET` | `/api/documents/:id` | JWT | Get document details |
| `POST` | `/api/ai/verify-document` | JWT | AI fraud / OCR analysis |
| `GET` | `/api/transactions` | JWT | List transactions |
| `POST` | `/api/transactions` | JWT | Initiate a transaction |
| `GET` | `/api/transactions/:id` | JWT | Get transaction by ID |
| `GET` | `/api/escrow/:transactionId` | JWT | Get escrow details |
| `POST` | `/api/escrow/:transactionId/release` | JWT | Release escrow milestone |
| `POST` | `/api/workflow/approve` | JWT (REGISTRAR/ADMIN) | Government approval action |
| `GET` | `/api/blockchain/status` | JWT | Blockchain connectivity status |
