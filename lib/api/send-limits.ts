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

/** Trần thư mỗi giờ — chỉ Super Admin (`platform.manage`); vượt thì app nhận 429 `APP_HOURLY_LIMIT` (ADR-0032 GĐ 3). */
export async function setHourlyCeiling(appId: string, body: { maxPerHour: number | null; mandatoryBypass: boolean }): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/hourly-ceiling`, { method: 'PUT', body })
}

/** Mỗi người nhận tối đa N thư / ngày — người quản lý app; thư vượt bị bỏ qua lý do `recipient_limit` (ADR-0032 GĐ 3). */
export async function setRecipientLimit(appId: string, body: { perDay: number | null; mandatoryBypass: boolean }): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/recipient-limit`, { method: 'PUT', body })
}
