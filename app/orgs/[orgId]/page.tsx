import { OrgApps } from '@/components/orgs/org-apps'

/** `/orgs/<orgId>` — app của một tổ chức. */
export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  return <OrgApps orgId={orgId} />
}
