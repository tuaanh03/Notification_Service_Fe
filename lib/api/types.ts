/**
 * Hợp đồng dữ liệu với `ews-astrolink-api`. KHÔNG có `server-only` ở file này:
 * component client cần import type để nhận props. Chỉ type, không logic, không secret.
 *
 * Dùng `type` (không phải `interface`) để thoả `Record<string, unknown>` mà
 * `<DataTable>` yêu cầu — interface không có index signature ngầm.
 */

/** Sao đúng `AppDto` của backend (`src/modules/apps/application/dto.ts`). */
export type AppDto = {
  id: string
  orgId: string
  accountId: string
  slug: string
  name: string
  namespace: string
  /** APP_STATUSES: draft | pending_approval | active | suspended | revoked */
  status: string
  /** APP_ORIGINS: internal | external */
  origin: string
  /** CHANNELS: email | sms | push | in_app */
  grantedChannels: readonly string[]
  rateLimitPerMinute: number
  maxRecipientsPerEvent: number
  includedInOrgBroadcast: boolean
  isSystem: boolean
  /** ISO-8601 UTC */
  createdAt: string
  updatedAt: string
}

/**
 * Sao đúng `TopicDto` của backend (`src/modules/topics/application/dto.ts`).
 *
 * Backend CHỈ có 8 field này. Mô tả / kênh mặc định / số ràng buộc / bộ lọc phân khúc
 * mà mock `Topic` đang có đều KHÔNG có nguồn thật — không dựng số giả trên màn quản trị.
 */
export type TopicDto = {
  id: string
  /** `^[a-z][a-z0-9_.-]{1,127}$` — KHÔNG mang tiền tố namespace, phạm vi là app trên URL. */
  key: string
  name: string
  /** TOPIC_STATUSES: draft | active | suspended */
  status: string
  /** Người dùng không tắt được (ADR-0016 D6 — chỉ admin đặt). */
  mandatory: boolean
  /** TOPIC_DEFAULT_MODES: opt_in (mặc định KHÔNG nhận) | opt_out (mặc định CÓ nhận) */
  defaultMode: string
  /** ISO-8601 UTC */
  createdAt: string
  updatedAt: string
}
