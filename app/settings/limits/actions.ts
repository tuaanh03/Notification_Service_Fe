'use server'

import { getApp } from '@/lib/api/apps'
import { toResult, type ActionResult } from '@/lib/api/result'
import { setSendWindow } from '@/lib/api/send-limits'
import type { SendWindowDto } from '@/lib/api/types'

/** BFF của màn Giới hạn gửi — app đang chọn ở `?app=` phía client, như `/settings/tracking`. */

export type SendLimits = { sendWindow: SendWindowDto | null; mandatoryBypassWindow: boolean }

const limitsOf = (app: { sendWindow?: SendWindowDto | null; mandatoryBypassWindow?: boolean }): SendLimits => ({
  sendWindow: app.sendWindow ?? null,
  mandatoryBypassWindow: app.mandatoryBypassWindow ?? true,
})

export async function loadSendLimitsAction(appId: string): Promise<ActionResult<SendLimits>> {
  return toResult(async () => limitsOf(await getApp(appId)))
}

export async function saveSendWindowAction(
  appId: string,
  window: SendWindowDto | null,
  mandatoryBypass: boolean,
): Promise<ActionResult<SendLimits>> {
  return toResult(async () => limitsOf(await setSendWindow(appId, { window, mandatoryBypass })))
}
