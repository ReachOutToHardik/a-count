import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    // Reuse a page visited in the last 30s instead of re-querying the DB on every click.
    // Every mutation calls router.refresh(), which clears this cache, so edits still show at once.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
