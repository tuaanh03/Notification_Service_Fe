import 'server-only'
import { adminFetch } from './client'
import type { AdminProfileDto } from './types'

/** GET /admin/me — org và vai của người đang đăng nhập (ADR-0022 của backend). */
export function getMe(): Promise<AdminProfileDto> {
  return adminFetch<AdminProfileDto>('/me')
}
