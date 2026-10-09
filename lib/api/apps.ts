import 'server-only'
import { type App, type Channel } from '@/lib/mock-data'
import { fmtDateTime } from '@/lib/time'
import { appRouteKeys } from '@/lib/app-routes'
import { adminFetch } from './client'
import type { AdminProfileDto, AppDto, AppSecretDto, IssuedAppSecretDto, NetworkRuleDto } from './types'

export type { AppDto, AppSecretDto, IssuedAppSecretDto, NetworkRuleDto }

/** GET /admin/apps?orgId= — backend chỉ trả app mà người gọi được xem (Member: app được cấp vai). */
export async function listApps(orgId: string): Promise<AppDto[]> {
  return adminFetch<AppDto[]>('/apps', { query: { orgId } })
}

/**
 * App của các org cho trước (`GET /admin/me` -> từng org). Console app truyền org mình là thành
 * viên (`memberOrgs`). Mỗi org một lời gọi, chạy song song — số org của một người nhỏ.
 */
export async function listVisibleApps(orgs: AdminProfileDto['orgs']): Promise<App[]> {
  const perOrg = await Promise.all(
    orgs.map(async (org) => (await listApps(org.id)).map((dto) => ({ ...toApp(dto), org_id: org.id, org_name: org.name }))),
  )
  const apps = perOrg.flat()
  // Slug chỉ duy nhất TRONG một org: hai org trùng slug thì `?app=` phải phân biệt được.
  const keys = appRouteKeys(apps)
  return apps.map((a) => ({ ...a, route_key: keys.get(a.app_id) ?? a.slug }))
}

/** Số app đang chờ Super Admin duyệt, trên MỌI org — chuông của khu Quản trị EWS. */
export async function countPendingApprovals(me: AdminProfileDto): Promise<number> {
  const perOrg = await Promise.all(me.orgs.map((org) => listApps(org.id)))
  return perOrg.flat().filter((a) => a.status === 'pending_approval').length
}

