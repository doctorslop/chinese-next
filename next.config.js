/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for production deployments
  output: 'standalone',
  // Disable image optimization (not needed for this app)
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
