import type { Locale } from './locales'
import type vi from '@/messages/vi.json'

/** Khoá dịch có kiểu: `t('khoá.sai')` làm `tsc --noEmit` đỏ. */
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: typeof vi
  }
}
