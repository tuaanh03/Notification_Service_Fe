import { ApprovalReview } from '@/components/admin/approval-review'

// Server page: await params rồi render client component (CLAUDE.md §2).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ApprovalReview id={id} />
}
