import 'server-only'
import { adminFetch } from './client'
import type { RecipientDto, RecipientPageDto, UserPreferencesDto } from './types'

export type { RecipientDto, RecipientPageDto, UserPreferencesDto }

const base = (appId: string) => `/apps/${encodeURIComponent(appId)}/users`

/**
 * Bề mặt ĐỌC cho vận hành (`implementation_plan.md` §5, ĐX-0004).
 *
 * Các đường này CHỈ ĐỌC — không có bản ghi. Admin không sửa lựa chọn topic hộ người dùng;
 * app service tự ghi qua `/v1` bằng khoá của chính nó.
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
