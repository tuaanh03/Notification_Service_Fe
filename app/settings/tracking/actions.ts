'use server'

import { getOpenTracking, setOpenTracking } from '@/lib/api/open-tracking'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { OpenTrackingDto } from '@/lib/api/types'

/** BFF của màn Theo dõi mở thư — như `/settings/webhooks`: app đang chọn ở `?app=` phía client. */

export async function loadOpenTrackingAction(appId: string): Promise<ActionResult<OpenTrackingDto>> {
  return toResult(() => getOpenTracking(appId))
}

/** Đổi xong đọc lại để `ready` luôn là trạng thái thật của server. */
export async function setOpenTrackingAction(appId: string, enabled: boolean): Promise<ActionResult<OpenTrackingDto>> {
  return toResult(async () => {
    await setOpenTracking(appId, enabled)
    return getOpenTracking(appId)
  })
}
