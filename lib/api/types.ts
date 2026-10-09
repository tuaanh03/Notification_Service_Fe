/**
 * Hợp đồng dữ liệu với `ews-astrolink-api`. KHÔNG có `server-only` ở file này:
 * component client cần import type để nhận props. Chỉ type, không logic, không secret.
 *
 * Dùng `type` (không phải `interface`) để thoả `Record<string, unknown>` mà
 * `<DataTable>` yêu cầu — interface không có index signature ngầm.
 */

/** Vai trong org / trên app — sao đúng `ORG_ROLES` / `APP_ROLES` của backend (ADR-0022). */
export type OrgRole = 'owner' | 'org_admin' | 'member'

/** Một thành viên org — sao đúng `OrgMemberDto` của backend (ADR-0026). `displayName`: tên từ M365 (ADR-0027), `null` = chưa biết. */
export type OrgMemberDto = { orgId: string; adminId: string; email: string; displayName: string | null; role: OrgRole }

/** Một người có thể thêm vào org — sao đúng `MemberCandidateDto` của backend (ADR-0027). */
export type MemberCandidateDto = { adminId: string; email: string; displayName: string | null }

/** Kết quả một lượt đồng bộ danh bạ M365 — chỉ con số (ADR-0027). */
export type DirectorySyncDto = { total: number; created: number; linked: number; renamed: number; unchanged: number; conflicts: number }

/** Vai app còn hiệu lực của một người trên một app của org (ADR-0026). */
export type OrgAppRoleDto = { adminId: string; appId: string; role: AppRole }

/** Sao đúng `OrganizationDto` của backend (`tenancy/application/dto.ts`). */
export type OrganizationDto = {
  id: string
  accountId: string
  name: string
  createdAt: string
}
export type AppRole = 'app_admin' | 'app_viewer'

/** `GET /admin/me` — sao đúng `AdminProfileDto` của backend (`apps/application/queries/get-admin-profile.ts`). */
export type AdminProfileDto = {
  isSuperAdmin: boolean
  /**
   * Super Admin: mọi org, `role` = vai thành viên thật (null ở org không thuộc về). Người khác: org
   * mình là thành viên. Console app chỉ dùng org có `role` (`memberOrgs`); khu Quản trị EWS dùng hết.
   */
  orgs: { id: string; name: string; role: OrgRole | null }[]
  /** Vai cấp TRỰC TIẾP trên app. Owner / Org Admin còn có quyền ngầm trên mọi app của org. */
  appRoles: Record<string, AppRole>
}

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
  /** Gửi bằng template: tên + bản đã dùng (ADR-0020). null = nội dung viết thẳng. Optional: backend cũ chưa có. */
  template?: { id: string; name: string; version: number } | null
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
 * `origin` = header Origin của trình duyệt, `ip` = MỘT địa chỉ IP của máy gọi — backend so khớp
 * chính xác, chưa có dải (CIDR).
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

/**
 * Sao đúng `AppOverviewDto` của backend (`GET /admin/apps/:appId/overview`) — số liệu màn Tổng quan.
 * Mọi mốc giờ là UTC, màn hình tự đổi sang giờ địa phương.
 */
export type AppOverviewDto = {
  generatedAt: string
  /** 24 giờ gần nhất, trượt theo lúc gọi. */
  window: { from: string; to: string }
  /** Số lần gửi trong cửa sổ, và trong 24 giờ liền trước đó. */
  sends: { total: number; previousTotal: number }
  /** Theo trạng thái hiện tại — đủ 11 khoá, không có thì 0. */
  byStatus: Record<string, number>
  /** Vì sao bị chặn (`exclusion_reason`) — đủ mọi khoá, không có thì 0. */
  blocked: Record<string, number>
  /**
   * Đúng 24 cột, cũ trước; cột cuối là giờ hiện tại (chưa trọn).
   * sent = sent · failed = failed · blocked = no_recipient · pending = queued + sending
   */
  hourly: { hour: string; sent: number; failed: number; blocked: number; pending: number }[]
  /** Hàng chờ ngay lúc này. */
  queue: { waiting: number; oldestCreatedAt: string | null }
  recipients: { total: number; emailActive: number; emailUnsubscribed: number; emailInvalid: number }
  topics: { total: number; active: number }
}

/**
 * Một biến khai trong template, sao đúng `VariableSpec` của backend. `name` là đường dẫn đầy đủ
 * (`payload.vm_name`), `sample` / `description` chỉ để xem thử — không dùng lúc gửi thật.
 */
export type TemplateVariableDto = {
  name: string
  source: 'payload' | 'user'
  required: boolean
  sample?: string
  description?: string
}

/** Sao đúng `TemplateVersionDto` (`GET /admin/apps/:appId/templates/:id`). */
export type TemplateVersionDto = {
  id: string
  version: number
  /** draft | published | superseded */
  status: string
  subject: string
  html: string
  text: string
  variables: TemplateVariableDto[]
  aiGenerated: boolean
  /** id admin — backend chưa trả email nên màn hình chưa hiện. */
  createdBy: string | null
  publishedBy: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Sao đúng `TemplateSummaryDto` — một dòng của danh sách template. */
export type TemplateSummaryDto = {
  /** `templateId` app service gửi kèm để dùng template này. */
  id: string
  name: string
  channel: string
  /** active | archived */
  status: string
  publishedVersion: number | null
  publishedAt: string | null
  draftVersion: number | null
  variableCount: number
  createdAt: string
  updatedAt: string
}

/** Sao đúng `TemplateDetailDto`: tóm tắt + mọi version, mới nhất trước. */
export type TemplateDetailDto = TemplateSummaryDto & { versions: TemplateVersionDto[] }

/** Đề xuất của "Nhờ AI soạn" (`POST …/templates/:id/ai-compose`) — CHƯA lưu gì; `issues` = kiểm như lúc xuất bản. */
export type AiComposeResultDto = {
  subject: string
  html: string
  text: string
  issues: { code: string; message?: string; path?: string }[]
}
