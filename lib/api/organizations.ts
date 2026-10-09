import 'server-only'
import { adminFetch } from './client'
import type { AppRole, DirectorySyncDto, MemberCandidateDto, OrganizationDto, OrgAppRoleDto, OrgMemberDto, OrgRole } from './types'

/** POST /admin/organizations — tạo org, người gọi thành Owner (ADR-0025 của backend). */
export function createOrganization(name: string): Promise<OrganizationDto> {
  return adminFetch<OrganizationDto>('/organizations', { method: 'POST', body: { name } })
}

const org = (orgId: string) => `/organizations/${encodeURIComponent(orgId)}`

// --- Màn Thành viên (ADR-0026 của backend) ---------------------------------------------------

/** GET /admin/organizations/:orgId/members — mọi thành viên xem được. */
export function listMembers(orgId: string): Promise<OrgMemberDto[]> {
  return adminFetch<OrgMemberDto[]>(`${org(orgId)}/members`)
}

/** GET /admin/organizations/:orgId/member-candidates — người cùng công ty chưa thuộc org (ADR-0027). */
export function listMemberCandidates(orgId: string): Promise<MemberCandidateDto[]> {
  return adminFetch<MemberCandidateDto[]>(`${org(orgId)}/member-candidates`)
}

/**
 * POST /admin/directory/m365-sync — đồng bộ danh bạ M365 thành tài khoản EWS, chỉ Super Admin (ADR-0027).
 * Lần đầu tạo cả trăm tài khoản, mỗi người một transaction — chờ tối đa 2 phút thay vì 10 giây.
 */
export function syncDirectory(): Promise<DirectorySyncDto> {
  return adminFetch<DirectorySyncDto>('/directory/m365-sync', { method: 'POST', timeoutMs: 120_000 })
}

/** PUT /admin/organizations/:orgId/members — thêm người đã có tài khoản / đổi vai. */
export function setMember(orgId: string, email: string, role: OrgRole): Promise<OrgMemberDto> {
  return adminFetch<OrgMemberDto>(`${org(orgId)}/members`, { method: 'PUT', body: { email, role } })
}

/** DELETE /admin/organizations/:orgId/members/:adminId — gỡ khỏi org, thu hồi luôn vai app trong org. */
export function removeMember(orgId: string, adminId: string): Promise<void> {
  return adminFetch<void>(`${org(orgId)}/members/${encodeURIComponent(adminId)}`, { method: 'DELETE' })
}

/** GET /admin/organizations/:orgId/app-roles — vai app của mọi người trong org, một lời gọi. */
export function listOrgAppRoles(orgId: string): Promise<OrgAppRoleDto[]> {
  return adminFetch<OrgAppRoleDto[]>(`${org(orgId)}/app-roles`)
}

/** PUT /admin/apps/:appId/roles — cấp / đổi vai app. */
export function grantAppRole(appId: string, email: string, role: AppRole): Promise<unknown> {
  return adminFetch<unknown>(`/apps/${encodeURIComponent(appId)}/roles`, { method: 'PUT', body: { email, role } })
}

/** DELETE /admin/apps/:appId/roles/:adminId — thu hồi vai app. */
export function revokeAppRole(appId: string, adminId: string): Promise<void> {
  return adminFetch<void>(`/apps/${encodeURIComponent(appId)}/roles/${encodeURIComponent(adminId)}`, { method: 'DELETE' })
}
