const path = require("path");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: "standalone",
    // Keep dev artifacts separate so local `next build` / CI commands don't
    // poison an active Windows dev server manifest.
    distDir: isDevelopmentServer ? ".next/dev" : ".next",
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: ["@smart/ui", "@smart/types"],
  };

  return nextConfig;
};
