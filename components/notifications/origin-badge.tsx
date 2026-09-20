import { TerminalSquare, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Origin của một lần gửi (07 §A): `api` cyan + terminal · `dashboard` violet + user. */
export function OriginBadge({ origin }: { origin: 'api' | 'dashboard' }) {
  const api = origin === 'api'
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono',
        api ? 'border-[var(--starlight)]/40 text-[var(--starlight)]' : 'border-[var(--pulsar)]/40 text-[var(--pulsar)]',
      )}
      data-origin={origin}
    >
      {api ? <TerminalSquare data-icon="inline-start" /> : <UserRound data-icon="inline-start" />}
      {origin}
    </Badge>
  )
}

/** Cờ của bản ghi (`is_test`, `collapsed ×30`, `stale_directory`, `duplicate`, `đính chính`). */
export function FlagBadge({ label }: { label: string }) {
  const warn = label.startsWith('stale') || label.startsWith('duplicate')
  return (
    <Badge variant="outline" className={cn('font-mono text-[10px]', warn ? 'border-[var(--solar)]/40 text-[var(--solar)]' : 'text-[var(--text-secondary)]')}>
      {label}
    </Badge>
  )
}
