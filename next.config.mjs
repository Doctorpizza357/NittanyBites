/** @type {import('next').NextConfig} */

// For GitHub Pages project sites, set NEXT_PUBLIC_BASE_PATH to "/<repo-name>".
// Leave empty for user/org sites (username.github.io) or local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Static HTML export for GitHub Pages (no server runtime).
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
