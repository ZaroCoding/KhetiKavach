/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is enabled by the Docker build only.
  // Export output is enabled by static hosts like Cloudflare Pages.
  output:
    process.env.NEXT_OUTPUT === "standalone"
      ? "standalone"
      : process.env.NEXT_OUTPUT === "export"
        ? "export"
        : undefined,
};

export default nextConfig;
