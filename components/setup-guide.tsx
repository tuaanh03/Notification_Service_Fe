'use client'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AppLink } from '@/components/app-link'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SetupStep = { key: 'topic' | 'recipient' | 'send'; done: boolean; href: string }

/**
 * Hướng dẫn từng bước cho app mới, đầu trang Tổng quan: bước đã xong có dấu ✓, bước kế tiếp có nút chính,
 * các bước sau chỉ là chữ. Đủ bước thì component không hiện gì — không bắt người dùng tự tắt.
 */
export function SetupGuide({ steps }: { steps: SetupStep[] }) {
  const t = useTranslations('overview')
  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null
  const next = steps.findIndex((s) => !s.done)
  return (
    <Panel className="mb-6 p-5" data-testid="setup-guide">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('setupTitle')}</h2>
        <span className="text-xs tabular-nums text-[var(--text-secondary)]">{t('setupProgress', { done, total: steps.length })}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-[var(--aurora)]" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                step.done
                  ? 'border-[var(--aurora)] bg-[var(--aurora)] text-white'
                  : i === next
                    ? 'border-[var(--starlight)] text-[var(--starlight)]'
                    : 'border-[var(--orbit)] text-[var(--text-muted)]',
              )}
            >
              {step.done ? <Check className="size-3.5" aria-label={t('setupDone')} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', step.done && 'text-[var(--text-secondary)] line-through')}>{t(`setup_${step.key}_title`)}</p>
              {!step.done && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{t(`setup_${step.key}_body`)}</p>}
            </div>
            {i === next && (
              <Button nativeButton={false} size="sm" render={<AppLink href={step.href} />}>
                {t(`setup_${step.key}_action`)}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  )
}
