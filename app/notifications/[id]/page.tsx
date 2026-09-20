import { NotificationDetail } from '@/components/notifications/notification-detail'

// Server page: await params rồi render client component — không ghép "use client" với async (CLAUDE.md §2).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <NotificationDetail id={decodeURIComponent(id)} />
}
