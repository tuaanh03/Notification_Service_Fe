import 'server-only'
import { adminFetch } from './client'
import type { AppOverviewDto } from './types'

export type { AppOverviewDto }

/** GET /admin/apps/:appId/overview — số liệu màn Tổng quan (24 giờ gần nhất + hàng chờ). Chỉ đọc. */
export async function getOverview(appId: string): Promise<AppOverviewDto> {
  return adminFetch<AppOverviewDto>(`/apps/${encodeURIComponent(appId)}/overview`)
}
