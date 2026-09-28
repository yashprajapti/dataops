import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }] },
  webpack: (config) => {
    // Always use AlaSQL's self-contained browser build (the Node build pulls in fs / react-native shims)
    config.resolve.alias["alasql$"] = path.resolve("node_modules/alasql/dist/alasql.min.js");
    return config;
  },
};
export default nextConfig;
