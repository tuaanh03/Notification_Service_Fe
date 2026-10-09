import 'server-only'
import { cache } from 'react'
import { adminFetch } from './client'
import type { AdminProfileDto } from './types'

/**
 * GET /admin/me — org và vai của người đang đăng nhập (ADR-0022 của backend).
 * `cache`: layout gốc và `app/admin/layout.tsx` cùng hỏi trong một request -> chỉ một lời gọi.
 */
export const getMe = cache((): Promise<AdminProfileDto> => adminFetch<AdminProfileDto>('/me'))
