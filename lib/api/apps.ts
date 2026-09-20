import 'server-only'
import { fmtIso, type App, type Channel } from '@/lib/mock-data'
import { adminFetch, orgId } from './client'
import type { AppDto } from './types'

export type { AppDto }

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
