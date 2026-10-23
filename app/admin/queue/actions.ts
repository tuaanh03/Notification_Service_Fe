'use server'

import { discardDeadLetter, requeueDeadLetter, setGroupPaused } from '@/lib/api/queues'
import { toResult, type ActionResult } from '@/lib/api/result'

/** BFF của màn Hàng chờ gửi (tab Stream, Message lỗi) — màn tự `router.refresh()` sau khi làm xong. */

export async function requeueDeadLetterAction(stream: string, id: string): Promise<ActionResult<{ id: string }>> {
  return toResult(() => requeueDeadLetter(stream, id))
}

export async function discardDeadLetterAction(stream: string, id: string, reason: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await discardDeadLetter(stream, id, reason)
    return null
  })
}

export async function setGroupPausedAction(group: string, paused: boolean): Promise<ActionResult<{ paused: boolean }>> {
  return toResult(() => setGroupPaused(group, paused))
}
