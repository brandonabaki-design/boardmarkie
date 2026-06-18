import type { NextConfig } from "next";

// Static export so the app can be hosted on GitHub Pages (or any static host).
// On Pages the site lives under /<repo>, so set basePath/assetPrefix from
// PAGES_BASE_PATH (the deploy workflow sets it to "/boardmarkie"). Locally it's
// empty, so `npm run dev` / `npm run build` work at the root.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
