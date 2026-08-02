import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['imapflow', 'mailparser'],
};

export default nextConfig;
