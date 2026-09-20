import { Globe2 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
export default function Page() {
  return (
    <EmptyState
      icon={Globe2}
      title="Đang xây dựng"
      description="Tính năng này đang được hoàn thiện."
      action={<span className="font-mono text-xs text-[var(--text-muted)]">/settings/origins</span>}
    />
  )
}
