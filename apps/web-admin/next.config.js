const path = require("path");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: "standalone",
    // Keep dev artifacts separate so local `next build` / CI commands don't
    // poison an active Windows dev server manifest.
    distDir: isDevelopmentServer ? ".next-dev" : ".next",
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: ["@smart/ui", "@smart/types"],
    async headers() {
      return [
        {
          source: "/hero-poster.jpg",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/hero.webm",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/hero.mp4",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/room.webp",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          source: "/geo.webp",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
      ];
    },
  };

  return nextConfig;
};
