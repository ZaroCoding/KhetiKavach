/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is enabled by the Docker build only.
  // Static HTML export is the default for Cloudflare Pages and static hosting.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : "export",
};

export default nextConfig;
