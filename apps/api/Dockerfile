# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests so npm can resolve all workspaces during install
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (devDependencies needed for tsc, prisma generate)
RUN npm install

# Copy source trees needed for the API build
COPY packages/shared/ ./packages/shared/
COPY packages/contracts/ ./packages/contracts/
COPY apps/api/ ./apps/api/

# Build shared package first (API depends on it)
RUN cd packages/shared && npm run build

# Compile contracts so the ABI artifacts blockchain.service.ts reads at
# runtime (packages/contracts/artifacts/contracts) exist in the image —
# these are gitignored and not present in the build context otherwise.
RUN cd packages/contracts && npm run compile

# Generate Prisma client
RUN cd apps/api && npx prisma generate --schema=src/prisma/schema.prisma

# Compile TypeScript
RUN cd apps/api && npm run build

# ── Runner stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests for production dependency installation
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN npm install --omit=dev

# Install the Prisma CLI globally so migrations can run at startup.
# The `prisma` package is a devDependency in the API workspace, so it is not
# included in the production install above.
RUN npm install -g prisma

# Copy compiled output and Prisma artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/prisma ./apps/api/src/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Compiled contract ABIs — read at runtime by blockchain.service.ts.
COPY --from=builder /app/packages/contracts/artifacts ./packages/contracts/artifacts

# packages/contracts/deployments/<network>.json (per-network contract
# addresses) is also gitignored and NOT produced by `hardhat compile` — it's
# written once by `npx hardhat run scripts/deploy.ts --network baseSepolia`.
# On Render, mount it as a Secret File at this exact path instead of baking
# it into the image, since the addresses are specific to your one deploy.
RUN mkdir -p ./packages/contracts/deployments

# Hand ownership over to the built-in non-root user before switching
RUN chown -R node:node /app

WORKDIR /app/apps/api

EXPOSE 3001

USER node

# Run database migrations then start the server
CMD ["sh", "-c", "prisma migrate deploy --schema=src/prisma/schema.prisma && node dist/server.js"]
