import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // ルート直下のconfig/mood.jsonなど、フロント外の共有設定を読み込むため
    externalDir: true,
  },
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', '172.31.3.40'],
};

export default nextConfig;
