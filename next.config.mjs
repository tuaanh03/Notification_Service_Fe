/** @type {import('next').NextConfig} */

// Portal nginx proxies https://ews.eonsr.com/apps/ews-astrolink/ -> 127.0.0.1:18105/
// (prefix stripped). basePath keeps every <Link>/_next asset under the prefix;
// the gateway nginx in docker-compose.yml puts the prefix back before Next sees it.
// Override with BASE_PATH="" for a bare `pnpm dev` at http://localhost:3000/.
const basePath = process.env.BASE_PATH ?? '/apps/ews-astrolink'

const nextConfig = {
  // Self-contained server.js + minimal node_modules for the Docker runner stage.
  output: 'standalone',
  basePath,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
