import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone para a imagem Docker de produção (não afeta o dev).
  output: "standalone",
};

export default nextConfig;
