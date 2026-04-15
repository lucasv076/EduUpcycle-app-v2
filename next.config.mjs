/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdf.js worker draait client-side, niet bundlen als server-module
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
