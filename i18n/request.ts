import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE, toLocale } from './locales'
import { MESSAGES } from './messages'

/**
 * `next-intl` gọi hàm này mỗi request (plugin trong `next.config.mjs` trỏ tới file này).
 * Console là `force-dynamic` nên không có chuyện trang dựng theo ngôn ngữ người này bị lưu lại
 * rồi phục vụ cho người khác.
 */
export default getRequestConfig(async () => {
  const locale = toLocale((await cookies()).get(LOCALE_COOKIE)?.value)
  // Cùng múi giờ với `lib/time.ts` — server (UTC) và trình duyệt ra cùng một chuỗi.
  return { locale, messages: MESSAGES[locale], timeZone: 'Asia/Ho_Chi_Minh' }
})
