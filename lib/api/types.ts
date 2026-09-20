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
