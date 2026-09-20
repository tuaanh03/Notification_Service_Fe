'use server'

import { approveApp, issueSecret, toApp, type ApproveAppInput } from '@/lib/api/apps'
import { toResult, type ActionResult, type ActionStop } from '@/lib/api/result'
import type { IssuedAppSecretDto } from '@/lib/api/types'
import type { App } from '@/lib/mock-data'

/**
 * Duyệt app — hành động của Super Admin trên `/admin/apps`.
 *
 * Đặt ở đây chứ không ở `app/apps/new/`: danh sách app là cửa duyệt CHÍNH. Wizard chỉ là lối
 * tắt cho người vừa tạo xong, và phiên wizard đóng lại là mất — app còn `pending_approval`
 * thì phải duyệt được từ danh sách, nếu không là đường cụt.
 */

export type ApproveResult = {
  app: App
  /** `null` = đã duyệt nhưng chưa cấp được khoá; cấp lại ở `/settings/credentials`. */
  secret: IssuedAppSecretDto | null
  stoppedAt: ActionStop | null
}

/**
 * Duyệt rồi cấp khoá đầu tiên — hai lời gọi, không chung transaction.
 *
 * Duyệt xong mà cấp khoá hỏng thì app VẪN active: trả `secret: null` + `stoppedAt`, không báo
 * thất bại, vì việc duyệt đã có hiệu lực thật.
 */
export async function approveAndIssueKeyAction(
  appId: string,
  grant: ApproveAppInput,
): Promise<ActionResult<ApproveResult>> {
  const approved = await toResult(() => approveApp(appId, grant))
  if (!approved.ok) return approved
  const app = toApp(approved.data)
  const issued = await toResult(() => issueSecret(appId))
  return issued.ok
    ? { ok: true, data: { app, secret: issued.data, stoppedAt: null } }
    : {
        ok: true,
        data: {
          app,
          secret: null,
          stoppedAt: { step: 'Cấp khoá API', message: issued.message, code: issued.code },
        },
      }
}
