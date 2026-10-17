import 'server-only'
import { adminFetch } from './client'
import type { AppDto, SendWindowDto } from './types'

/** Khung giờ gửi của một app (ADR-0032 của backend). Đọc nằm sẵn trong `AppDto` (`GET /admin/apps/:appId`). */
export async function setSendWindow(
  appId: string,
  body: { window: SendWindowDto | null; mandatoryBypass: boolean },
): Promise<AppDto> {
  return adminFetch<AppDto>(`/apps/${encodeURIComponent(appId)}/send-window`, { method: 'PUT', body })
}
