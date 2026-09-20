import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.localhost", "0.0.0.0"],
};

export default nextConfig;
