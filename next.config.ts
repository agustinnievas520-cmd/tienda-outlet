import type { NextConfig } from "next";

// SSL workaround for corporate/self-signed certificates on this network
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // Fuentes y logo que usa el generador de historias (/api/historia)
  outputFileTracingIncludes: {
    "/api/historia/[id]": ["./lib/fonts/**", "./public/logo-casa-icono.png", "./public/logo-casa-texto.png", "./public/sello-outlet.png"],
    "/api/historia-iphone/[id]": ["./lib/fonts/**", "./public/logo-casa-icono.png", "./public/logo-casa-texto.png", "./public/iphones/**"],
    "/api/imagen": ["./public/sello-outlet.png"],
    "/api/admin/imagen/[id]": ["./public/sello-outlet.png"],
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
