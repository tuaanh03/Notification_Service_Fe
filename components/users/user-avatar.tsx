import { GitMerge, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { User } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

/** Avatar + tên; ẩn danh = vòng gạch đứt + badge (tooltip identify()); đã gộp = icon merge nêu khoá khớp. */
export function UserAvatar({ user, compact }: { user: User; compact?: boolean }) {
  const anon = !user.identified
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
          anon ? 'border-dashed border-[var(--text-muted)] text-[var(--text-muted)]' : 'border-[var(--starlight)]/50 text-[var(--starlight)]',
        )}
        data-anonymous={anon}
      >
        {anon ? <UserRound className="size-3.5" /> : user.name.split(' ').map((w) => w[0]).slice(-2).join('')}
      </span>
      {!compact && <span className={cn(anon && 'text-[var(--text-muted)]')}>{user.name || '—'}</span>}
      {anon && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Badge variant="outline" className="border-dashed font-mono text-[10px] text-[var(--text-muted)]">
              ẩn danh
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Đã bấm Cho phép nhưng app chưa gọi identify().</TooltipContent>
        </Tooltip>
      )}
      {user.mergedFrom && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <GitMerge className="size-3.5 text-[var(--pulsar)]" aria-label="Đã gộp" />
          </TooltipTrigger>
          <TooltipContent>
            Gộp từ <span className="font-mono">{user.mergedFrom}</span> — khớp khoá <span className="font-mono">{user.mergedKey}</span>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
