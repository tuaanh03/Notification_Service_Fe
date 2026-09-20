import { cn } from '@/lib/utils'
import { statusColors, type Status } from '@/lib/theme'
export function StatusPill({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.draft
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] lowercase',
        status === 'no_recipient' && 'border-dashed',
        status === 'sending' && 'sending-pulse',
        ['failed', 'broken'].includes(status) && 'shadow-[var(--glow-supernova)]',
      )}
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  )
}
