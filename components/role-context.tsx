'use client'
import { createContext, useContext, useMemo } from 'react'
import { canManageApp, creatableOrgs } from '@/lib/access'
import type { AdminProfileDto } from '@/lib/api/types'

type Access = {
  me: AdminProfileDto
  isSuperAdmin: boolean
  /** Cấu hình được app này không — ẩn / khoá nút ghi khi `false`. */
  canManage: (app: { app_id: string; org_id?: string | undefined }) => boolean
  /** Org được tạo app — rỗng thì ẩn lối vào màn đăng ký app. */
  creatableOrgs: AdminProfileDto['orgs']
}

const RoleContext = createContext<Access | null>(null)

/**
 * Vai THẬT của người đang đăng nhập (`GET /admin/me`, ADR-0022) — `layout.tsx` nạp ở server rồi
 * truyền xuống. Thay cho ô "Role demo" cũ: giả lập vai ở client là hiện nút mà backend sẽ chặn.
 */
export function RoleProvider({ me, children }: { me: AdminProfileDto; children: React.ReactNode }) {
  const value = useMemo<Access>(
    () => ({
      me,
      isSuperAdmin: me.isSuperAdmin,
      canManage: (app) => canManageApp(me, app),
      creatableOrgs: creatableOrgs(me),
    }),
    [me],
  )
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): Access {
  const ctx = useContext(RoleContext)
  if (ctx === null) throw new Error('useRole() must be used inside <RoleProvider>')
  return ctx
}
