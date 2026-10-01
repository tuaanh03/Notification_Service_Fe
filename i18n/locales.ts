/**
 * Ngôn ngữ giao diện console. KHÔNG `server-only`: nút đổi ngôn ngữ (client) cần danh sách này.
 *
 * Ngôn ngữ đi bằng cookie, không nằm trên đường dẫn (không có `/en/...`): console có `basePath`
 * và `middleware.ts` riêng, thêm tiền tố vào URL là thêm một chỗ dễ làm hỏng chuyển hướng đăng nhập.
 */
export const LOCALES = ['vi', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'vi'
export const LOCALE_COOKIE = 'ews_locale'

/**
 * Cookie là thứ người dùng tự sửa được -> chỉ nhận ĐÚNG một trong `LOCALES`, mọi giá trị khác
 * (rỗng, `../`, chuỗi dài, `EN`…) đều quay về mặc định. Không bao giờ ghép giá trị cookie vào
 * đường dẫn file — hai bộ câu chữ được import cố định trong `i18n/request.ts`.
 */
export function toLocale(raw: unknown): Locale {
  return LOCALES.find((l) => l === raw) ?? DEFAULT_LOCALE
}
