import 'server-only'
import { adminFetch } from './client'
import type { NotificationPageDto } from './types'

export type { NotificationPageDto }

/**
 * Lịch sử gửi — bề mặt ĐỌC cho vận hành (`implementation_plan.md` §5).
 *
 * Chỉ đọc: MVP không có huỷ, dừng hay gửi lại một lần gửi.
 */

export type ListNotificationsInput = {
  limit?: number
  offset?: number
  status?: string
  /** `key` của chủ đề, khớp đúng. */
  topic?: string
  /** Mã người nhận phía app, khớp ĐÚNG (không phải tìm một phần như màn Người nhận). */
  externalId?: string
}

/** GET /admin/apps/:appId/notifications — mới nhất trước. */
export async function listNotifications(appId: string, input: ListNotificationsInput = {}): Promise<NotificationPageDto> {
  const query: Record<string, string> = {}
  if (input.limit !== undefined) query['limit'] = String(input.limit)
  if (input.offset !== undefined) query['offset'] = String(input.offset)
  if (input.status) query['status'] = input.status
  if (input.topic) query['topic'] = input.topic
  if (input.externalId) query['externalId'] = input.externalId
  return adminFetch<NotificationPageDto>(`/apps/${encodeURIComponent(appId)}/notifications`, { query })
}
