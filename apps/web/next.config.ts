import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/reports",
        destination: "/vibes",
        permanent: true,
      },
      {
        source: "/reports/:jobId",
        destination: "/analysis/:jobId",
        permanent: true,
      },
      {
        source: "/repos",
        destination: "/settings/repos",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
