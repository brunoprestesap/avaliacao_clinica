import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel React Best Practices – bundle: imports de barrel viram imports diretos.
  // lucide-react e radix-ui: evita carregar milhares de re-exports (200–800ms por cold start).
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
};

export default nextConfig;
