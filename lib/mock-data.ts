import type { NotificationStatus } from '@/lib/theme'
import { fmtDateTime } from '@/lib/time'
export type AppStatus = 'draft' | 'pending_approval' | 'active' | 'suspended' | 'revoked'
export type Channel = 'in_app' | 'email'
export type App = {
  name: string
  slug: string
  app_id: string
  /** Org sở hữu — app thật luôn có (`listVisibleApps`); mock để trống. */
  org_id?: string
  org_name?: string
  /** Giá trị `?app=` (`appKey()` trong `lib/app-routes.ts`): slug, hoặc slug kèm đuôi khi hai org trùng slug. */
  route_key?: string
  status: AppStatus
  namespace: string
  origin: 'internal' | 'external'
  granted_channels: Channel[]
  quota: number
  /** Backend chưa có hai field này (AppDto) — app thật để trống, UI hiện `—`. */
  topic_count?: number
  technical_contact?: string
  updated_at: string
  ip_allowlist?: string[]
  allowed_origins?: string[]
  directory?: { mode: string; synced_at: string }
  /** lần gửi đã dùng trong phút hiện tại — quota arc ở top bar */
  quota_used?: number
  /** nhóm rà soát khai sẵn cho 'Gửi thử cho nhóm rà soát' (UC-008 §D) — không nhập email tự do */
  reviewers?: string[]
  /** Super Admin cấp khi duyệt (UC-001 §C) */
  max_recipients_per_event?: number
  /** hạn mức khối lượng tháng — vượt mới bị đình chỉ (UC-001 §F) */
  monthly_used?: number
  monthly_limit?: number
}
export type Notification = {
  id: string
  topic_key: string
  status: string
  origin: 'api' | 'dashboard'
  recipients: number
  is_test?: boolean
  collapsed?: boolean
  occurrence_count?: number
  stale_directory?: boolean
  duplicate?: boolean
  parent_notification_id?: string
  created_at: string
  /** `vm_high_load v2` — template đã dùng (undefined = soạn nhanh / in_app) */
  template?: string
  /** api → app_id (mono); dashboard → tên người thật (UC-005 §A: bất đối xứng có chủ đích) */
  sender?: string
  /** lần gửi tay cần duyệt — hiện cả "Soạn bởi" và "Duyệt bởi" (07 §B6) */
  approved_by?: string
  idempotency_key?: string
  scheduled_at?: string
}
export type AuditEntry = {
  actor: string
  action: string
  from?: string
  to?: string
  timestamp: string
  source: string
}
export const apps: App[] = [
  {
    name: 'EWS Hypervisor',
    slug: 'ews-hypervisor',
    app_id: '6f1c9d2e-8a4b-4c3d-9e2f-1a2b3c4d5e6f',
    status: 'active',
    namespace: 'hypervisor',
    origin: 'internal',
    granted_channels: ['in_app', 'email'],
    quota: 60,
    topic_count: 3,
    technical_contact: 'minh.tran@enterprise.vn',
    updated_at: '10 phút trước',
    allowed_origins: ['https://ops.enterprise.vn'],
    quota_used: 12,
    max_recipients_per_event: 500,
    monthly_used: 42810,
    monthly_limit: 100000,
    reviewers: ['minh.tran@enterprise.vn', 'lan.nguyen@enterprise.vn', 'qa.lead@enterprise.vn'],
  },
  {
    name: 'EWS Starchart',
    slug: 'ews-starchart',
    app_id: '8a2e4c6f-1b3d-4e5f-9a7c-2d4b6e8f0a1c',
    status: 'active',
    namespace: 'starchart',
    origin: 'internal',
    granted_channels: ['in_app', 'email'],
    quota: 60,
    topic_count: 1,
    technical_contact: 'lan.nguyen@enterprise.vn',
    updated_at: '2 giờ trước',
    quota_used: 3,
    max_recipients_per_event: 200,
    monthly_used: 6120,
    monthly_limit: 50000,
  },
  {
    name: 'AI Gateway',
    slug: 'ai-gateway',
    app_id: '3d7f9b1e-5a2c-4c8d-b6e0-9f1a2b3c4d5e',
    status: 'active',
    namespace: 'ai-gateway',
    origin: 'external',
    granted_channels: ['email'],
    quota: 30,
    topic_count: 1,
    technical_contact: 'ops@ai-gateway.example',
    updated_at: '3 ngày trước',
    ip_allowlist: ['10.20.0.0/16'],
    allowed_origins: ['https://ai-gateway.example'],
    directory: { mode: 'push', synced_at: '2026-09-07T08:00:00Z' },
    quota_used: 27,
    max_recipients_per_event: 100,
    monthly_used: 18400,
    monthly_limit: 20000,
  },
  {
    name: 'EWS Atlas',
    slug: 'ews-atlas',
    app_id: '5e4d3c2b-1a9f-8e7d-6c5b-4a3f2e1d0c9b',
    status: 'pending_approval',
    namespace: 'atlas',
    origin: 'internal',
    granted_channels: ['in_app', 'email'],
    quota: 60,
    topic_count: 1,
    technical_contact: 'hoa.le@enterprise.vn',
    updated_at: 'hôm qua',
    max_recipients_per_event: 500,
  },
]
export type SegmentFilterField = 'user_tag' | 'country' | 'session_count' | 'customer_code' | 'identified'
export type SegmentFilterOperator = 'is' | 'is_not' | 'greater_than' | 'less_than' | 'contains'

export type SegmentFilterRule = {
  id: string
  field: SegmentFilterField
  operator: SegmentFilterOperator
  value: string
  tag_name?: string
}

export type SegmentFilterGroup = {
  id: string
  conjunction: 'where' | 'or'
  rules: SegmentFilterRule[]
  subscribed_records?: number
}

