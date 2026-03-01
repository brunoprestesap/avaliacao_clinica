import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel React Best Practices – bundle: imports de barrel viram imports diretos.
  // lucide-react já é otimizado por padrão; listar aqui garante comportamento em todas as versões.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
