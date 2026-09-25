'use server'

import { listAudit, toAuditEntry } from '@/lib/api/audit'
import { listNotifications } from '@/lib/api/notifications'
import { getOverview } from '@/lib/api/overview'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AppOverviewDto, NotificationSummaryDto } from '@/lib/api/types'
import type { AuditEntry } from '@/lib/mock-data'

/** Số dòng của hai danh sách ngắn trên màn Tổng quan. */
const RECENT_SENDS = 5
const RECENT_ACTIVITY = 6

export type OverviewView = {
  overview: AppOverviewDto
  recent: NotificationSummaryDto[]
  activity: AuditEntry[]
}

/**
 * BFF của màn Tổng quan. Server Action vì dữ liệu thuộc app đang chọn (CLAUDE.md mục 2.2).
 * Ba lời gọi song song, đều chỉ đọc; một cái hỏng là cả màn báo lỗi kèm mã — không hiện nửa màn.
 */
export async function loadOverviewAction(appId: string): Promise<ActionResult<OverviewView>> {
  return toResult(async () => {
    const [overview, recent, audit] = await Promise.all([
      getOverview(appId),
      listNotifications(appId, { limit: RECENT_SENDS }),
      listAudit('App', appId, RECENT_ACTIVITY),
    ])
    return { overview, recent: recent.rows, activity: audit.map(toAuditEntry) }
  })
}
