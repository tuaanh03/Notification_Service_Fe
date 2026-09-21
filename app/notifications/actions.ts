'use server'

import { listNotifications, type ListNotificationsInput, type NotificationPageDto } from '@/lib/api/notifications'
import { toResult, type ActionResult } from '@/lib/api/result'

/**
 * Lớp BFF của màn Lịch sử gửi. Server Action vì dữ liệu phụ thuộc app đang chọn — app đó nằm
 * trong state client của `<AppProvider>` (CLAUDE.md mục 2.2).
 */
export async function loadNotificationsAction(
  appId: string,
  input: ListNotificationsInput = {},
): Promise<ActionResult<NotificationPageDto>> {
  return toResult(() => listNotifications(appId, input))
}
