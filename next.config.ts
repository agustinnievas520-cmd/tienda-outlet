import type { NextConfig } from "next";

// SSL workaround for corporate/self-signed certificates on this network
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vienamuebles.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.vienamuebles.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