export type Topic = {
  topic_key: string
  user_mutable: boolean
  bindings: number
  name?: string
  description?: string
  status?: 'draft' | 'active' | 'suspended'
  default_channels?: Channel[]
  /** `pull` = EWS Tổng gọi resolver; `push` = app ngoài mạng đẩy snapshot */
  directory_mode?: 'pull' | 'push'
  filter_groups?: SegmentFilterGroup[]
}
export const topics: Topic[] = [
  {
    topic_key: 'hypervisor.warning_resources',
    user_mutable: true,
    bindings: 15,
    name: 'Cảnh báo tài nguyên',
    description: 'Bộ lọc người nhận khi máy chủ vượt ngưỡng CPU, RAM hoặc dung lượng Disk',
    status: 'active',
    default_channels: ['in_app', 'email'],
    directory_mode: 'pull',
    filter_groups: [
      {
        id: 'fg-1',
        conjunction: 'where',
        rules: [
          { id: 'r-1', field: 'user_tag', tag_name: 'test', operator: 'is', value: 'con gà' },
          { id: 'r-2', field: 'user_tag', tag_name: 'priority', operator: 'is', value: 'high' },
        ],
        subscribed_records: 2,
      },
      {
        id: 'fg-2',
        conjunction: 'or',
        rules: [
          { id: 'r-3', field: 'session_count', operator: 'greater_than', value: '2' },
        ],
        subscribed_records: 9,
      },
      {
        id: 'fg-3',
        conjunction: 'or',
        rules: [
          { id: 'r-4', field: 'country', operator: 'is', value: 'Vietnam (VN)' },
        ],
        subscribed_records: 4,
      },
    ],
  },
  {
    topic_key: 'hypervisor.maintenance',
    user_mutable: true,
    bindings: 8,
    name: 'Bảo trì',
    description: 'Thông báo kế hoạch bảo trì định kỳ cụm máy chủ và hệ điều hành',
    status: 'active',
    default_channels: ['in_app', 'email'],
    directory_mode: 'pull',
    filter_groups: [
      {
        id: 'fg-m1',
        conjunction: 'where',
        rules: [
          { id: 'r-m1', field: 'user_tag', tag_name: 'role', operator: 'is', value: 'devops' },
        ],
        subscribed_records: 8,
      },
    ],
  },
  {
    topic_key: 'system.security_alert',
    user_mutable: false,
    bindings: 32,
    name: 'Cảnh báo bảo mật',
    status: 'active',
    default_channels: ['email'],
    directory_mode: 'pull',
  },
  {
    topic_key: 'starchart.release',
    user_mutable: true,
    bindings: 12,
    name: 'Bản phát hành',
    status: 'active',
    default_channels: ['in_app', 'email'],
    directory_mode: 'pull',
  },
  {
    topic_key: 'atlas.data_quality',
    user_mutable: false,
    bindings: 0,
    name: 'Chất lượng dữ liệu',
    status: 'draft',
    default_channels: ['in_app', 'email'],
    directory_mode: 'pull',
  },
  {
    topic_key: 'ai-gateway.quota_alert',
    user_mutable: true,
    bindings: 3,
    name: 'Cảnh báo quota AI',
    status: 'active',
    default_channels: ['email'],
    directory_mode: 'push',
  },
  {
    topic_key: 'hypervisor.incident',
    user_mutable: false,
    bindings: 5,
    name: 'Sự cố hạ tầng',
    description: 'Thông báo khẩn cấp khi hệ thống gặp lỗi gián đoạn dịch vụ',
    status: 'active',
    default_channels: ['in_app', 'email'],
    directory_mode: 'pull',
    filter_groups: [
      {
        id: 'fg-i1',
        conjunction: 'where',
        rules: [
          { id: 'r-i1', field: 'user_tag', tag_name: 'on_call', operator: 'is', value: 'true' },
        ],
        subscribed_records: 5,
      },
    ],
  },
]
/* ---- UC-002 Users ≠ Subscriptions: user = con người, subscription = điểm nhận. Hai con số khác nhau. ---- */
export type UserSource = 'directory' | 'import' | 'self'
export type User = {
  id: string
  name: string
  external_id: string
  email: string
  phone?: string
  customer_code?: string
  source: UserSource
  /** false = đã bấm Cho phép nhưng app chưa gọi identify() */
  identified: boolean
  /** số điểm nhận — luôn tính từ subscriptions[], không nhập tay */
  subscriptions: number
  mergedFrom?: string
  /** khoá nhận diện đã khớp khi gộp (external_id → email → phone → device token) */
  mergedKey?: 'external_id' | 'email' | 'phone' | 'device_token'
  created_at: string
  last_seen: string
  updated_at: string
}
const FIRST = ['Minh', 'Lan', 'Hoa', 'Tuấn', 'Hương', 'Long', 'Thảo', 'Đức', 'Vy', 'Khoa']
const LAST = ['Trần', 'Nguyễn', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi']

const generateUserUUID = (i: number): string => {
  const pad = (num: number, len: number) => Math.abs(num % (16 ** len)).toString(16).padStart(len, '0')
  return `${pad(0xc4b8e21a + i * 0x1f3d5, 8)}-${pad(0x5f3d + i * 0x3b7, 4)}-4${pad(0xe8c + i * 0x17, 3)}-8${pad(0xa1b + i * 0x29, 3)}-${pad(0x7e6d5c4b3a2f + i * 0x9876543, 12)}`
}

export const users: User[] = Array.from({ length: 40 }, (_, i) => ({
  id: generateUserUUID(i),
  name: i === 3 ? '' : `${LAST[i % LAST.length]} ${FIRST[i % FIRST.length]}`,
  external_id: i === 3 ? '' : `EXT-${String(1001 + i)}`,
  email: i === 3 ? '' : `user${i + 1}@enterprise.vn`,
  phone: i % 5 === 0 ? `09${String(10000000 + i * 7919).slice(0, 8)}` : undefined,
  customer_code: i % 4 === 1 ? `KH-${String(500 + i)}` : undefined,
  source: i % 4 === 0 ? 'directory' : i % 4 === 1 ? 'import' : 'self',
  identified: i !== 3,
  subscriptions: i % 5 === 0 ? 2 : 1,
  mergedFrom: i === 8 ? 'user-legacy-08' : undefined,
  mergedKey: i === 8 ? 'email' : undefined,
  created_at: `2026-0${1 + (i % 8)}-${String(3 + (i % 20)).padStart(2, '0')}`,
  last_seen: `${1 + (i % 9)} ngày trước`,
  updated_at: `${1 + (i % 12)} giờ trước`,
}))

export const userById = (id: string) =>
  users.find((u, idx) => u.id === id || id === `user-${idx + 1}`)

export type UserTag = {
  id: string
  user_id: string
  key: string
  value: string
  type: 'string' | 'number' | 'boolean'
  updated_at: string
}

export const userTags: UserTag[] = [
  // user 0 tags (phù hợp với các rules của topic warning_resources, maintenance)
  { id: 'ut-1', user_id: users[0]?.id ?? 'user-1', key: 'test', value: 'con gà', type: 'string', updated_at: '2026-09-12' },
  { id: 'ut-2', user_id: users[0]?.id ?? 'user-1', key: 'priority', value: 'high', type: 'string', updated_at: '2026-09-11' },
  { id: 'ut-3', user_id: users[0]?.id ?? 'user-1', key: 'country', value: 'Vietnam (VN)', type: 'string', updated_at: '2026-09-10' },
  { id: 'ut-4', user_id: users[0]?.id ?? 'user-1', key: 'session_count', value: '5', type: 'number', updated_at: '2026-09-12' },
  { id: 'ut-5', user_id: users[0]?.id ?? 'user-1', key: 'role', value: 'devops', type: 'string', updated_at: '2026-09-08' },
  { id: 'ut-6', user_id: users[0]?.id ?? 'user-1', key: 'vip', value: 'true', type: 'boolean', updated_at: '2026-09-05' },

  // user 1 tags
  { id: 'ut-7', user_id: users[1]?.id ?? 'user-2', key: 'role', value: 'qa_lead', type: 'string', updated_at: '2026-09-09' },
  { id: 'ut-8', user_id: users[1]?.id ?? 'user-2', key: 'country', value: 'Singapore (SG)', type: 'string', updated_at: '2026-09-08' },
  { id: 'ut-9', user_id: users[1]?.id ?? 'user-2', key: 'on_call', value: 'true', type: 'boolean', updated_at: '2026-09-10' },

  // user 2 tags
  { id: 'ut-10', user_id: users[2]?.id ?? 'user-3', key: 'test', value: 'con gà', type: 'string', updated_at: '2026-09-07' },
  { id: 'ut-11', user_id: users[2]?.id ?? 'user-3', key: 'priority', value: 'low', type: 'string', updated_at: '2026-09-06' },
]

export const tagsOf = (userId: string): UserTag[] => {
  const u = userById(userId)
  const realId = u ? u.id : userId
  const specific = userTags.filter((t) => t.user_id === realId || t.user_id === userId)
  if (specific.length > 0) return specific
  return [
    { id: `ut-${realId}-1`, user_id: realId, key: 'role', value: 'member', type: 'string', updated_at: '2026-09-01' },
    { id: `ut-${realId}-2`, user_id: realId, key: 'country', value: 'Vietnam (VN)', type: 'string', updated_at: '2026-09-01' },
  ]
}

export type SubscriptionChannel = 'email' | 'sms' | 'web_push' | 'mobile_push' | 'in_app'
export type SubscriptionStatus = 'active' | 'unsubscribed' | 'invalid'
export type Subscription = {
  id: string
  user_id: string
  channel: SubscriptionChannel
  value: string
  status: SubscriptionStatus
  source: UserSource
  app: string
  created_at: string
  last_used?: string
  /** bounce / lỗi gần nhất — chỉ có ở invalid */
  error?: string
  /** unsubscribed: ai tắt, lúc nào */
  unsubscribed_at?: string
  unsubscribed_by?: string
}
/** Một dòng / một điểm nhận. user i%5==0 có thêm sms; i%9==2 invalid; i%7==4 unsubscribed. */
export const subscriptions: Subscription[] = users.flatMap((u, i): Subscription[] => {
  const status: SubscriptionStatus = i % 9 === 2 ? 'invalid' : i % 7 === 4 ? 'unsubscribed' : 'active'
  const email: Subscription = {
    id: `sub-${u.id}-email`,
    user_id: u.id,
    channel: 'email',
    value: u.email || `anon-${i + 1}@device.local`,
    status,
    source: u.source,
    app: i % 3 === 2 ? 'ews-starchart' : 'ews-hypervisor',
    created_at: u.created_at,
    last_used: `${1 + (i % 6)} ngày trước`,
    error: status === 'invalid' ? `550 mailbox unavailable · 2026-09-${String(3 + (i % 5)).padStart(2, '0')}` : undefined,
    unsubscribed_at: status === 'unsubscribed' ? `2026-09-0${1 + (i % 7)}` : undefined,
    unsubscribed_by: status === 'unsubscribed' ? (i % 2 ? 'chính chủ' : 'admin — Nguyễn Lan') : undefined,
  }
  const sms: Subscription[] = u.phone
    ? [{ id: `sub-${u.id}-sms`, user_id: u.id, channel: 'sms', value: u.phone, status: 'active', source: u.source, app: 'ews-hypervisor', created_at: u.created_at }]
    : []
  return [email, ...sms]
})
export const subscriptionsOf = (userId: string) => subscriptions.filter((s) => s.user_id === userId)
/** Che giá trị: email `us***@enterprise.vn`, phone `09******12`, token `tok_…a1b2` */
export const maskValue = (channel: SubscriptionChannel, value: string) => {
  if (channel === 'email') return value.replace(/^(.{2}).*(@.*)$/, '$1***$2')
  if (channel === 'sms') return value.replace(/^(\d{2})\d+(\d{2})$/, '$1******$2')
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
/** Stat row /users — hai con số khác nhau, không bao giờ gộp làm một (UC-002). */
export const userStats = () => ({
  users: users.length,
  subscriptions: subscriptions.length,
  active: subscriptions.filter((s) => s.status === 'active').length,
  invalid: subscriptions.filter((s) => s.status === 'invalid').length,
  unsubscribed: subscriptions.filter((s) => s.status === 'unsubscribed').length,
})
/** "Đang nhận gì" của một user — trả lời "vì sao nhận" (UC-002 BR-5). */
export type ReceivingRow = {
  topic_key: string
  channel: SubscriptionChannel
  reason: string
  status: 'đang nhận' | 'đã tắt' | 'bắt buộc'
  off_at?: string
  off_by?: string
  user_mutable: boolean
}
export const receivingOf = (userId: string): ReceivingRow[] => {
  const i = users.findIndex((u) => u.id === userId)
  if (i < 0) return []
  const rows: ReceivingRow[] = [
    { topic_key: 'system.security_alert', channel: 'email', reason: 'toàn hệ thống', status: 'bắt buộc', user_mutable: false },
    { topic_key: 'hypervisor.warning_resources', channel: 'email', reason: i % 3 === 0 ? 'role:qa_lead' : 'cá nhân', status: 'đang nhận', user_mutable: true },
  ]
  if (i % 4 === 0) rows.push({ topic_key: 'hypervisor.maintenance', channel: 'in_app', reason: 'group:platform', status: 'đang nhận', user_mutable: true })
  if (i % 7 === 4)
    rows.push({ topic_key: 'starchart.release', channel: 'email', reason: 'cá nhân', status: 'đã tắt', off_at: `2026-09-0${1 + (i % 7)}`, off_by: i % 2 ? 'bạn' : 'admin — Nguyễn Lan', user_mutable: true })
  return rows
}
export const userAudit = (userId: string): AuditEntry[] => {
  const u = userById(userId)
  if (!u) return []
  return [
    ...(u.mergedFrom
      ? [{ actor: 'system', action: `gộp định danh (khớp ${u.mergedKey})`, from: u.mergedFrom, to: u.id, timestamp: '20 ngày trước', source: 'import' }]
      : []),
    { actor: 'minh.tran', action: 'thêm binding type=user', to: 'hypervisor.warning_resources', timestamp: '9 ngày trước', source: 'admin' },
    { actor: u.name || 'ẩn danh', action: 'tắt topic', from: 'starchart.release', to: 'đã tắt', timestamp: '6 ngày trước', source: 'self' },
    { actor: 'lan.nguyen', action: 'bật lại (ticket SD-4821)', from: 'unsubscribed', to: 'active', timestamp: '2 ngày trước', source: 'admin' },
    { actor: u.source === 'directory' ? 'directory-sync' : 'import', action: 'tạo hồ sơ', timestamp: u.created_at, source: u.source },
  ]
}
/** §F Nguồn 1 — người dùng tự bấm Cho phép; chỉ vào topic auto_subscribe */
export const selfRegistrations = subscriptions
  .filter((s) => s.source === 'self')
  .slice(0, 4)
  .map((s) => ({ ...s, auto_topics: ['system.security_alert', 'hypervisor.warning_resources'] }))

/* ---- §C Import CSV dry-run ---- */
export const IMPORT_COLUMNS = [
  { name: 'external_id', required: true, note: 'khoá nhận diện chính' },
  { name: 'full_name', required: true, note: '' },
  { name: 'email', required: false, note: 'trống được nếu có phone' },
  { name: 'phone', required: false, note: 'trống được nếu có email' },
  { name: 'customer_code', required: false, note: '' },
] as const
export const MERGE_KEY_ORDER = ['external_id', 'email', 'phone', 'device_token'] as const
export type ImportCreatedRow = { line: number; external_id: string; full_name: string; email?: string; phone?: string }
export type ImportMergedRow = ImportCreatedRow & { matched_user: string; matched_key: (typeof MERGE_KEY_ORDER)[number] }
export type ImportConflictRow = ImportCreatedRow & { user_a: string; user_b: string }
export type ImportErrorRow = { line: number; reason: string }
export const importPreview = {
  created: [
    { line: 2, external_id: 'EXT-2001', full_name: 'Phan Quang', email: 'quang.phan@enterprise.vn', phone: '0912345678' },
    { line: 3, external_id: 'EXT-2002', full_name: 'Đỗ Hạnh', email: 'hanh.do@enterprise.vn' },
    { line: 4, external_id: 'EXT-2003', full_name: 'Lý Kiên', phone: '0987654321' },
  ] as ImportCreatedRow[],
  createdTotal: 41,
  merged: [
    { line: 5, external_id: 'EXT-1001', full_name: 'Trần Minh', email: 'user1@enterprise.vn', matched_user: 'user-1', matched_key: 'external_id' },
    { line: 9, external_id: 'EXT-9009', full_name: 'Nguyễn Lan', email: 'user2@enterprise.vn', matched_user: 'user-2', matched_key: 'email' },
    { line: 12, external_id: 'EXT-9012', full_name: 'Lê Hoa', phone: '0910000000', matched_user: 'user-6', matched_key: 'phone' },
  ] as ImportMergedRow[],
  mergedTotal: 6,
  conflicts: [
    { line: 17, external_id: 'EXT-9017', full_name: 'Phạm Tuấn', email: 'user4@enterprise.vn', phone: '0910055433', user_a: 'user-4', user_b: 'user-11' },
    { line: 23, external_id: 'EXT-9023', full_name: 'Hoàng Hương', email: 'user5@enterprise.vn', phone: '0910071138', user_a: 'user-5', user_b: 'user-16' },
  ] as ImportConflictRow[],
  errors: [
    { line: 8, reason: 'email và phone đều trống' },
    { line: 14, reason: 'email không đúng định dạng: "abc@"' },
    { line: 31, reason: 'external_id trùng trong chính file (dòng 30)' },
  ] as ImportErrorRow[],
}
/** Số subscription sẽ sinh cho một dòng — email + sms → 2 */
export const subscriptionsFromRow = (r: ImportCreatedRow) => {
  const ch = [r.email && 'email', r.phone && 'sms'].filter(Boolean) as string[]
  return { channels: ch, count: ch.length }
}
export const IMPORT_SAMPLE_CSV = 'external_id,full_name,email,phone,customer_code\nEXT-2001,Phan Quang,quang.phan@enterprise.vn,0912345678,KH-901\nEXT-2002,Đỗ Hạnh,hanh.do@enterprise.vn,,\nEXT-2003,Lý Kiên,,0987654321,KH-903'

/* ---- §E Sync danh bạ từ App Service ---- */
export type SyncStatus = { app: string; mode: 'pull' | 'push'; synced_at: string; users: number; groups: number }
export const syncStatuses: SyncStatus[] = [
  { app: 'ews-hypervisor', mode: 'pull', synced_at: '2026-09-12T08:45:00Z', users: 412, groups: 18 },
  { app: 'ews-starchart', mode: 'pull', synced_at: '2026-09-12T08:30:00Z', users: 96, groups: 5 },
  { app: 'ai-gateway', mode: 'push', synced_at: '2026-09-07T08:00:00Z', users: 9, groups: 1 },
]
export const SYNC_PAYLOAD = `POST /v1/directory/snapshot
{
  "app_id": "3d7f9b1e-…",
  "synced_at": "2026-09-07T08:00:00Z",
  "users": [
    { "external_id": "ML-017", "full_name": "…", "email": "…", "groups": ["ml-platform"] }
  ],
  "groups": [{ "key": "ml-platform", "members": 9 }]
}`
export type BindingStatus = 'included' | 'excluded' | 'broken'
export type Binding = {
  topic_key: string
  /** `role:qa_lead` | `user:tran-minh` | `group:platform` */
  target: string
  status: BindingStatus
  /** live count khi bung ra */
  members: number
  /** `ews_central` | `app:{app_id}` */
  directory?: string
  added_by?: string
  added_at?: string
}
export const bindings: Binding[] = [
  {
    topic_key: 'hypervisor.warning_resources',
    target: 'role:qa_lead',
    status: 'included',
    members: 14,
    directory: 'ews_central',
    added_by: 'minh.tran',
    added_at: 'hôm qua',
  },
  {
    topic_key: 'hypervisor.warning_resources',
    target: 'user:tran-minh',
    status: 'included',
    members: 1,
    directory: `app:${apps[0].app_id}`,
    added_by: 'minh.tran',
    added_at: 'hôm qua',
  },
  {
    topic_key: 'hypervisor.warning_resources',
    target: 'user:le-hoa',
    status: 'excluded',
    members: 1,
    directory: 'ews_central',
    added_by: 'minh.tran',
    added_at: 'hôm qua',
  },
  {
    topic_key: 'ai-gateway.quota_alert',
    target: 'group:ml-platform',
    status: 'included',
    members: 9,
    directory: `app:${apps[2].app_id}`,
    added_by: 'ops',
    added_at: '5 ngày trước',
  },
  {
    topic_key: 'hypervisor.incident',
    target: 'role:oncall',
    status: 'broken',
    members: 0,
    directory: 'ews_central',
    added_by: 'lan.nguyen',
    added_at: '3 ngày trước',
  },
]
export const bindingsOf = (topicKey: string) => bindings.filter((b) => b.topic_key === topicKey)
const statuses = [
  'draft',
  'pending_approval',
  'scheduled',
  'queued',
  'sending',
  'sent',
  'partially_failed',
  'no_recipient',
  'stopped',
  'cancelled',
  'failed',
]
export const notifications: Notification[] = Array.from({ length: 25 }, (_, i) => ({
  id: `ntf_${String(i + 1).padStart(3, '0')}`,
  topic_key: i % 3 === 0 ? 'hypervisor.warning_resources' : 'system.security_alert',
  status: statuses[i < 11 ? i : i % 11],
  origin: i % 2 ? 'dashboard' : 'api',
  recipients: i === 7 ? 0 : 120 + i * 13,
  is_test: i === 2,
  // cờ đặt lên bản ghi api (i chẵn) để panel Payload (07 §B5) giải thích được
  collapsed: i === 6 || i === 16,
  occurrence_count: i === 6 ? 7 : undefined,
  stale_directory: i === 14,
  duplicate: i === 18,
  parent_notification_id: i === 20 ? 'ntf_004' : undefined,
  created_at: `2026-09-${String(10 - (i % 8)).padStart(2, '0')}T${String(8 + (i % 10)).padStart(2, '0')}:20:00Z`,
  template: i % 3 === 0 ? 'vm_high_load v2' : 'security_alert v1',
  sender: i % 2 ? (i % 4 === 1 ? 'Trần Minh' : 'Nguyễn Lan') : apps[i % 3 === 0 ? 0 : 1].app_id,
  approved_by: i % 2 && i % 6 === 1 ? 'Lê Hoa' : undefined,
  idempotency_key: i % 2 ? undefined : `alert-${88200 + i}`,
}))
export type Template = {
  key: string
  versions: string[]
  /** namespace app sở hữu — binding chỉ hợp lệ khi trùng namespace topic (05 §F: 403) */
  namespace?: string
  /** version đang published — dùng làm label ở Composer (`vm_high_load v2`) */
  published?: string
  /** subject/body của version published, có `{{ }}` để Composer render thật (UC-008 §D) */
  subject?: string
  body?: string
  /** UC-006 §A/§B — meta cho list + editor (optional để màn khác không vỡ) */
  name?: string
  channel?: Channel
  status?: 'active' | 'archived'
  updated_by?: string
  ai_generated?: boolean
  /** body HTML đầy đủ cho editor; `body` ở trên là bản text cho MailFrame/Composer */
  html?: string
  schema?: VariableSchemaEntry[]
  history?: TemplateVersion[]
}
export type TemplateVersion = {
  version: string
  status: 'published' | 'superseded' | 'draft'
  by: string
  at: string
  /** tóm tắt diff so với version trước: `+1 biến`, `sửa subject` */
  diff: string
  subject: string
  html: string
}
export const templates: Template[] = [
  {
    key: 'vm_high_load',
    namespace: 'hypervisor',
    versions: ['v1 superseded', 'v2 published'],
    published: 'v2',
    subject: '[{{alert_title}}] {{vm_name}} vượt {{threshold}}%',
    body: 'Máy ảo {{vm_name}} ({{vm_ip}}) đang dùng {{current_usage}}% tài nguyên, vượt ngưỡng {{threshold}}%. Chủ sở hữu: {{owner}}. Xử lý tại {{action_url}}.',
    name: 'Cảnh báo VM quá tải',
    channel: 'email',
    status: 'active',
    updated_by: 'minh.tran',
    html: '<h2>{{alert_title}}</h2>\n<p>Máy ảo <strong>{{vm_name}}</strong> ({{vm_ip}}) đang dùng {{current_usage}}% tài nguyên,\nvượt ngưỡng {{threshold}}%.</p>\n<p>Chủ sở hữu: {{owner}}</p>\n<p><a href="{{action_url}}">Xử lý ngay</a></p>',
    history: [
      { version: 'v1', status: 'superseded', by: 'minh.tran', at: '2026-07-02', diff: 'bản đầu', subject: '{{vm_name}} vượt {{threshold}}%', html: '<p>Máy ảo {{vm_name}} đang dùng {{current_usage}}%.</p>\n<p><a href="{{action_url}}">Xử lý</a></p>' },
      { version: 'v2', status: 'published', by: 'lan.nguyen', at: '2026-08-15', diff: '+3 biến · sửa subject', subject: '[{{alert_title}}] {{vm_name}} vượt {{threshold}}%', html: '<h2>{{alert_title}}</h2>\n<p>Máy ảo <strong>{{vm_name}}</strong> ({{vm_ip}}) đang dùng {{current_usage}}% tài nguyên,\nvượt ngưỡng {{threshold}}%.</p>\n<p>Chủ sở hữu: {{owner}}</p>\n<p><a href="{{action_url}}">Xử lý ngay</a></p>' },
    ],
  },
  {
    key: 'vm_high_load_readonly',
    namespace: 'hypervisor',
    versions: ['v1 published'],
    published: 'v1',
    subject: '[Theo dõi] {{vm_name}} vượt {{threshold}}%',
    body: 'Máy ảo {{vm_name}} đang dùng {{current_usage}}%. Bạn nhận bản theo dõi, không cần hành động.',
    name: 'Cảnh báo VM (bản theo dõi)',
    channel: 'email',
    status: 'active',
    updated_by: 'AI · minh.tran',
    ai_generated: true,
    html: '<p>Máy ảo <strong>{{vm_name}}</strong> đang dùng {{current_usage}}%.</p>\n<p>Bạn nhận bản theo dõi, không cần hành động.</p>',
  },
  {
    key: 'maintenance_notice',
    namespace: 'hypervisor',
    versions: ['v1 published'],
    published: 'v1',
    subject: 'Bảo trì hệ thống',
    body: 'Hệ thống sẽ bảo trì theo lịch.',
    name: 'Thông báo bảo trì',
    channel: 'email',
    status: 'active',
    updated_by: 'minh.tran',
    html: '<p>Hệ thống sẽ bảo trì theo lịch.</p>',
    schema: [],
  },
  {
    key: 'release_note',
    namespace: 'starchart',
    versions: ['v1 published'],
    published: 'v1',
    subject: 'Bản phát hành {{version}}',
    body: 'Có bản mới.',
    name: 'Ghi chú phát hành',
    channel: 'email',
    status: 'active',
    updated_by: 'lan.nguyen',
    html: '<p>Có bản mới {{version}}.</p>',
    schema: [{ name: 'version', type: 'string', required: true, sample: '3.2.0', description: 'Số version' }],
  },
  {
    key: 'incident_digest',
    namespace: 'hypervisor',
    versions: ['v1 draft'],
    subject: 'Tổng hợp sự cố {{region}}',
    body: 'Tổng hợp sự cố tuần.',
    name: 'Tổng hợp sự cố (chưa bind)',
    channel: 'email',
    status: 'active',
    updated_by: 'minh.tran',
    html: '<p>Tổng hợp sự cố khu vực {{region}} tuần này.</p>\n<p><a href="javascript:alert(1)">Xem chi tiết</a></p>',
    schema: [{ name: 'region', type: 'string', required: true, sample: 'HN', description: 'Khu vực' }],
  },
]
/** Template binding (kênh × audience) → template@version cho một topic (UC-002 §D / UC-006 §F). */
export type TemplateBinding = {
  topic_key: string
  channel: Channel
  /** `*` = mọi người nhận, hoặc target của một binding người nhận (`role:qa_lead`) */
  audience: string
  template_key: string
  version: string
  priority: number
  status: 'published' | 'draft'
}
export const templateBindings: TemplateBinding[] = [
  {
    topic_key: 'hypervisor.warning_resources',
    channel: 'email',
    audience: 'role:qa_lead',
    template_key: 'vm_high_load',
    version: 'v2',
    priority: 1,
    status: 'published',
  },
  {
    topic_key: 'hypervisor.warning_resources',
    channel: 'email',
    audience: '*',
    template_key: 'vm_high_load_readonly',
    version: 'v1',
    priority: 2,
    status: 'published',
  },
  {
    topic_key: 'hypervisor.maintenance',
    channel: 'email',
    audience: '*',
    template_key: 'maintenance_notice',
    version: 'v1',
    priority: 1,
    status: 'published',
  },
  {
    topic_key: 'hypervisor.maintenance',
    channel: 'email',
    audience: 'role:qa_lead',
    template_key: 'vm_high_load',
    version: 'v2',
    priority: 2,
    status: 'published',
  },
]
export const templateBindingsOf = (topicKey: string) =>
  templateBindings.filter((b) => b.topic_key === topicKey)
/** template email đã bind + published cho topic (UC-008 BR-3) — mock: 2 template cho hypervisor.* */
export const boundEmailTemplates = (topicKey: string): Template[] =>
  templateBindingsOf(topicKey)
    .filter((b) => b.channel === 'email' && b.status === 'published')
    .map((b) => templates.find((t) => t.key === b.template_key))
    .filter((t): t is Template => Boolean(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
export const templateLabel = (t: Template) => `${t.key} ${t.published ?? ''}`.trim()
/** Render `{{var}}` bằng giá trị thật; biến thiếu để nguyên `{{var}}` để Preview bắt được (BR-5). */
export const renderTemplate = (text: string, values: Record<string, string>) =>
  text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, k: string) => (values[k]?.trim() ? values[k] : m))
export const unresolvedVariables = (text: string) =>
  Array.from(text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map((m) => m[1])
/** Giờ làm việc để cảnh báo Hẹn giờ ngoài giờ (UC-008 §E) */
export const WORKING_HOURS = { start: 8, end: 18 }
/** Người đang đăng nhập (mock) — đích của 'Gửi thử cho tôi' */
export const CURRENT_USER = { name: 'Nguyễn Hoàng Anh', email: 'nguyenhoanganh@eon.tech' }
export const auditEntries: AuditEntry[] = [
  {
    actor: 'lan.nguyen',
    action: 'Duyệt lần gửi',
    from: 'pending_approval',
    to: 'queued',
    timestamp: '10 phút trước',
    source: 'admin',
  },
  {
    actor: 'system',
    action: 'Resolver binding',
    from: '0',
    to: '14 recipients',
    timestamp: '32 phút trước',
    source: 'directory',
  },
  {
    actor: 'minh.tran',
    action: 'Cập nhật chủ đề',
    from: 'draft',
    to: 'published',
    timestamp: '1 giờ trước',
    source: 'self',
  },
]
export const chartData = Array.from({ length: 12 }, (_, i) => ({
  hour: `${String(i + 8).padStart(2, '0')}:00`,
  api: 32 + i * 7,
  dashboard: 18 + (i % 4) * 9,
}))
export const deliveryLog = Array.from({ length: 45 }, (_, i) => ({
  email: `recipient${i + 1}@enterprise.vn`,
  status: i % 11 === 0 ? 'failed' : 'sent',
  reason: i % 3 === 0 ? 'role:qa_lead' : 'group:platform',
  excluded_reason: i % 11 === 0 ? 'invalid' : undefined,
}))
export const alerts = [
  'Topic hypervisor.warning_resources — 0 người nhận trong 7 ngày',
  'Snapshot danh bạ app ai-gateway cũ 3 ngày (stale_directory)',
  '2 subscription invalid mới',
]
export type VariableSchemaEntry = {
  name: string
  type: 'string' | 'number' | 'url' | 'datetime' | 'html'
  required: boolean
  sample?: string
  /** helper text dưới field ở Composer / Template editor */
  description?: string
}
export const appVariableSchema: VariableSchemaEntry[] = [
  { name: 'alert_title', type: 'string', required: true, description: 'Tiêu đề cảnh báo' },
  { name: 'vm_name', type: 'string', required: true, description: 'Tên VM' },
  { name: 'vm_ip', type: 'string', required: true, description: 'Địa chỉ IP' },
  { name: 'owner', type: 'string', required: false, description: 'Chủ sở hữu' },
  { name: 'current_usage', type: 'number', required: true, description: 'Mức sử dụng hiện tại' },
  { name: 'threshold', type: 'number', required: true, description: 'Ngưỡng cảnh báo' },
  {
    name: 'action_url',
    type: 'url',
    required: true,
    sample: 'https://ops.enterprise.vn/vm/alpha',
    description: 'URL xử lý',
  },
]
export type SendApproval = {
  id: string
  topic_key: string
  template: string
  estimate: number
  author: string
  status: 'pending_approval' | 'queued' | 'cancelled'
}
/** UC-008 §F — lần gửi tay cần Super Admin duyệt (vượt ngưỡng hoặc topic user_mutable=false). */
export const sendApprovals: SendApproval[] = [
  {
    id: 'send_req_01HZ',
    topic_key: 'hypervisor.incident',
    template: 'vm_high_load v2',
    estimate: 43,
    author: 'minh.tran',
    status: 'pending_approval',
  },
]
/** Sparkline 7 điểm cho 4 StatPill ở dashboard (01 §4) */
export const statTrends = {
  sends24h: [980, 1040, 1120, 1090, 1180, 1230, 1284],
  recipients: [7800, 7950, 8100, 8020, 8300, 8410, 8492],
  bounceRate: [1.1, 1.0, 0.9, 1.2, 0.9, 0.8, 0.8],
  emptyTopics: [2, 2, 1, 1, 1, 1, 1],
}
/** Chuông ở top bar: hồ sơ app + lần gửi đang chờ Super Admin duyệt */
/** App đang chọn ở app switcher (AppShell) — mock cố định ews-hypervisor. */
export const currentApp = apps[0]
export const appBySlug = (slug: string) => apps.find((app) => app.slug === slug) ?? apps[0]
export const appIdIsUuidV4 = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
export const approvalApp = { ...apps[3], submitted_topics: ['atlas.data_quality'] }

/* ---- UC-001 §C Duyệt có điều chỉnh ---- */
export type ApprovalGrant = {
  granted_channels: Channel[]
  rate_limit_per_minute: number
  max_recipients_per_event: number
}
/** Hồ sơ "đã xin" — cột trái của diff view; cột phải là grant Super Admin sửa. */
export const requestedGrant = (app: App): ApprovalGrant => ({
  granted_channels: app.granted_channels,
  rate_limit_per_minute: app.quota,
  max_recipients_per_event: app.max_recipients_per_event ?? 500,
})
/** Topic khai default_channels có kênh không được cấp → kênh đó bị bỏ qua khi gửi (cảnh báo sau điều chỉnh). */
export const ungrantedChannelTopics = (granted: Channel[], topicKeys: string[]) =>
  topicKeys
    .map((key) => topics.find((t) => t.topic_key === key))
    .filter((t): t is Topic => Boolean(t))
    .map((t) => ({ topic_key: t.topic_key, channels: (t.default_channels ?? []).filter((c) => !granted.includes(c)) }))
    .filter((t) => t.channels.length > 0)

/* ---- UC-001 §E Credentials: màn `/settings/credentials` đọc khoá và audit THẬT ---- */
/**
 * Khoá giả cho các màn CHƯA đấu backend (wizard đăng ký app, duyệt app). Đúng định dạng thật
 * `ews_<32 hex>_<43 ký tự base64url>` để không dạy sai người đọc.
 */
export const DEMO_API_KEY = 'ews_4f2a8c1d9e7b6a5c3d2e1f0a9b8c7d6e_Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaQ'
/**
 * Snippet cho modal credential — theo app được duyệt, không hard-code apps[0].
 *
 * Backend KHÔNG có bước đổi token: `/v1/*` xác thực thẳng bằng `Authorization: Bearer <api key>`
 * (`ews-astrolink-api/src/shared/http/server.ts`). Đừng dựng lại luồng `/v1/auth/token`.
 */
export const configSnippetFor = (app: App, apiKey: string) =>
  `EWS_APP_ID=${app.app_id}\nEWS_API_KEY=${apiKey}\nEWS_NAMESPACE=${app.namespace}`
/** Body sao đúng `sendBody` của `POST /v1/notifications`. 202 = đã nhận, CHƯA gửi (UC-005 BR-3). */
export const sendSnippetFor = (apiKey: string) =>
  `POST /v1/notifications\nAuthorization: Bearer ${apiKey}\nContent-Type: application/json\n\n{\n  "to": { "externalId": "u-1024" },\n  "topic": "order_updates",\n  "subject": "Đơn hàng đã được xác nhận",\n  "html": "<p>Xin chào…</p>"\n}\n\n→ 202 Accepted\nLocation: /v1/notifications/<id>`
/* Mock-only foundation: fixtures intentionally live in memory for the next implementation slices. */

/* ---- Recipient estimate (UC-008 BR-4) — the ONE place every "bao nhiêu người" number comes from.
   Composer card, Gửi button, confirm dialog and send-block all read this; never re-derive per component. */
export type RecipientEstimate = {
  /** người có kênh email active sau khi gộp trùng */
  active: number
  /** đã tắt topic này */
  optedOut: number
  /** subscription email invalid */
  invalid: number
  /** bị binding `excluded` loại ra */
  excluded: number
  /** thuộc binding included nhưng chưa có kênh email active (lý do hiện trong modal 0 người) */
  noChannel: number
  /** binding nào đóng góp phần noChannel — để modal nêu tên (`role:qa_lead`) */
  noChannelReason?: string
  /** → Dự kiến gửi */
  expected: number
  /** 5 bước pipeline (UC-002 §C4): binding included → bung ra → gộp trùng — bước 4/5 suy từ các field trên */
  bindings?: number
  expanded?: number
  deduped?: number
}
const recipientEstimates: Record<string, Omit<RecipientEstimate, 'expected'>> = {
  'hypervisor.maintenance': {
    active: 47,
    optedOut: 3,
    invalid: 1,
    excluded: 0,
    noChannel: 0,
    bindings: 2,
    expanded: 49,
    deduped: 47,
  },
  // khớp pipeline 5 bước ở <ResolutionPipeline>: 16 → 15 → 12 → 11
  'hypervisor.warning_resources': {
    active: 15,
    optedOut: 2,
    invalid: 1,
    excluded: 1,
    noChannel: 0,
    bindings: 3,
    expanded: 16,
    deduped: 15,
  },
  // case 0 người nhận: binding role:oncall broken, không ai có kênh email active
  'hypervisor.incident': {
    active: 0,
    optedOut: 3,
    invalid: 0,
    excluded: 0,
    noChannel: 12,
    noChannelReason: 'role:oncall',
    bindings: 1,
    expanded: 0,
    deduped: 0,
  },
  'ai-gateway.quota_alert': {
    active: 9,
    optedOut: 1,
    invalid: 0,
    excluded: 0,
    noChannel: 0,
    bindings: 1,
    expanded: 9,
    deduped: 9,
  },
}
export const estimateRecipients = (topicKey: string): RecipientEstimate => {
  const e = recipientEstimates[topicKey] ?? {
    active: 0,
    optedOut: 0,
    invalid: 0,
    excluded: 0,
    noChannel: 0,
  }
  return { ...e, expected: Math.max(0, e.active - e.optedOut - e.invalid - e.excluded) }
}
export const topicByKey = (topicKey: string) => topics.find((t) => t.topic_key === topicKey)
/** Topic đủ điều kiện gửi tay: active + đúng namespace app đang chọn (UC-008 block 1). */
export const composableTopics = (namespace: string) =>
  topics.filter((t) => t.status === 'active' && t.topic_key.startsWith(`${namespace}.`))

/* ---- UC-005 / 07 Delivery log — mọi con số của một lần gửi suy từ MỘT helper ---- */
/** "Bây giờ" cố định cho countdown / tuổi bản ghi — không Date.now() lúc render (SSR-safe). */
export const MOCK_NOW = '2026-09-12T09:00:00Z'
export const addMinutes = (iso: string, m: number) => new Date(new Date(iso).getTime() + m * 60_000).toISOString()

export type NotificationCounters = {
  /** giải ra (gross) */
  resolved: number
  sent: number
  bounce: number
  /** bị trừ vì đã tắt topic */
  optedOut: number
  /** không có kênh active */
  noChannel: number
  /** lỗi phát (Exchange từ chối / hỏng) */
  failed: number
}
const NOT_RESOLVED_YET = ['draft', 'pending_approval', 'scheduled']
export const notificationCounters = (n: Notification): NotificationCounters => {
  const resolved = n.recipients
  // chưa chạy → "giải ra" mới là ước lượng, chưa có ai bị trừ
  const ran = !NOT_RESOLVED_YET.includes(n.status)
  const optedOut = ran && resolved ? Math.floor(resolved * 0.08) + 1 : 0
  const noChannel = ran && resolved ? Math.floor(resolved * 0.04) : 0
  const sendable = Math.max(0, resolved - optedOut - noChannel)
  const bounceOf = (sent: number) => Math.floor(sent * 0.03)
  switch (n.status) {
    case 'sent': {
      const bounce = bounceOf(sendable)
      return { resolved, sent: sendable - bounce, bounce, optedOut, noChannel, failed: 0 }
    }
    case 'partially_failed': {
      const sent = Math.floor(sendable * 0.7)
      const bounce = bounceOf(sent)
      return { resolved, sent: sent - bounce, bounce, optedOut, noChannel, failed: sendable - sent }
    }
    case 'stopped': {
      const sent = Math.floor(sendable * 0.4)
      return { resolved, sent: sent - bounceOf(sent), bounce: bounceOf(sent), optedOut, noChannel, failed: 0 }
    }
    case 'sending': {
      const sent = Math.floor(sendable * 0.55)
      return { resolved, sent, bounce: bounceOf(sent), optedOut, noChannel, failed: 0 }
    }
    case 'failed':
      return { resolved, sent: 0, bounce: 0, optedOut, noChannel, failed: sendable }
    default:
      return { resolved, sent: 0, bounce: 0, optedOut, noChannel, failed: 0 }
  }
}
export type Flag = 'is_test' | 'collapsed' | 'stale_directory' | 'duplicate' | 'đính chính'
export const flagsOf = (n: Notification): Array<{ flag: Flag; label: string }> => [
  ...(n.is_test ? [{ flag: 'is_test' as const, label: 'is_test' }] : []),
  ...(n.collapsed ? [{ flag: 'collapsed' as const, label: `collapsed ×${n.occurrence_count ?? 30}` }] : []),
  ...(n.stale_directory ? [{ flag: 'stale_directory' as const, label: 'stale_directory' }] : []),
  ...(n.duplicate ? [{ flag: 'duplicate' as const, label: 'duplicate' }] : []),
  ...(n.parent_notification_id ? [{ flag: 'đính chính' as const, label: 'đính chính' }] : []),
]
export const notificationById = (id: string): Notification | undefined => {
  const found = notifications.find((n) => n.id === id)
  if (found) return found
  // link demo từ Composer: /notifications/ntf_demo_<topic> → bản ghi sent giả lập của topic đó
  if (id.startsWith('ntf_demo_')) {
    const topic_key = id.slice('ntf_demo_'.length)
    return {
      id,
      topic_key,
      status: 'sent',
      origin: 'dashboard',
      recipients: estimateRecipients(topic_key).expected,
      created_at: MOCK_NOW,
      template: 'vm_high_load v2',
      sender: CURRENT_USER.name,
    }
  }
  return undefined
}

/* ---- Vòng đời (state_machine_notification.md) ---- */
export type LifecycleStep = { status: NotificationStatus; at: string }
/** Trạng thái bản ghi đã đi qua, theo thứ tự, kèm mốc giờ. Ranh giới `queued → sending` = event horizon. */
export const lifecycleOf = (n: Notification): LifecycleStep[] => {
  const path: NotificationStatus[] = n.origin === 'dashboard' ? ['draft'] : []
  if (n.approved_by) path.push('pending_approval')
  if (n.scheduled_at) path.push('scheduled')
  const s = n.status as NotificationStatus
  switch (s) {
    case 'draft':
    case 'pending_approval':
    case 'scheduled':
      if (!path.includes(s)) path.push(s)
      break
    case 'no_recipient':
      path.push('no_recipient')
      break
    case 'queued':
    case 'cancelled':
    case 'failed':
      path.push('queued')
      if (s !== 'queued') path.push(s)
      break
    case 'sending':
    case 'sent':
    case 'partially_failed':
    case 'stopped':
      path.push('queued', 'sending')
      if (s !== 'sending') path.push(s)
      break
  }
  return path.map((status, i) => ({ status, at: addMinutes(n.created_at, i * 3) }))
}
export const TERMINAL_STATUSES: NotificationStatus[] = ['sent', 'partially_failed', 'stopped', 'cancelled', 'no_recipient', 'failed']
export const TERMINAL_CAPTIONS: Partial<Record<NotificationStatus, string>> = {
  sent: 'Mọi người nhận đều được Exchange tiếp nhận',
  partially_failed: 'Một phần đã ra, một phần hỏng',
  stopped: 'Một phần đã ra, người bấm Dừng',
  cancelled: 'Chưa có thư nào ra',
  no_recipient: 'Chưa có thư nào ra — giải ra 0 người',
  failed: 'Chưa có thư nào ra, và đó là hỏng hóc',
}
/** Câu hỏi duy nhất quan trọng: đã có thư nào rời hệ thống chưa? */
export const mailLeft = (status: string): 'Chưa' | 'Một phần' | 'Rồi' =>
  status === 'sent' ? 'Rồi' : ['sending', 'partially_failed', 'stopped'].includes(status) ? 'Một phần' : 'Chưa'
/** Nhánh không đi — vẽ stub gạch đứt từ node này (07 §B1) */
export const BRANCHES_NOT_TAKEN: Partial<Record<NotificationStatus, NotificationStatus[]>> = {
  draft: ['no_recipient', 'pending_approval'],
  queued: ['cancelled', 'failed'],
  sending: ['stopped', 'partially_failed'],
}

/* ---- Snapshot người nhận "vì sao nhận" (UC-005 BR-5) ---- */
export type SnapshotRow = {
  person: string
  channel: Channel
  /** địa chỉ đã che */
  address: string
  reasons: string[]
  template?: string
  result: string
  at: string
}
const maskEmail = (email: string) => email.replace(/^(.{2}).*(@.*)$/, '$1***$2')
export const recipientSnapshot = (n: Notification) => {
  const c = notificationCounters(n)
  const included = bindingsOf(n.topic_key).filter((b) => b.status === 'included').map((b) => b.target)
  const reasonsFor = (i: number) => (i === 0 && included.length > 1 ? included.slice(0, 2) : [included[i % Math.max(included.length, 1)] ?? 'user:self'])
  const pick = (from: number, count: number) => users.filter((u) => u.email).slice(from, from + count)
  const received: SnapshotRow[] = pick(0, Math.min(8, c.sent)).map((u, i) => ({
    person: u.id,
    channel: 'email',
    address: maskEmail(u.email),
    reasons: reasonsFor(i),
    template: n.template,
    result: '250 accepted',
    at: fmtDateTime(addMinutes(n.created_at, 7 + i)),
  }))
  const deductedReasons = ['opted_out (12/08)', 'excluded bởi admin', 'không có kênh active', 'invalid — hard bounce 03/09']
  const deducted: SnapshotRow[] = pick(10, Math.min(4, c.optedOut + c.noChannel)).map((u, i) => ({
    person: u.id,
    channel: 'email',
    address: maskEmail(u.email),
    reasons: [included[0] ?? 'user:self'],
    result: deductedReasons[i % deductedReasons.length],
    at: fmtDateTime(addMinutes(n.created_at, 6)),
  }))
  const failed: SnapshotRow[] = pick(20, Math.min(3, c.failed + c.bounce)).map((u, i) => ({
    person: u.id,
    channel: 'email',
    address: maskEmail(u.email),
    reasons: [included[0] ?? 'user:self'],
    template: n.template,
    result: i < c.bounce ? '550 mailbox unavailable' : '451 Exchange busy',
    at: fmtDateTime(addMinutes(n.created_at, 9 + i)),
  }))
  return { received, deducted, failed }
}

/* ---- Payload & phản hồi (đường API) ---- */
export const apiRequestFor = (n: Notification) =>
  `POST /v1/notifications
Authorization: Bearer eyJ…
Idempotency-Key: ${n.idempotency_key ?? 'alert-88213'}
Content-Type: application/json

{
  "topic_key": "${n.topic_key}",
  "custom_data": { "vm_name": "vm-prod-17", "threshold": 90 }
}`
export const apiResponseFor = (n: Notification) => {
  const c = notificationCounters(n)
  if (n.duplicate)
    return `200 OK
{ "notification_id": "${n.id}", "recipients": ${c.resolved}, "status": "${n.status}", "duplicate": true }`
  return `202 Accepted
{ "notification_id": "${n.id}", "recipients": ${c.resolved}, "status": "queued" }`
}
/** Sparkline dao động cho bản ghi collapsed — số sự kiện mỗi 30 giây trong cửa sổ 5 phút */
export const flappingSeries = (n: Notification) => {
  const total = n.occurrence_count ?? 30
  const base = [1, 4, 2, 6, 3, 5, 2, 4, 1, 2]
  const sum = base.reduce((a, b) => a + b, 0)
  return base.map((v, i) => ({ t: i * 30, count: Math.max(1, Math.round((v / sum) * total)) }))
}
export const notificationAudit = (n: Notification): AuditEntry[] => {
  const steps = lifecycleOf(n)
  const actor = n.origin === 'api' ? `app:${apps[0].slug}` : (n.sender ?? CURRENT_USER.name)
  return steps.map((step, i) => ({
    actor: step.status === 'pending_approval' && n.approved_by ? n.approved_by : i === 0 ? actor : 'system',
    action: i === 0 ? 'tạo lần gửi' : 'chuyển trạng thái',
    from: i === 0 ? undefined : steps[i - 1].status,
    to: i === 0 ? undefined : step.status,
    timestamp: fmtDateTime(step.at),
    source: n.origin,
  }))
}

/* ---- /scheduled (07 §C) ---- */
export type ScheduledSend = {
  id: string
  topic_key: string
  template: string
  estimate: number
  author: string
  run_at: string
  /** lỗi khi chạy — card ở trạng thái failed */
  error?: string
}
export const scheduledSends: ScheduledSend[] = [
  { id: 'ntf_sch_01', topic_key: 'hypervisor.maintenance', template: 'maintenance_notice v1', estimate: 8, author: 'Trần Minh', run_at: '2026-09-12T14:00:00Z' },
  { id: 'ntf_sch_02', topic_key: 'starchart.release', template: 'release_note v1', estimate: 12, author: 'Nguyễn Lan', run_at: '2026-09-13T01:30:00Z' },
  {
    id: 'ntf_sch_03',
    topic_key: 'hypervisor.incident',
    template: 'vm_high_load v2',
    estimate: 5,
    author: 'Trần Minh',
    run_at: '2026-09-12T00:30:00Z',
    error: 'Không gửi được lúc 07:30 — topic đã bị gỡ template email. Đã báo người đặt lịch.',
  },
]

/* ---- UC-006 / 05 Templates — helper cho editor, 1 chỗ parse `{{ }}` ---- */
export const templateByKey = (key: string) => templates.find((t) => t.key === key)
/** Tên biến xuất hiện trong subject + body (thứ tự gặp, không trùng) */
export const templateVariables = (...texts: string[]) =>
  Array.from(new Set(texts.flatMap((t) => unresolvedVariables(t))))
/** Schema của template: khai riêng, hoặc mặc định schema app (hypervisor) */
export const schemaOf = (t: Template): VariableSchemaEntry[] => t.schema ?? (t.namespace === 'hypervisor' ? appVariableSchema : [])
/** Giá trị mẫu để preview: sample khai sẵn, không có thì suy theo kiểu */
export const DEFAULT_SAMPLES: Record<string, string> = {
  alert_title: 'Phân vùng đầy nhất',
  vm_name: 'ai-gateway',
  vm_ip: 'eonsr.ddns.net',
  owner: 'Nguyễn Hoàng Anh',
  current_usage: '81',
  threshold: '80',
  action_url: 'https://singularity.com',
}
export const sampleValuesOf = (schema: VariableSchemaEntry[]) =>
  Object.fromEntries(schema.map((v) => [v.name, v.sample ?? DEFAULT_SAMPLES[v.name] ?? (v.type === 'number' ? '42' : v.type === 'url' ? '' : v.type === 'datetime' ? '2026-09-10T07:30:12+07:00' : `[${v.name}]`)]))
/** Biến dùng nhưng chưa khai (chặn lưu) / khai nhưng không dùng (`thừa`, vẫn lưu được) */
export const schemaIssues = (schema: VariableSchemaEntry[], subject: string, html: string) => {
  const used = templateVariables(subject, html)
  const declared = schema.map((v) => v.name)
  return { undeclared: used.filter((u) => !declared.includes(u)), unused: declared.filter((d) => !used.includes(d)) }
}
/** Sanitize không im lặng: gỡ <script>, on*= và href javascript: — trả về danh sách gỡ kèm dòng */
export const sanitizeHtml = (html: string) => {
  const removed: Array<{ what: string; line: number }> = []
  const lines = html.split('\n')
  const clean = lines
    .map((line, i) => {
      let out = line
      if (/<script/i.test(out)) {
        removed.push({ what: '<script>', line: i + 1 })
        out = out.replace(/<script[\s\S]*?<\/script>|<script[^>]*>/gi, '')
      }
      const on = out.match(/\son[a-z]+=/i)
      if (on) {
        removed.push({ what: `${on[0].trim()}`, line: i + 1 })
        out = out.replace(/\son[a-z]+="[^"]*"/gi, '')
      }
      return out
    })
    .join('\n')
  return { clean, removed }
}
/** §H: chỉ chấp nhận scheme https / mailto trong href — chặn lúc xuất bản */
export const linkSchemeIssues = (html: string) =>
  Array.from(html.matchAll(/href="([^"]+)"/gi))
    .map((m) => m[1])
    .filter((h) => !/^(https:|mailto:|\{\{)/i.test(h))
/** Escape để hiện custom_data chứa HTML như chữ (giá trị là data, không phải markup) */
export const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Render HTML preview: sanitize + thay biến bằng giá trị đã escape; biến thiếu để nguyên `{{ }}` */
export const renderHtmlPreview = (html: string, values: Record<string, string>) =>
  renderTemplate(sanitizeHtml(html).clean, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, escapeHtml(v)])))
/** Topic đang dùng template này (§G: chặn lưu trữ) */
export const topicsUsingTemplate = (key: string) => Array.from(new Set(templateBindings.filter((b) => b.template_key === key).map((b) => b.topic_key)))
/** Biến app đang dùng ở template khác — chip cho AI (05 §D) */
export const usedVariableNames = (namespace?: string) =>
  Array.from(new Set(templates.filter((t) => !namespace || t.namespace === namespace).flatMap((t) => templateVariables(t.subject ?? '', t.html ?? t.body ?? ''))))
/** §E Hợp đồng biến — payload mẫu đầy đủ theo topic + template + sample */
export const contractPayloadFor = (t: Template, topicKey: string, schema = schemaOf(t)) =>
  `POST /v1/notifications
Authorization: Bearer <access_token>
Idempotency-Key: alert-88213

${JSON.stringify(
  {
    topic_key: topicKey,
    occurred_at: '2026-09-10T07:30:12+07:00',
    template_id: `tpl_${t.key}_${t.published ?? 'v1'}`,
    custom_data: sampleValuesOf(schema),
  },
  null,
  2,
)}`
export const contractErrors = (schema: VariableSchemaEntry[]) => {
  const required = schema.filter((v) => v.required).map((v) => v.name)
  return [
    { code: '422 missing_variable', body: `{ "error": "missing_variable", "missing": ${JSON.stringify(required.slice(0, 2))} }` },
    { code: '422 invalid_type', body: `{ "error": "invalid_type", "field": "${schema.find((v) => v.type === 'number')?.name ?? 'threshold'}", "expected": "number" }` },
    { code: '422 no_template_bound', body: '{ "error": "no_template_bound", "channel": "email" }' },
    { code: '403 template_out_of_scope', body: '{ "error": "template_out_of_scope", "template_namespace": "starchart" }' },
  ]
}
export const templateAudit = (t: Template): AuditEntry[] => [
  ...(t.ai_generated ? [{ actor: 'ai', action: 'ai_generated', to: 'draft v1', timestamp: '30 ngày trước', source: 'dashboard' }] : []),
  ...(t.history ?? []).map((v) => ({ actor: v.by, action: v.status === 'draft' ? 'template_draft_saved' : 'template_published', to: v.version, timestamp: v.at, source: 'dashboard' })),
]
