/**
 * Dịch một khoá đến từ DỮ LIỆU (tên event audit, lý do chặn, mã lỗi…) — không biết trước nó có
 * câu dịch hay không. Có thì dịch, không thì trả `fallback` (mặc định là chính khoá đó).
 *
 * Khoá tĩnh viết thẳng `t('khoá')` để `tsc` kiểm; chỉ khoá động mới đi qua đây.
 */
type DynamicTranslator = {
  (key: never): string
  has: (key: never) => boolean
}

export function tOr(t: DynamicTranslator, key: string, fallback: string = key): string {
  // Khoá có dấu chấm sẽ bị next-intl hiểu là lồng nhóm — dữ liệu lạ như vậy không bao giờ là khoá.
  if (key.includes('.') || !t.has(key as never)) return fallback
  return t(key as never)
}
