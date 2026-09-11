import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return [{ source: "/registrar", destination: "/" }];
	},
};

export default nextConfig;
