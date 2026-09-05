import app from "./app";
import { config } from "./config";

const server = app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         TitleChain API Server            ║
  ╠══════════════════════════════════════════╣
  ║  Status:  Running                        ║
  ║  Port:    ${config.port}                         ║
  ║  Env:     ${config.nodeEnv.padEnd(10)}              ║
  ║  Health:  /api/health                    ║
  ╚══════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

export default server;
