const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Next infers the monorepo root by walking up for a lockfile. The web
  // Dockerfile's deps stage never copies package-lock.json, so that
  // heuristic silently picks a different root there than it does locally,
  // changing where `standalone/.../server.js` ends up (confirmed via a
  // local `docker build`: it landed at standalone root, not apps/web/,
  // breaking the Dockerfile's COPY/CMD paths). Pin it explicitly — on
  // Next 14.1 this option lives under `experimental`, not top-level.
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../.."),
  },
  transpilePackages: ["@title-chain/shared"],
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
