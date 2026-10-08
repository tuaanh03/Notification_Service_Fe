import type { AdminProfileDto, OrgRole } from './api/types'

/**
 * Ẩn / hiện nút theo vai — sao CÙNG luật với `decide()` của backend (ADR-0022). Đây chỉ là cho
 * giao diện gọn: backend vẫn kiểm từng request, đoán sai ở đây chỉ hiện ra nút bấm vào bị 403.
 */
const ORG_MANAGERS: readonly OrgRole[] = ['owner', 'org_admin']

const orgRoleOf = (me: AdminProfileDto, orgId: string | undefined) => me.orgs.find((o) => o.id === orgId)?.role ?? null

/** Cấu hình được app: topic, template, khoá API, IP / Origin, gửi duyệt. */
export function canManageApp(me: AdminProfileDto, app: { app_id: string; org_id?: string | undefined }): boolean {
  if (me.isSuperAdmin) return true
  const orgRole = orgRoleOf(me, app.org_id)
  if (orgRole === null) return false
  return ORG_MANAGERS.includes(orgRole) || me.appRoles[app.app_id] === 'app_admin'
}

/** Org mà người này được tạo app (Owner / Org Admin; Super Admin: mọi org). */
export function creatableOrgs(me: AdminProfileDto): AdminProfileDto['orgs'] {
  return me.isSuperAdmin ? me.orgs : me.orgs.filter((o) => o.role !== null && ORG_MANAGERS.includes(o.role))
}
