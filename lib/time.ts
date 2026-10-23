/**
 * Giờ hiển thị của console — LUÔN là giờ Việt Nam (UTC+7), bất kể máy người xem đặt múi giờ nào.
 *
 * Backend lưu và trả UTC (`2026-09-26T07:50:12.345Z`). Đổi sang giờ Việt Nam CHỈ ở đây, lúc hiển thị.
 * Múi giờ ghi rõ trong `Intl.DateTimeFormat` nên máy chủ (container chạy UTC) và trình duyệt ra
 * cùng một chuỗi — không lệch lúc hydrate, không phụ thuộc cài đặt máy. Format cố định, không `toLocale*`.
 */
const TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const hourFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partsOf(format: Intl.DateTimeFormat, iso: string): Record<string, string> | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return Object.fromEntries(format.formatToParts(date).map((p) => [p.type, p.value]))
}

/** `2026-09-26T07:50:12Z` → `2026-09-26 14:50` (giờ Việt Nam). Chuỗi không đọc được thì trả nguyên. */
export function fmtDateTime(iso: string): string {
  const p = partsOf(dateTimeFormat, iso)
  return p ? `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` : iso
}

/** `2026-09-26T07:00:00Z` → `14:00` (giờ Việt Nam) — trục giờ của biểu đồ. */
export function fmtHour(iso: string): string {
  const p = partsOf(hourFormat, iso)
  return p ? `${p.hour}:${p.minute}` : iso
}

/** `2026-09-26T18:10:00Z` → `2026-09-27` (ngày ở Việt Nam) — khớp cột ngày của số liệu template. */
export function vnDateOf(iso: string): string | null {
  const p = partsOf(dateTimeFormat, iso)
  return p ? `${p.year}-${p.month}-${p.day}` : null
}

/** `2026-09-27` → `27/09` — trục ngày của biểu đồ. */
export const fmtDayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
