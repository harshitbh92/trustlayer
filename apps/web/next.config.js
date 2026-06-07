/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trustlayer/shared", "@trustlayer/reputation-engine"],
};

module.exports = nextConfig;
