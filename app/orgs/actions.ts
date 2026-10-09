'use server'

import {
  createOrganization,
  grantAppRole,
  listMemberCandidates,
  removeMember,
  revokeAppRole,
  setMember,
  syncDirectory,
} from '@/lib/api/organizations'
import { toResult, type ActionResult } from '@/lib/api/result'
import type { AppRole, DirectorySyncDto, MemberCandidateDto, OrganizationDto, OrgMemberDto, OrgRole } from '@/lib/api/types'

/**
 * Lớp BFF của trang Tổ chức. Server Action: token phiên chỉ ở phía server. Lỗi trả về
 * `ActionResult`, không ném qua ranh giới server/client.
 */

/** Tạo tổ chức — người đang đăng nhập thành Owner (ADR-0025 của backend). */
export async function createOrganizationAction(name: string): Promise<ActionResult<OrganizationDto>> {
  return toResult(() => createOrganization(name))
}

/** Người có thể thêm vào org — hộp "Thêm thành viên" đọc khi mở (ADR-0027 của backend). */
export async function listCandidatesAction(orgId: string): Promise<ActionResult<MemberCandidateDto[]>> {
  return toResult(() => listMemberCandidates(orgId))
}

/** Đồng bộ danh bạ M365 thành tài khoản EWS — chỉ Super Admin (ADR-0027 của backend). */
export async function syncDirectoryAction(): Promise<ActionResult<DirectorySyncDto>> {
  return toResult(() => syncDirectory())
}

/** Thêm người (đã có tài khoản) vào org, hoặc đổi vai của họ (ADR-0026 của backend). */
export async function setMemberAction(orgId: string, email: string, role: OrgRole): Promise<ActionResult<OrgMemberDto>> {
  return toResult(() => setMember(orgId, email, role))
}

/** Gỡ khỏi org — backend thu hồi luôn vai app của người đó trong org, cùng một transaction. */
export async function removeMemberAction(orgId: string, adminId: string): Promise<ActionResult<void>> {
  return toResult(() => removeMember(orgId, adminId))
}

/**
 * Áp các thay đổi vai app của MỘT người: `role: null` = thu hồi. Mỗi app một lời gọi, không chung
 * transaction — dừng ở lỗi đầu tiên và báo đã áp được bao nhiêu (cùng quy ước với wizard tạo app).
 */
export async function setAppRolesAction(
  member: { adminId: string; email: string },
  changes: readonly { appId: string; role: AppRole | null }[],
): Promise<ActionResult<{ applied: number }>> {
  let applied = 0
  for (const change of changes) {
    const res = await toResult(() =>
      change.role === null ? revokeAppRole(change.appId, member.adminId) : grantAppRole(change.appId, member.email, change.role),
    )
    if (!res.ok) return res
    applied += 1
  }
  return { ok: true, data: { applied } }
}
