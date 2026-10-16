import 'server-only'
import { adminFetch } from './client'
import type { AppDto, OpenTrackingDto } from './types'

/**
 * Đếm "đã mở" của một app (ADR-0031 của backend). Đọc ở module notifications (kèm `ready`),
 * đổi ở module apps — cùng đường `/admin/apps/:appId/open-tracking`, khác method.
 */
const path = (appId: string) => `/apps/${encodeURIComponent(appId)}/open-tracking`

export async function getOpenTracking(appId: string): Promise<OpenTrackingDto> {
  return adminFetch<OpenTrackingDto>(path(appId))
}

export async function setOpenTracking(appId: string, enabled: boolean): Promise<AppDto> {
  return adminFetch<AppDto>(path(appId), { method: 'PUT', body: { enabled } })
}
