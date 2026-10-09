import { notFound } from 'next/navigation'
import { getMe } from '@/lib/api/me'
import { ApiError } from '@/lib/api/problem'

/**
 * Khu Quản trị EWS — CHỈ Super Admin (ADR-0022 của backend).
 *
 * Người khác nhận 404, giống cách backend trả cho người ngoài org: không xác nhận là khu này có
 * tồn tại. Đây chỉ là lớp giao diện — chốt thật vẫn ở backend, mọi lời gọi `/admin/*` đều kiểm quyền.
 * Không đọc được vai (API hỏng) cũng 404 — sai về phía an toàn; `<AppGate>` hiện lý do lỗi.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = await getMe().then(
    (me) => me.isSuperAdmin,
    (err: unknown) => {
      if (err instanceof ApiError) return false
      throw err
    },
  )
  if (!isSuperAdmin) notFound()
  return children
}
