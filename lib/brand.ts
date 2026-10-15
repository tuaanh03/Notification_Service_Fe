/**
 * Logo EON — file nằm ở `public/`. Đường dẫn tới `public/` KHÔNG tự thêm basePath (cả `<img>` lẫn
 * metadata.icons) nên ghép tay; BASE_PATH inline lúc build (next.config.mjs).
 */
const base = process.env.BASE_PATH ?? ''

export const BRAND_ICON_SRC = `${base}/icon.png`
export const BRAND_ICON_192_SRC = `${base}/icon-192.png`
export const BRAND_APPLE_ICON_SRC = `${base}/apple-icon.png`
/** Logo tròn 128 px, nền trong suốt — dùng trên giao diện (thanh bên, đăng nhập). */
export const BRAND_LOGO_SRC = `${base}/logo-icon.png`
