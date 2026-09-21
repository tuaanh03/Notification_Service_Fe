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

/** Sao đúng `AppSecretDto` của backend. KHÔNG có plaintext — hệ thống chỉ lưu hash. */
export type AppSecretDto = {
  id: string
  /** `ews_<8 hex>…<4 ký tự cuối>` — đủ để nhận ra khoá, không đủ để dùng. */
  hint: string
  /** APP_SECRET_STATUSES: active | revoked */
  status: string
  createdAt: string
  revokedAt: string | null
}

/**
 * Trả về DUY NHẤT một lần, trong response của `POST /admin/apps/:appId/secrets` (UC-001 BR-4).
 * `apiKey` không vào DB, không vào event, không vào log — mất là phải cấp khoá mới.
 */
export type IssuedAppSecretDto = AppSecretDto & { apiKey: string }

/** Email của một người nhận, sao đúng `UserEmailView` của backend. */
export type UserEmailDto = {
  address: string
  /** SUBSCRIPTION_STATUSES: active | unsubscribed (tự ngắt) | invalid (thư dội về) */
  status: string
  /** user_unsubscribe | hard_bounce | complaint | null */
  suppressedReason: string | null
  /** Công tắc tổng L1: tắt mọi tin không bắt buộc. */
  optedOutOptional: boolean
}

/** Một người nhận trong danh sách, sao đúng `UserDto` của backend. */
export type RecipientDto = {
  userId: string
  /** Mã nhân viên do CHÍNH app service đặt — không duy nhất giữa các app. */
  externalId: string
  createdAt: string
  /** null = chưa khai email; đó thường là đáp án của "sao người này không nhận được thư". */
  email: UserEmailDto | null
}

/** Sao đúng `UserPageDto`. `total` để biết còn bao nhiêu trang. */
export type RecipientPageDto = {
  rows: RecipientDto[]
  total: number
  limit: number
  offset: number
}

/**
 * Một dòng trong bảng cài đặt nhận tin, sao đúng `TopicPreferenceDto`.
 *
 * HAI cột khác nhau, phải hiện cả hai:
 * - `optedIn`: người này ĐÃ BẤM gì. `null` = chưa đụng đến, đang theo `defaultMode`.
 * - `effectiveOptIn`: kết quả lớp L3 — CHỈ lớp này. Email chết (L0) hoặc `optedOutOptional` (L1)
 *   vẫn chặn thư dù `effectiveOptIn` là true.
 */
export type TopicPreferenceDto = {
  key: string
  name: string
  mandatory: boolean
  defaultMode: string
  optedIn: boolean | null
  effectiveOptIn: boolean
}

/**
 * Sao đúng `UserPreferencesDto`. `email` ở đây CỐ TÌNH không có địa chỉ — backend chỉ đưa trạng
 * thái. Địa chỉ lấy từ dòng trong danh sách người nhận.
 */
export type UserPreferencesDto = {
  externalId: string
  email: { status: string; optedOutOptional: boolean } | null
  topics: TopicPreferenceDto[]
}

/**
 * Kết cục ở người nhận của một lần gửi, sao đúng `NotificationSummaryDto.recipient`.
 * CỐ TÌNH không có địa chỉ email — địa chỉ nằm ở màn Người nhận, không nhân ra thêm.
 */
export type NotificationRecipientSummaryDto = {
  /** pending | sent | failed | skipped */
  status: string
  /** Vì sao KHÔNG gửi: no_channel | invalid | suppressed | opted_out_optional | opted_out */
  exclusionReason: string | null
  /** Lỗi từ máy chủ thư. Bắt đầu bằng `outcome_unknown` = không chắc thư đã đi hay chưa. */
  error: string | null
  sentAt: string | null
}

/**
 * Một dòng lịch sử gửi, sao đúng `NotificationSummaryDto` của backend
 * (`GET /admin/apps/:appId/notifications`). Không có nội dung thư.
 */
export type NotificationSummaryDto = {
  id: string
  /** Đường gửi trực tiếp của MVP chỉ ra: queued | sending | sent | no_recipient | failed */
  status: string
  topic: string
  /** null = người nhận đã không còn trong sổ. */
  externalId: string | null
  idempotencyKey: string | null
  /** null = worker chưa xử lý tới (còn `queued`). */
  recipient: NotificationRecipientSummaryDto | null
  createdAt: string
  queuedAt: string | null
  sendingAt: string | null
  finishedAt: string | null
}

/** Sao đúng `NotificationPageDto`. */
export type NotificationPageDto = {
  rows: NotificationSummaryDto[]
  total: number
  limit: number
  offset: number
}

/**
 * Sao đúng `NetworkRuleDto` của backend. Đây là allowlist nguồn gọi `/v1/*` của app:
 * `origin` = header Origin của trình duyệt, `ip` = dải CIDR IPv4 của máy gọi.
 */
export type NetworkRuleDto = {
  /** NETWORK_RULE_KINDS: ip | origin */
  kind: string
  value: string
}

/** Sao đúng `AuditEntryDto` của backend (`src/modules/audit/application/dto.ts`). */
export type AuditEntryDto = {
  id: string
  actor: string
  actorType: string
  /** Tên domain event, ví dụ `AppSecretIssued`. */
  action: string
  targetType: string
  targetId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  source: string
  at: string
}
