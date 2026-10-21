import type { Locale } from '@/i18n/locales'
import type { TemplateEditor } from '@/lib/template-editors'
import type { VisualDesign } from '@/lib/visual-design'
import type { TemplateCategory } from '@/lib/template-categories'

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

/** Một dòng màn Danh bạ — sao đúng `DirectoryPersonDto` của backend (ADR-0027, bổ sung). */
export type DirectoryPersonDto = {
  adminId: string
  email: string
  displayName: string | null
  isSuperAdmin: boolean
  /** Đã gắn tài khoản Microsoft 365. */
  m365Linked: boolean
  /** Có hiện trong hộp "Thêm thành viên" của các tổ chức không. */
  memberListed: boolean
}

export type DirectoryPeoplePageDto = { items: DirectoryPersonDto[]; total: number; limit: number; offset: number }

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
/** Khung giờ gửi (ADR-0032): 1 = thứ Hai … 7 = Chủ nhật; `HH:MM`, `end` có thể là `24:00`. */
export type SendWindowDto = { days: number[]; start: string; end: string }

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
  /** Đếm "đã mở" (ADR-0031). Optional: backend cũ chưa có. */
  trackOpens?: boolean
  /** Khung giờ gửi, giờ Việt Nam (ADR-0032). null = gửi mọi lúc. Optional: backend cũ chưa có. */
  sendWindow?: SendWindowDto | null
  /** Tin bắt buộc bỏ qua khung giờ. */
  mandatoryBypassWindow?: boolean
  /** Dàn đều: tối đa N thư / phút (ADR-0032 GĐ 2). null = không dàn. Optional: backend cũ chưa có. */
  sendPerMinute?: number | null
  /** Tin bắt buộc không bị dàn đều. */
  mandatoryBypassPacing?: boolean
  /** Trần tốc độ do Super Admin đặt — Admin App chỉ đặt dàn đều trong trần. null = không trần riêng. */
  maxSendPerMinute?: number | null
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
  /** Tên người cấp đặt (≤ 100 ký tự). Khoá cấp trước khi có tên -> `null`. */
  name: string | null
  /** APP_SECRET_STATUSES: active | revoked */
  status: string
  createdAt: string
  revokedAt: string | null
  /** Lần cuối khoá gọi `/v1` thành công — chính xác tới khoảng 5 phút. `null` = chưa dùng. */
  lastUsedAt: string | null
}

/**
 * Trả về DUY NHẤT một lần, trong response của `POST /admin/apps/:appId/secrets` (UC-001 BR-4).
 * `apiKey` không vào DB, không vào event, không vào log — mất là phải cấp khoá mới.
 */
export type IssuedAppSecretDto = AppSecretDto & { apiKey: string }

/**
 * Outgoing webhook (ADR-0029 của backend). Sự kiện app đăng ký được — sao đúng `WEBHOOK_EVENT_TYPES`
 * của backend. `ping` chỉ là lần "Gửi thử", không đăng ký được nên không có ở đây.
 */
export const WEBHOOK_EVENT_TYPES = ['notification.sent', 'notification.failed', 'notification.no_recipient', 'notification.opened'] as const
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

/** Sao đúng `WebhookEndpointDto`. KHÔNG có secret — secret chỉ có trong response tạo / đổi secret. */
export type WebhookEndpointDto = {
  id: string
  url: string
  events: WebhookEventType[]
  /** active | disabled */
  status: string
  createdAt: string
  updatedAt: string
}

/** `GET /admin/apps/:appId/webhooks`. `configured = false`: server thiếu `WEBHOOK_SIGNING_KEY`. */
export type WebhookListDto = { configured: boolean; endpoints: WebhookEndpointDto[] }

/** Response DUY NHẤT chứa secret (`whsec_…`) — tạo URL hoặc đổi secret. */
export type IssuedWebhookSecretDto = { endpoint: WebhookEndpointDto; secret: string }

/** Một lần EWS gọi (hoặc sẽ gọi lại) một URL. Không có body đã gửi, không có phản hồi của app. */
export type WebhookDeliveryDto = {
  id: string
  eventId: string
  /** một trong `WEBHOOK_EVENT_TYPES` hoặc `ping` */
  eventType: string
  /** pending | delivered | failed */
  status: string
  attempts: number
  lastStatusCode: number | null
  /** mã ngắn: `http_503` · `timeout` · `connection_failed: …` · `blocked_private_address` · `endpoint_disabled` */
  lastError: string | null
  nextAttemptAt: string | null
  createdAt: string
  deliveredAt: string | null
}

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
  /** Đếm "đã mở" ƯỚC LƯỢNG (ADR-0031 của backend). Optional: backend cũ chưa có. */
  firstOpenedAt?: string | null
  openCount?: number
}

/** Sao đúng `OpenTrackingDto` (`GET /admin/apps/:appId/open-tracking`). `ready` = server đủ cấu hình để chèn ảnh. */
export type OpenTrackingDto = {
  enabled: boolean
  ready: boolean
}

