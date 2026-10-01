import 'server-only'
import { getTranslations } from 'next-intl/server'
import vi from '@/messages/vi.json'
import { ApiError } from './problem'

/**
 * Mã lỗi backend có câu dịch. Chỉ nhận mã viết HOA (`INVALID_CREDENTIALS`…) để mã lạ từ backend
 * không trùng nhầm khoá nội bộ của nhóm `errors` (`unknown`, `withCode`…).
 */
type ErrorCode = Extract<keyof (typeof vi)['errors'], Uppercase<string>>
const isKnownCode = (code: string): code is ErrorCode => /^[A-Z_]+$/.test(code) && code in vi.errors

/**
 * Câu hiển thị cho người vận hành, theo ngôn ngữ đang chọn. Chạy ở server (Server Action /
 * Server Component) — câu đã dịch đi xuống trình duyệt trong `ActionResult.message`.
 *
 * Mã chưa có câu dịch thì nói "không thành công" kèm MÃ, KHÔNG hiện `detail` thô của backend:
 * đó là chuỗi kỹ thuật tiếng Anh, có thể chứa tên máy chủ nội bộ (lỗi mạng) và đổi bất cứ lúc nào.
 */
export async function messageOf(err: unknown): Promise<string> {
  const t = await getTranslations('errors')
  if (!(err instanceof ApiError)) return t('unknown')
  if (isKnownCode(err.code)) return t(err.code)
  if (err.status === 401 || err.status === 403) return t('forbidden')
  return t('unmapped', { code: err.code })
}

/** Như `messageOf` nhưng luôn kèm mã — cho màn báo lỗi toàn trang, người trực cần mã để tra. */
export async function describeError(err: ApiError): Promise<string> {
  const t = await getTranslations('errors')
  // `unmapped` đã có mã trong câu, không ghép thêm lần nữa.
  if (!isKnownCode(err.code) && err.status !== 401 && err.status !== 403) return messageOf(err)
  return t('withCode', { message: await messageOf(err), code: err.code })
}
