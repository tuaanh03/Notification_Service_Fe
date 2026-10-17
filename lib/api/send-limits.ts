import 'server-only'
import { adminFetch } from './client'
import type { AppDto, SendWindowDto } from './types'

/** Giới hạn gửi của một app (ADR-0032 của backend). Đọc nằm sẵn trong `AppDto` (`GET /admin/apps/:appId`). */
export async function setSendWindow(
  appId: string,
  body: { window: SendWindowDto | null; mandatoryBypass: boolean },
): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/send-window`, { method: 'PUT', body })
}

/** Dàn đều — người quản lý app, trong trần (`PACING_ABOVE_CEILING`). */
export async function setPacing(appId: string, body: { perMinute: number | null; mandatoryBypass: boolean }): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/pacing`, { method: 'PUT', body })
}

/** Trần tốc độ — chỉ Super Admin (`platform.manage`). */
export async function setPacingCeiling(appId: string, maxPerMinute: number | null): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/pacing-ceiling`, { method: 'PUT', body: { maxPerMinute } })
}
