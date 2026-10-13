import { RecipientDetail } from '@/components/users/recipient-detail'

// Server page: await params rồi render client component (CLAUDE.md §2).
// `key` theo app + mã: đổi người là dựng lại từ đầu, không mang state của người trước sang.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ app?: string | string[] }>
}) {
  const { id } = await params
  const { app } = await searchParams
  const externalId = decodeURIComponent(id)
  const appKey = typeof app === 'string' ? app : null
  return <RecipientDetail key={`${appKey}:${externalId}`} externalId={externalId} />
}
