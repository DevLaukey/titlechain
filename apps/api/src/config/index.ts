import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from the repo root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  // Server
  port: parseInt(optionalEnv("PORT", "3001"), 10),
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  isProduction: optionalEnv("NODE_ENV", "development") === "production",

  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Auth
  jwtSecret: optionalEnv("JWT_SECRET", "dev-secret-change-in-production-minimum-32-chars"),
  jwtExpiresIn: "24h" as const,

  // Blockchain
  hardhatNetwork: optionalEnv("HARDHAT_NETWORK", "localhost"),
  baseSepoliaRpcUrl: optionalEnv("BASE_SEPOLIA_RPC_URL"),
  deployerPrivateKey: optionalEnv("DEPLOYER_PRIVATE_KEY"),

  // IPFS
  ipfsGateway: optionalEnv("IPFS_GATEWAY", "https://ipfs.io/ipfs/"),
  pinataApiKey: optionalEnv("PINATA_API_KEY"),
  pinataSecretKey: optionalEnv("PINATA_SECRET_KEY"),

  // AI
  googleVisionApiKey: optionalEnv("GOOGLE_VISION_API_KEY"),

  // CORS — allow Next.js dev server
  corsOrigins: optionalEnv("CORS_ORIGINS", "http://localhost:3000").split(","),
} as const;
