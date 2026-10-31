/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is enabled by the Docker build only. It needs symlink
  // permissions that plain Windows shells do not have.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
