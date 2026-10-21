'use server'

import { searchAudit } from '@/lib/api/audit'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AuditEventPageDto } from '@/lib/api/types'
import { actionsOf, fromOf, type AuditGroup, type AuditRange } from '@/lib/audit-groups'

/** Nhật ký hoạt động (chỉ Super Admin — backend kiểm `platform.manage`). `now` tính ở máy chủ lúc gọi. */
export async function loadAuditEventsAction(input: {
  group: AuditGroup
  range: AuditRange
  cursor?: string
}): Promise<ActionResult<AuditEventPageDto>> {
  return toResult(() =>
    searchAudit({ actions: actionsOf(input.group), from: fromOf(input.range, Date.now()), cursor: input.cursor, limit: 50 }),
  )
}
