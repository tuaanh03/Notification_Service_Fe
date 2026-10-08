import type { ApproveAppInput, CreateAppInput } from '@/lib/api/apps'
import type { CreateTopicInput } from '@/lib/api/topics'

/**
 * State của wizard đăng ký app — SAO ĐÚNG body mà backend nhận, không thêm field nào khác.
 *
 * Bản v0 trước đây có `description`, `technical_contact`, `severity`, `userMutable`, kênh riêng
 * cho từng topic và ô "quota đề xuất" ở bước 1. Backend KHÔNG có cột nào chứa chúng
 * (`admin-apps.routes.ts`, `admin-topics.routes.ts`), nên đã bỏ: nhập vào rồi mất im lặng còn
 * tệ hơn là không có ô (CLAUDE.md mục 2 — "field nào backend không có thì để trống").
 */

/** Sao đúng hằng `SLUG` ở biên backend — dùng cho CẢ `slug` và `namespace`. */
export const APP_SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/
export const APP_SLUG_TEXT = '^[a-z0-9][a-z0-9-]{1,62}$'
/** Sao đúng `TOPIC_KEY` của backend. Key KHÔNG mang tiền tố namespace — phạm vi là app trên URL. */
export const TOPIC_KEY = /^[a-z][a-z0-9_.-]{1,127}$/

/**
 * Giá trị của network rule. Backend chỉ kiểm độ dài 1–255, hai regex này là ràng buộc của
 * RIÊNG console để người nhập không gõ nhầm — đừng nói là backend ép.
 */
export const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i
/**
 * Hai hàm kiểm trả MÃ lỗi (khoá trong nhóm `validation` của `messages/*.json`), không trả câu —
 * file này không phải component nên không biết ngôn ngữ. Màn hình dịch qua `useNetworkValidators()`.
 */
export type NetworkValueError = 'originInvalid' | 'ipRange' | 'ipInvalid'

export const originError = (v: string): NetworkValueError | null => (ORIGIN_RE.test(v) ? null : 'originInvalid')

/** IPv4 đơn, mỗi phần 0–255. */
const IPV4_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

/** IPv6 đơn — để trình duyệt kiểm: `URL` chỉ nhận host `[…]` khi đó là IPv6 hợp lệ. */
function isIpv6(v: string): boolean {
  if (!v.includes(':')) return false
  try {
    new URL(`http://[${v}]/`)
    return true
  } catch {
    return false
  }
}

/**
 * MỘT địa chỉ IP, KHÔNG nhận dải. Backend so khớp chính xác từng địa chỉ (`network-access.ts`:
 * "CIDR để sau") và không kiểm định dạng — lưu `10.20.0.0/16` là app bị chặn `IP_NOT_ALLOWED`
 * với MỌI IP. Chặn ở đây là chỗ duy nhất đang chặn.
 */
export const ipError = (v: string): NetworkValueError | null =>
  v.includes('/') ? 'ipRange' : IPV4_RE.test(v) || isIpv6(v) ? null : 'ipInvalid'

/** Bước 1. `origins` / `ipAllowlist` đi thành `POST /apps/:id/network-rules`, không nằm trong body tạo app. */
export type ProfileDraft = CreateAppInput & {
  origins: string[]
  ipAllowlist: string[]
}

/** Bước 2 — đúng 4 field của `POST /admin/apps/:appId/topics`. */
export type TopicDraft = CreateTopicInput

/** Bước 4 — quyền cấp lúc duyệt. MVP chỉ gửi được email nên mặc định đúng một kênh. */
export type GrantDraft = { grantedChannels: string[]; rateLimitPerMinute: number; maxRecipientsPerEvent: number }

export const EMPTY_PROFILE: ProfileDraft = {
  orgId: '',
  slug: '',
  name: '',
  namespace: '',
  origin: 'internal',
  origins: [],
  ipAllowlist: [],
}

export const EMPTY_TOPIC: TopicDraft = { key: '', name: '', mandatory: false, defaultMode: 'opt_out' }

export const DEFAULT_GRANT: GrantDraft = {
  grantedChannels: ['email'],
  rateLimitPerMinute: 60,
  maxRecipientsPerEvent: 1000,
}

export const toGrant = (g: GrantDraft): ApproveAppInput => ({ ...g })

/**
 * Đủ điều kiện sang bước 2.
 *
 * Luật "app ngoài mạng bắt buộc ≥ 1 IP" là của console (UC-001), backend KHÔNG ép — nhưng
 * app `external` không khai IP thì ai cầm được khoá cũng gọi được, nên giữ.
 */
export const profileValid = (p: ProfileDraft) =>
  p.orgId !== '' &&
  APP_SLUG.test(p.slug) &&
  APP_SLUG.test(p.namespace) &&
  p.name.trim().length > 0 &&
  (p.origin === 'internal' || p.ipAllowlist.length > 0)

/** Đủ điều kiện sang bước 3: ≥ 1 topic, mọi topic hợp lệ, không trùng key. */
export const topicsValid = (topics: readonly TopicDraft[]) =>
  topics.length > 0 &&
  topics.every((t) => TOPIC_KEY.test(t.key) && t.name.trim().length > 0) &&
  new Set(topics.map((t) => t.key)).size === topics.length
