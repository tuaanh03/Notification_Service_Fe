import { useTranslations } from 'next-intl'
import { tOr } from '@/i18n/dynamic'
import { cn } from '@/lib/utils'
import { statusColors } from '@/lib/theme'

/**
 * Nhãn trạng thái. `status` là giá trị THÔ của backend (`active`, `revoked`…) — màu tra theo giá trị
 * thô, chữ hiện ra dịch theo nhóm `status`. Trạng thái chưa có câu dịch thì hiện nguyên giá trị,
 * không bao giờ ra ô trống.
 */
/** Chữ của một trạng thái thô — cho nút lọc, dòng tóm tắt… (cùng bản dịch với `<StatusPill>`). */
export function useStatusLabel(): (status: string) => string {
  const t = useTranslations('status')
  return (status) => tOr(t, status)
}

export function StatusPill({ status }: { status: string }) {
  const t = useTranslations('status')
  const color = statusColors[status] ?? statusColors.draft
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]',
        status === 'no_recipient' && 'border-dashed',
        status === 'sending' && 'sending-pulse',
        ['failed', 'broken'].includes(status) && 'shadow-[var(--glow-supernova)]',
      )}
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {tOr(t, status)}
    </span>
  )
}
