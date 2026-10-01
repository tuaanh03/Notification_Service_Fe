'use client'
import { useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ungrantedChannelTopics, type ApprovalGrant, type Channel } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const ALL_CHANNELS: Channel[] = ['in_app', 'email']

/** UC-001 §C "Duyệt có điều chỉnh" — form sửa grant; lý do bắt buộc, không submit được khi trống. */
export function AdjustForm({
  requested,
  onSubmit,
}: {
  requested: ApprovalGrant
  onSubmit: (grant: ApprovalGrant, reason: string) => void
}) {
  const t = useTranslations('adjust')
  const [grant, setGrant] = useState<ApprovalGrant>(requested)
  const [reason, setReason] = useState('')
  const valid = reason.trim().length > 0 && grant.granted_channels.length > 0
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(grant, reason.trim())
      }}
    >
      <div className="space-y-1">
        <Label className="font-mono text-xs">granted_channels</Label>
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          value={grant.granted_channels}
          onValueChange={(v) => setGrant({ ...grant, granted_channels: v as Channel[] })}
        >
          {ALL_CHANNELS.map((c) => (
            <ToggleGroupItem key={c} value={c} className="font-mono">
              {c}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="space-y-1">
        <Label htmlFor="adj-rate" className="font-mono text-xs">
          rate_limit_per_minute
        </Label>
        <Input
          id="adj-rate"
          type="number"
          min={1}
          value={grant.rate_limit_per_minute}
          onChange={(e) => setGrant({ ...grant, rate_limit_per_minute: Number(e.target.value) })}
          className="font-mono tabular-nums"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="adj-max" className="font-mono text-xs">
          max_recipients_per_event
        </Label>
        <Input
          id="adj-max"
          type="number"
          min={1}
          value={grant.max_recipients_per_event}
          onChange={(e) => setGrant({ ...grant, max_recipients_per_event: Number(e.target.value) })}
          className="font-mono tabular-nums"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="adj-reason" className="text-xs">
          {t('reason')} <span className="text-[var(--supernova)]">*</span>
        </Label>
        <Textarea id="adj-reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button type="submit" variant="secondary" className="w-full" disabled={!valid}>
        {t('save')}
      </Button>
    </form>
  )
}

/** Diff `đã xin → được cấp`; mục bị bỏ gạch ngang màu supernova; cảnh báo topic khai kênh không được cấp. */
export function GrantDiff({
  requested,
  granted,
  reason,
  topicKeys,
}: {
  requested: ApprovalGrant
  granted: ApprovalGrant
  reason: string
  topicKeys: string[]
}) {
  const t = useTranslations('adjust')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const warnings = ungrantedChannelTopics(granted.granted_channels, topicKeys)
  const numeric: Array<{ key: keyof ApprovalGrant; from: number; to: number }> = [
    { key: 'rate_limit_per_minute', from: requested.rate_limit_per_minute, to: granted.rate_limit_per_minute },
    { key: 'max_recipients_per_event', from: requested.max_recipients_per_event, to: granted.max_recipients_per_event },
  ]
  return (
    <div className="mt-4 space-y-3" data-testid="grant-diff">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        <span>{t('requested')}</span>
        <span />
        <span>{t('granted')}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2 gap-y-2 font-mono text-xs tabular-nums">
        <span className="text-[var(--text-muted)]">{requested.granted_channels.join(', ')}</span>
        <ArrowRight className="size-3 text-[var(--text-muted)]" />
        <span className="flex flex-wrap gap-1">
          {requested.granted_channels.map((c) => {
            const removed = !granted.granted_channels.includes(c)
            return (
              <span key={c} className={cn(removed ? 'text-[var(--supernova)] line-through' : 'text-[var(--aurora)]')}>
                {c}
              </span>
            )
          })}
        </span>
        {numeric.map((n) => (
          <div key={n.key} className="contents">
            <span className="text-[var(--text-muted)]">
              {n.key}={n.from}
            </span>
            <ArrowRight className="size-3 text-[var(--text-muted)]" />
            <span className={cn(n.from !== n.to ? 'text-[var(--solar)]' : 'text-[var(--aurora)]')}>
              {n.key}={n.to}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        {t.rich('reasonValue', { reason, b: (chunks) => <span className="text-[var(--text-primary)]">{chunks}</span> })}
      </p>
      {warnings.length > 0 && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
          <AlertTriangle />
          <AlertTitle className="text-[var(--solar)]">{t('ignoredTitle')}</AlertTitle>
          <AlertDescription className="space-y-1 text-[var(--solar)]">
            {warnings.map((w) => (
              <p key={w.topic_key}>
                {t.rich('ignoredBody', { topic: w.topic_key, channels: w.channels.join(', '), mono })}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