/**
 * Một dòng lịch sử gửi, sao đúng `NotificationSummaryDto` của backend
 * (`GET /admin/apps/:appId/notifications`). Không có nội dung thư.
 */
export type NotificationSummaryDto = {
  id: string
  /** api = app gọi `/v1` · dashboard = gửi từ màn Soạn thông báo. Optional: backend cũ chưa có. */
  origin?: string
  /** Đường gửi trực tiếp chỉ ra: scheduled (chờ khung giờ gửi) | queued | sending | sent | no_recipient | failed */
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
  /** `scheduled`: lúc thư sẽ đi theo giới hạn gửi của app (khung giờ / dàn đều — ADR-0032). Optional: backend cũ chưa có. */
  scheduledAt?: string | null
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
 * Sao đúng `NetworkRuleDto` của backend: allowlist IP gọi `/v1/*` và `/hooks/*` của app — MỘT địa chỉ
 * IP của máy gọi, backend so khớp chính xác, chưa có dải (CIDR). Chỉ Super Admin đọc / ghi.
 */
export type NetworkRuleDto = {
  /** NETWORK_RULE_KINDS: ip (Origin đã bỏ — bổ sung ADR-0023 của backend) */
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
  /** Đếm "đã mở" trong cửa sổ (ADR-0031): thư đã gửi CÓ chèn ảnh / trong đó đã mở. Optional: backend cũ chưa có. */
  opens?: { tracked: number; opened: number }
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
  /**
   * Kiểu soạn (ADR-0036 của backend); thiếu = `html`. `visual`: `design` là dự án GrapesJS + MJML (`VisualDesign`),
   * `text` backend sinh.
   */
  editor?: TemplateEditor
  design?: VisualDesign | null
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
  /** Một trong `TEMPLATE_CATEGORIES` (`lib/template-categories.ts`). */
  category: string
  /** active | archived */
  status: string
  publishedVersion: number | null
  publishedAt: string | null
  draftVersion: number | null
  /** Kiểu soạn của bản nháp (không có thì của bản đang xuất bản); thiếu = `html`. */
  editor?: TemplateEditor
  variableCount: number
  createdAt: string
  updatedAt: string
}

/** Sao đúng `TemplateDetailDto`: tóm tắt + mọi version, mới nhất trước. */
export type TemplateDetailDto = TemplateSummaryDto & { versions: TemplateVersionDto[] }

/**
 * Sao đúng `TemplatePresetDto` (`GET /admin/template-presets`, ADR-0035 / ADR-0037 của backend) — một mẫu dựng sẵn
 * ở MỘT ngôn ngữ thư. `mjml` là thứ "Dùng mẫu" nạp vào GrapesJS (`compileMjml`) để ra HTML + dự án; `html` backend
 * sinh sẵn chỉ để làm ảnh thu nhỏ. Cả hai còn nguyên `{{ … }}`. (`design` của backend console không đọc.)
 */
export type TemplatePresetDto = {
  id: string
  version: number
  category: TemplateCategory
  locale: Locale
  name: string
  description: string
  subject: string
  variables: TemplateVariableDto[]
  mjml: string
  html: string
}

/** Biến AI đề xuất thêm — `name` đã có tiền tố `payload.`; người soạn tick duyệt mới thêm vào bảng biến. */
export type AiSuggestedVariableDto = { name: string; required: boolean; description?: string; sample?: string }

/**
 * Đề xuất của "Nhờ AI soạn" (`POST …/templates/:id/ai-compose`) — CHƯA lưu gì; `issues` = kiểm như lúc
 * xuất bản, coi như MỌI biến đề xuất đã được thêm.
 */
export type AiComposeResultDto = {
  subject: string
  html: string
  text: string
  suggestedVariables?: AiSuggestedVariableDto[]
  issues: { code: string; message?: string; path?: string }[]
}

/**
 * Incoming webhook (ADR-0030 của backend). Sao đúng `IncomingHookDto` / `IssuedHookUrlDto` / `IncomingCallDto`
 * / `HookPreviewDto`. Token `ewshk_…` CHỈ có trong response tạo / đổi URL.
 */
export type IncomingVariableMapping =
  | { variable: string; kind: 'path'; path: string; defaultValue: string | null }
  | { variable: string; kind: 'fixed'; value: string }

export type IncomingCondition = { path: string; values: string[] }

export type IncomingHookDto = {
  id: string
  name: string
  topic: { id: string; key: string | null }
  template: { id: string; name: string | null; status: string | null; version: number | null }
  mappings: IncomingVariableMapping[]
  dedupePath: string | null
  condition: IncomingCondition | null
  /** active | disabled */
  status: string
  /** `ewshk_abcd…wxyz` */
  tokenHint: string
  /** TEMPLATE_NOT_PUBLISHED · TEMPLATE_ARCHIVED · TEMPLATE_NOT_FOUND · TOPIC_NOT_ACTIVE · TOPIC_NOT_FOUND
   *  · REQUIRED_VARIABLE_UNMAPPED · MAPPING_NOT_IN_TEMPLATE */
  warnings: { code: string; variable?: string }[]
  createdAt: string
  updatedAt: string
}

/** `configured = false`: server thiếu `WEBHOOK_SIGNING_KEY` — không tạo / lấy URL được. */
export type IncomingHookListDto = { configured: boolean; publicBaseUrl: string | null; hooks: IncomingHookDto[] }

/** Body tạo / sửa hook. */
export type IncomingHookConfigInput = {
  name: string
  topicId: string
  templateId: string
  mappings: IncomingVariableMapping[]
  dedupePath: string | null
  condition: IncomingCondition | null
}

export type IssuedHookUrlDto = { hook: IncomingHookDto; token: string; path: string; url: string | null }

export type IncomingCallDto = {
  id: string
  at: string
  httpStatus: number
  /** published | duplicate | skipped | rejected */
  outcome: string
  publicationId: string | null
  recipientCount: number | null
  errorCode: string | null
  /** Tên trường gắn với lỗi thiếu / sai kiểu (`["service"]`); null với lỗi khác và lần gọi cũ. */
  errorFields?: string[] | null
}

export type HookPreviewDto = {
  conditionMet: boolean
  dedupe: { source: 'header' | 'path' | 'body_hash'; value: string | null; windowMinutes: number }
  variables: {
    variable: string
    required: boolean
    source: 'path' | 'fixed' | 'same_name' | 'none'
    path: string | null
    value: string | number | boolean | null
    usedDefault: boolean
    missing: boolean
  }[]
  unusedMappings: string[]
  issues: { code: string; message?: string; path?: string }[]
  template: { name: string | null; status: string | null; version: number | null }
  rendered: { subject: string; html: string; text: string } | null
  renderIssues: { code: string; message?: string; path?: string }[]
}

/** Một dòng Cài đặt hệ thống (ADR-0030). `value` = giá trị hiệu lực (đã gộp mặc định). */
export type SystemSettingDto = {
  key: string
  /** int | url | bool */
  kind: string
  value: number | string | boolean | null
  default: number | string | boolean | null
  min: number | null
  max: number | null
  /** false = đang dùng mặc định */
  customized: boolean
  updatedBy: string | null
  updatedAt: string | null
}

/** Sao đúng `ConsoleSendResult` (`POST /admin/apps/:appId/notifications`). `code` = vì sao người đó không xếp hàng được. */
export type ConsoleSendResultDto = {
  queued: number
  results: { externalId: string; notificationId: string | null; code: string | null }[]
  /** Thư chờ giới hạn gửi của app: thư sớm / muộn nhất sẽ đi lúc nào (ADR-0032). Optional: backend cũ chưa có. */
  scheduledAt?: string | null
  lastScheduledAt?: string | null
}

/** Phần `PublicationDto` màn Soạn thông báo đọc (`POST /admin/apps/:appId/publications`). */
export type ConsolePublicationDto = {
  id: string
  topic: string
  recipientCount: number
  /** Thư con chờ giới hạn gửi của app: thư sớm / muộn nhất sẽ đi lúc nào (ADR-0032). Optional: backend cũ chưa có. */
  scheduledAt?: string | null
  lastScheduledAt?: string | null
}

/** Sao đúng `RenderedTemplateDto` (`POST …/templates/:id/render`) — bản đang xuất bản đã đổ biến. */
export type RenderedTemplateDto = {
  templateId: string
  name: string
  version: number
  subject: string
  html: string
  text: string
}

/** Nội dung một lần gửi từ console — viết thẳng HOẶC template + payload. */
export type ConsoleSendContent =
  /** `text` = bản chữ thường khi người gửi gõ ở ô "Nội dung thư" (backend nhận kèm, không thì tự sinh). */
  | { subject: string; html: string; text?: string }
  | { templateId: string; payload: Record<string, unknown> }

/** Một khoá đăng nhập đang giữ — màn "Theo dõi & Bảo mật" (ADR-0039 của backend). */
export type LoginLockDto = {
  /** `email` / `ip` = khoá tạm (tự mở lúc `until`); `account` = khoá hẳn, chỉ Super Admin mở. */
  kind: 'email' | 'ip' | 'account'
  /** Email (chữ thường) hoặc địa chỉ IP. */
  subject: string
  /** `null` = IP, hoặc email không có tài khoản EWS. */
  adminId: string | null
  displayName: string | null
  lockedAt: string
  until: string | null
}

/** Một dòng nhật ký chung (`GET /admin/audit/events`) — kèm email / tên người làm khi đó là tài khoản EWS. */
export type AuditEventDto = AuditEntryDto & { actorEmail: string | null; actorName: string | null; targetEmail: string | null }

export type AuditEventPageDto = {
  items: AuditEventDto[]
  /** Tổng số khớp bộ lọc. */
  total: number
  /** `null` = hết trang. */
  nextCursor: string | null
}
