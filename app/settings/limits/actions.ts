'use server'

import { getApp } from '@/lib/api/apps'
import { toResult, type ActionResult } from '@/lib/api/result'
import { setPacing, setPacingCeiling, setSendWindow } from '@/lib/api/send-limits'
import type { AppDto, SendWindowDto } from '@/lib/api/types'

/** BFF của màn Giới hạn gửi — app đang chọn ở `?app=` phía client, như `/settings/tracking`. */

export type SendLimits = {
  sendWindow: SendWindowDto | null
  mandatoryBypassWindow: boolean
  sendPerMinute: number | null
  mandatoryBypassPacing: boolean
  maxSendPerMinute: number | null
}

/** Phần đã đổi trên màn — phần nào không đổi thì không gửi. */
export type SendLimitsChanges = {
  ceiling?: number | null
  window?: { window: SendWindowDto | null; mandatoryBypass: boolean }
  pacing?: { perMinute: number | null; mandatoryBypass: boolean }
}

const limitsOf = (app: AppDto): SendLimits => ({
  sendWindow: app.sendWindow ?? null,
  mandatoryBypassWindow: app.mandatoryBypassWindow ?? true,
  sendPerMinute: app.sendPerMinute ?? null,
  mandatoryBypassPacing: app.mandatoryBypassPacing ?? true,
  maxSendPerMinute: app.maxSendPerMinute ?? null,
})

export async function loadSendLimitsAction(appId: string): Promise<ActionResult<SendLimits>> {
  return toResult(async () => limitsOf(await getApp(appId)))
}

/**
 * Lưu lần lượt: trần trước (nâng trần cùng lúc với nâng dàn đều thì dàn đều mới không bị chặn), rồi khung
 * giờ, rồi dàn đều. Bước sau lỗi thì bước trước đã lưu — màn tải lại để thấy đúng trạng thái.
 */
export async function saveSendLimitsAction(appId: string, changes: SendLimitsChanges): Promise<ActionResult<SendLimits>> {
  return toResult(async () => {
    let app: AppDto | null = null
    if (changes.ceiling !== undefined) app = await setPacingCeiling(appId, changes.ceiling)
    if (changes.window) app = await setSendWindow(appId, changes.window)
    if (changes.pacing) app = await setPacing(appId, changes.pacing)
    return limitsOf(app ?? (await getApp(appId)))
  })
}
