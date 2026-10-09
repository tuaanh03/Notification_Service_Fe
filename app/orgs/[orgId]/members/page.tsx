import { OrgMembers } from '@/components/orgs/org-members'
import { listMembers, listOrgAppRoles } from '@/lib/api/organizations'
import { describeError } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api/problem'

/**
 * `/orgs/<orgId>/members` — màn Thành viên (ADR-0026 của backend). Server Component: đọc danh
 * sách thành viên + vai app bằng phiên phía server (hai lời gọi, chạy song song). Ghi qua Server
 * Action (`app/orgs/actions.ts`) rồi `router.refresh()`.
 */
export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  try {
    const [members, appRoles] = await Promise.all([listMembers(orgId), listOrgAppRoles(orgId)])
    return <OrgMembers orgId={orgId} members={members} appRoles={appRoles} error={null} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    // 404 = không thấy org (sai link / không thuộc org) — `<OrgMembers>` báo "không có tổ chức này".
    const error = err.status === 404 ? null : await describeError(err)
    return <OrgMembers orgId={orgId} members={[]} appRoles={[]} error={error} />
  }
}
