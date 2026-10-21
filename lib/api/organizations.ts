import 'server-only'
import { adminFetch } from './client'
import type { AppRole, MemberCandidateDto, OrganizationDto, OrgAppRoleDto, OrgMemberDto, OrgRole } from './types'

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

/** GET /admin/organizations/:orgId/member-candidates — người cùng công ty Super Admin đã cho hiện, chưa thuộc org (ADR-0027). */
export function listMemberCandidates(orgId: string): Promise<MemberCandidateDto[]> {
  return adminFetch<MemberCandidateDto[]>(`${org(orgId)}/member-candidates`)
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

// --- Quản lý tổ chức (ADR-0040 của backend) — chỉ Owner / Super Admin ---------------------------

/** PATCH /admin/organizations/:orgId — đổi tên. */
export function renameOrganization(orgId: string, name: string): Promise<OrganizationDto> {
  return adminFetch<OrganizationDto>(org(orgId), { method: 'PATCH', body: { name } })
}

/** POST /admin/organizations/:orgId/transfer-owner — người nhận thành Owner, Owner cũ thành Org Admin. */
export function transferOwnership(orgId: string, adminId: string): Promise<void> {
  return adminFetch<void>(`${org(orgId)}/transfer-owner`, { method: 'POST', body: { adminId } })
}

/** DELETE /admin/organizations/:orgId — gõ lại tên; còn app chưa thu hồi -> 409 `ORG_HAS_APPS`. */
export function deleteOrganization(orgId: string, confirmName: string): Promise<void> {
  return adminFetch<void>(org(orgId), { method: 'DELETE', body: { confirmName } })
}
