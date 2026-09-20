import 'server-only'
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
