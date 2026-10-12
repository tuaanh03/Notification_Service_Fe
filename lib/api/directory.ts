import 'server-only'
import { adminFetch } from './client'
import type { DirectoryPeoplePageDto, DirectorySyncDto } from './types'

// --- Màn Danh bạ của Super Admin (ADR-0027 của backend) ----------------------------------------

export type ListDirectoryInput = {
  limit: number
  offset: number
  /** Khớp một phần email hoặc tên. Rỗng = không lọc. */
  q?: string
  /** `yes` / `no` = đang hiện / đang ẩn khi thêm thành viên; bỏ trống = cả hai. */
  listed?: 'yes' | 'no'
}

/** GET /admin/directory/people — mọi tài khoản EWS, phân trang. */
export function listDirectoryPeople(input: ListDirectoryInput): Promise<DirectoryPeoplePageDto> {
  const params = new URLSearchParams({ limit: String(input.limit), offset: String(input.offset) })
  if (input.q) params.set('q', input.q)
  if (input.listed) params.set('listed', input.listed)
  return adminFetch<DirectoryPeoplePageDto>(`/directory/people?${params}`)
}

/** PUT /admin/directory/people/member-listed — tích / bỏ tích hiện khi thêm thành viên, theo lô (≤ 100). */
export function setMemberListed(adminIds: string[], listed: boolean): Promise<{ changed: number }> {
  return adminFetch<{ changed: number }>('/directory/people/member-listed', { method: 'PUT', body: { adminIds, listed } })
}

/**
 * POST /admin/directory/m365-sync — đồng bộ danh bạ M365 thành tài khoản EWS. Người mới vào ở trạng
 * thái ẩn. Lần đầu tạo cả trăm tài khoản, mỗi người một transaction — chờ tối đa 2 phút thay vì 10 giây.
 */
export function syncDirectory(): Promise<DirectorySyncDto> {
  return adminFetch<DirectorySyncDto>('/directory/m365-sync', { method: 'POST', timeoutMs: 120_000 })
}