/** GET /admin/apps/:appId */
export async function getApp(appId: string): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}`)
}

/** Kênh mà UI biết vẽ. Backend CHANNELS còn có `sms`/`push` — ngoài phạm vi MVP (chỉ email). */
const UI_CHANNELS: readonly string[] = ['in_app', 'email']

/**
 * `AppDto` (hợp đồng backend) -> `App` (model mà app switcher và mọi màn theo-app đang đọc).
 *
 * Field nào backend chưa có thì ĐỂ TRỐNG, không dựng số giả trên màn quản trị:
 * `topic_count` / `technical_contact` -> `undefined` (UI hiện `—`), `quota_used` -> không đặt
 * (vòng quota hiện 0 cho tới khi có bộ đếm — `implementation_plan.md` mục 12.5).
 */
export function toApp(dto: AppDto): App {
  return {
    app_id: dto.id,
    slug: dto.slug,
    name: dto.name,
    namespace: dto.namespace,
    // APP_STATUSES và APP_ORIGINS của backend trùng khít union ở đây (đã đối chiếu enums.ts).
    status: dto.status as App['status'],
    origin: dto.origin as App['origin'],
    granted_channels: dto.grantedChannels.filter((c): c is Channel => UI_CHANNELS.includes(c)),
    quota: dto.rateLimitPerMinute,
    max_recipients_per_event: dto.maxRecipientsPerEvent,
    updated_at: fmtDateTime(dto.updatedAt),
  }
}

/** GET /admin/apps/:appId/secrets — chỉ hint, không bao giờ có plaintext. */
export async function listSecrets(appId: string): Promise<AppSecretDto[]> {
  return adminFetch<AppSecretDto[]>(`/apps/${encodeURIComponent(appId)}/secrets`)
}

/**
 * POST /admin/apps/:appId/secrets — response DUY NHẤT chứa `apiKey` plaintext.
 *
 * Cấp khoá mới KHÔNG thu hồi khoá cũ: backend cho tối đa `MAX_ACTIVE_SECRETS` khoá
 * active đúng để xoay vòng không mất kết nối (cấp mới -> app đổi sang -> thu hồi cũ).
 */
export async function issueSecret(appId: string): Promise<IssuedAppSecretDto> {
  return adminFetch<IssuedAppSecretDto>(`/apps/${encodeURIComponent(appId)}/secrets`, { method: 'POST' })
}

/** DELETE /admin/apps/:appId/secrets/:secretId — không hoàn tác được. */
export async function revokeSecret(appId: string, secretId: string): Promise<AppSecretDto> {
  return adminFetch<AppSecretDto>(
    `/apps/${encodeURIComponent(appId)}/secrets/${encodeURIComponent(secretId)}`,
    { method: 'DELETE' },
  )
}

// --- Đăng ký app mới (UC-001). Backend KHÔNG có lệnh gộp: mỗi bước một lời gọi. ---

/** Body của `POST /admin/apps`. */
export type CreateAppInput = {
  /** Org sở hữu app — chỉ org mà người tạo là Owner / Org Admin (hoặc Super Admin). */
  orgId: string
  /** `^[a-z0-9][a-z0-9-]{1,62}$` — định danh app trong tổ chức. */
  slug: string
  name: string
  /** `^[a-z0-9][a-z0-9-]{1,62}$` — tiền tố sở hữu, KHOÁ CỨNG sau khi duyệt. */
  namespace: string
  origin: 'internal' | 'external'
}

/** POST /admin/apps -> app ở trạng thái `draft`. Chưa gửi được gì cho tới khi duyệt. */
export async function createApp(input: CreateAppInput): Promise<AppDto> {
  return adminFetch<AppDto>('/apps', { method: 'POST', body: input })
}

/** POST /admin/apps/:appId/network-rules — thêm MỘT dòng allowlist. */
export async function addNetworkRule(appId: string, rule: NetworkRuleDto): Promise<NetworkRuleDto> {
  return adminFetch<NetworkRuleDto>(`/apps/${encodeURIComponent(appId)}/network-rules`, {
    method: 'POST',
    body: rule,
  })
}

/** GET /admin/apps/:appId/network-rules */
export async function listNetworkRules(appId: string): Promise<NetworkRuleDto[]> {
  return adminFetch<NetworkRuleDto[]>(`/apps/${encodeURIComponent(appId)}/network-rules`)
}

/** DELETE /admin/apps/:appId/network-rules?kind=&value= — gỡ MỘT dòng; không có -> 404. */
export async function removeNetworkRule(appId: string, rule: NetworkRuleDto): Promise<void> {
  await adminFetch<void>(`/apps/${encodeURIComponent(appId)}/network-rules`, {
    method: 'DELETE',
    query: { kind: rule.kind, value: rule.value },
  })
}

/**
 * Chuyển trạng thái app — `POST /admin/apps/:appId/:action`, MỘT route cho mọi hành động
 * không mang dữ liệu kèm (`admin-apps.routes.ts` hằng `TRANSITIONS`). `approve` có route
 * riêng vì kèm quyền cấp, nên không nằm trong union này.
 *
 * Backend còn nhận `reject` (`pending_approval -> draft`); console chưa có luồng nào dùng nên
 * không khai ở đây — thêm khi nào dựng màn từ chối hồ sơ.
 *
 * Đường đi hợp lệ do máy trạng thái backend quyết (`app-transitions.ts`); đi sai -> 409
 * `INVALID_TRANSITION`. `revoked` là trạng thái KẾT THÚC, không có đường ra.
 */
export type AppTransition = 'submit' | 'suspend' | 'resume' | 'revoke'

export async function transitionApp(appId: string, action: AppTransition, reason?: string): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/${action}`, {
    method: 'POST',
    body: reason ? { reason } : {},
  })
}

/**
 * Body của `POST /admin/apps/:appId/approve` — `pending_approval -> active`.
 *
 * Đây là NƠI DUY NHẤT quyết định app được gửi kênh nào và trần bao nhiêu. Lúc tạo app
 * chưa có quyền gì cả, nên đừng hỏi hai thông tin này ở bước tạo.
 *
 * Lưu ý: `rateLimitPerMinute` / `maxRecipientsPerEvent` hiện được LƯU và trả về cho app
 * lúc xác thực, nhưng CHƯA có chỗ nào đối chiếu (kế hoạch mục 12.5 — quota theo app, 429
 * ở API). Chỉ có trần gửi ra ngoài `EMAIL_MAX_PER_MINUTE` là đang chạy thật.
 */
export type ApproveAppInput = {
  grantedChannels: readonly string[]
  rateLimitPerMinute: number
  maxRecipientsPerEvent: number
}

export async function approveApp(appId: string, grant: ApproveAppInput): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/approve`, { method: 'POST', body: grant })
}
