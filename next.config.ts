import type { NextConfig } from "next";

// SSL workaround for corporate/self-signed certificates on this network
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // Fuentes y logo que usa el generador de historias (/api/historia)
  outputFileTracingIncludes: {
    "/api/historia/[id]": ["./lib/fonts/**", "./public/logo-marca.svg"],
  },
  eslint: { ignoreDuringBuilds: true },
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
