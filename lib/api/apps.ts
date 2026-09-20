import 'server-only'
import { fmtIso, type App, type Channel } from '@/lib/mock-data'
import { adminFetch, orgId } from './client'
import type { AppDto, AppSecretDto, IssuedAppSecretDto } from './types'

export type { AppDto, AppSecretDto, IssuedAppSecretDto }

/** GET /admin/apps?orgId= — org lấy từ EWS_ORG_ID. */
export async function listApps(): Promise<AppDto[]> {
  return adminFetch<AppDto[]>('/apps', { query: { orgId: orgId() } })
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
    updated_at: fmtIso(dto.updatedAt),
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
