import en from '@/messages/en.json'
import vi from '@/messages/vi.json'
import type { Locale } from './locales'

/**
 * Hai bộ câu chữ, import CỐ ĐỊNH — không có đường nào để cookie chọn file khác.
 *
 * `vi.json` là bản gốc. Hai dòng `satisfies` dưới đây làm `tsc --noEmit` đỏ khi một bên thiếu
 * khoá mà bên kia có — thêm câu mới phải thêm ở CẢ HAI file.
 */
en satisfies typeof vi
vi satisfies typeof en

export const MESSAGES: Readonly<Record<Locale, typeof vi>> = { vi, en }
