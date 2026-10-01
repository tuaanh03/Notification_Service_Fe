'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, toLocale } from './locales'

/**
 * Đổi ngôn ngữ giao diện. Giá trị từ trình duyệt đi qua `toLocale` trước khi ghi — cookie
 * chỉ bao giờ chứa `vi` hoặc `en`.
 *
 * Cookie này không bí mật nhưng vẫn đặt cùng thuộc tính với cookie phiên (`lib/api/auth.ts`):
 * `httpOnly` (chỉ server đọc), `sameSite: lax`, `secure` trên production.
 */
export async function setLocaleAction(raw: string): Promise<void> {
  ;(await cookies()).set(LOCALE_COOKIE, toLocale(raw), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
