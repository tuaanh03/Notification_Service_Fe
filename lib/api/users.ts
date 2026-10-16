import 'server-only'
import { adminFetch } from './client'
import type { RecipientDto, RecipientPageDto, UserPreferencesDto } from './types'

export type { RecipientDto, RecipientPageDto, UserPreferencesDto }

const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/users`

/**
 * Bề mặt ĐỌC cho vận hành (`implementation_plan.md` §5, ĐX-0004).
 *
 * Đọc là chính. Ghi duy nhất: người quản lý app THÊM TAY một người (`createRecipient`) — mã đã có thì
 * 409, không ghi đè. Admin không sửa lựa chọn topic hộ người dùng; app service tự ghi qua `/v1`.
 */

export type ListRecipientsInput = { limit?: number; offset?: number; q?: string }

/** GET /admin/apps/:appId/users — `q` tìm theo `externalId`, khớp một phần. */
export async function listRecipients(appId: string, input: ListRecipientsInput = {}): Promise<RecipientPageDto> {
  const query: Record<string, string> = {}
  if (input.limit !== undefined) query['limit'] = String(input.limit)
  if (input.offset !== undefined) query['offset'] = String(input.offset)
  if (input.q) query['q'] = input.q
  return adminFetch<RecipientPageDto>(base(appId), { query })
}

/** POST /admin/apps/:appId/users — 409 `USER_ALREADY_EXISTS` nếu mã đã có; email đi cùng luật với `/v1`. */
export async function createRecipient(appId: string, input: { externalId: string; email?: string }): Promise<RecipientDto> {
  return adminFetch<RecipientDto>(base(appId), { method: 'POST', body: input })
}

/**
 * GET /admin/apps/:appId/users/:externalId — đúng MỘT người, khớp đủ mã; không có -> 404.
 *
 * Cho trang chi tiết mở thẳng bằng link. KHÔNG thay bằng `listRecipients({ q })`: `q` khớp một phần.
 */
export async function getRecipient(appId: string, externalId: string): Promise<RecipientDto> {
  return adminFetch<RecipientDto>(`${base(appId)}/${encodeURIComponent(externalId)}`)
}

/**
 * GET /admin/apps/:appId/users/:externalId/preferences
 *
 * Dùng CHUNG use case với `/v1`, nên `effectiveOptIn` luôn khớp thứ worker tính lúc gửi.
 */
export async function getRecipientPreferences(appId: string, externalId: string): Promise<UserPreferencesDto> {
  return adminFetch<UserPreferencesDto>(`${base(appId)}/${encodeURIComponent(externalId)}/preferences`)
}
