import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */

// Console chạy trên domain riêng -> không prefix (mặc định rỗng). Nếu đặt lại sau
// portal nginx ở https://ews.eonsr.com/apps/ews-astrolink/, build với
// BASE_PATH=/apps/ews-astrolink để mọi <Link> và asset /_next mang đúng prefix.
const basePath = process.env.BASE_PATH ?? ''

const nextConfig = {
  // Self-contained server.js + minimal node_modules for the Docker runner stage.
  output: 'standalone',
  basePath,
  // Inline lúc build để code đọc được basePath đã chọn (icon trong metadata,
  // fetch từ component client). basePath là quyết định BUILD-TIME — đổi nó ở
  // runtime không làm asset /_next đổi theo, nên không đọc process.env lúc chạy.
  env: { BASE_PATH: basePath },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

// Ngôn ngữ giao diện: plugin nạp `i18n/request.ts` (đọc cookie, KHÔNG dùng tiền tố trên URL).
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

export default withNextIntl(nextConfig)
