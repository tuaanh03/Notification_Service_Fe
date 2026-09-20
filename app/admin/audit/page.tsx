import { ScrollText } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
export default function Page() {
  return (
    <EmptyState
      icon={ScrollText}
      title="Đang xây dựng"
      description="Tính năng này đang được hoàn thiện."
      action={<span className="font-mono text-xs text-[var(--text-muted)]">/admin/audit</span>}
    />
  )
}
