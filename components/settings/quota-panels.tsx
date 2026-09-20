'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '@/components/app-context'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { QuotaArc } from '@/components/quota-arc'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Channel } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const ALL_CHANNELS: Channel[] = ['in_app', 'email']
const fmt = (n: number) => n.toLocaleString('en-US')

/** UC-001 §F — Kênh (read-only, do Super Admin quyết) + Quota (gauge phút, bar tháng) từ mock của app đang chọn. */
export function QuotaPanels() {
  const { app } = useApp()
  const [requestOpen, setRequestOpen] = useState(false)
  const [wanted, setWanted] = useState<Channel[]>([])
  const [reason, setReason] = useState('')
  const missing = ALL_CHANNELS.filter((c) => !app.granted_channels.includes(c))
  const used = app.quota_used ?? 0
  const monthlyUsed = app.monthly_used ?? 0
  const monthlyLimit = app.monthly_limit ?? 0
  const monthlyPct = monthlyLimit ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0
  return (
    <>
      <PageHeader title="Kênh & Quota" subtitle={`Quyền cấp bởi Super Admin và giới hạn vận hành của ${app.slug}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-semibold">Kênh</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {app.granted_channels.map((c) => (
              <Badge key={c} variant="outline" className="font-mono">
                <Lock data-icon="inline-start" /> {c}
              </Badge>
            ))}
            {missing.map((c) => (
              <Badge key={c} variant="outline" className="border-dashed font-mono text-[var(--text-muted)]">
                {c} · chưa cấp
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-secondary)]">Do Super Admin quyết, App Owner chỉ đề xuất</p>
          <Button variant="outline" className="mt-5" disabled={missing.length === 0} onClick={() => setRequestOpen(true)}>
            Yêu cầu thêm kênh
          </Button>
          {missing.length === 0 && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">App đã được cấp đủ mọi kênh.</p>
          )}
        </Panel>
        <Panel className="p-5">
          <h2 className="text-sm font-semibold">Quota</h2>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <QuotaArc used={used} max={app.quota} strokeWidth={2.5} className="size-28">
              <span className="font-mono text-lg tabular-nums">
                {used}
                <span className="text-xs text-[var(--text-muted)]">/{app.quota}</span>
              </span>
            </QuotaArc>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-secondary)]">
                rate_limit_per_minute · <span className="font-mono tabular-nums">{app.quota} lần/phút</span>
              </p>
              {app.max_recipients_per_event && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  max_recipients_per_event · <span className="font-mono tabular-nums">{app.max_recipients_per_event}</span>
                </p>
              )}
              <p className="mt-4 text-xs text-[var(--text-secondary)]">Khối lượng tháng</p>
              <div className="mt-2 h-2 w-full rounded-full bg-[var(--orbit)]" role="progressbar" aria-valuenow={monthlyPct}>
                <div
                  className={cn('h-full rounded-full', monthlyPct >= 90 ? 'bg-[var(--supernova)]' : 'bg-[var(--pulsar)]')}
                  style={{ width: `${monthlyPct}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                {fmt(monthlyUsed)} / {fmt(monthlyLimit)} tháng · {monthlyPct}%
              </p>
            </div>
          </div>
          <Alert className="mt-6 border-[var(--orbit)] bg-[var(--orbit)]/40">
            <AlertDescription className="text-[var(--text-secondary)]">
              Vượt rate limit → <span className="font-mono">429 + Retry-After</span>, app không bị khoá. Chỉ vượt hạn
              mức khối lượng mới bị đình chỉ.
            </AlertDescription>
          </Alert>
        </Panel>
      </div>

      <ConfirmDialog
        open={requestOpen}
        title="Yêu cầu thêm kênh"
        description="Super Admin sẽ xét và cấp; app không tự bật được kênh."
        facts={[
          ['app', app.slug],
          ['đang có', app.granted_channels.join(', ')],
          ['xin thêm', wanted.join(', ') || '—'],
        ]}
        confirmLabel="Gửi yêu cầu"
        confirmDisabled={!wanted.length || !reason.trim()}
        onConfirm={() => {
          toast.success('Đã gửi yêu cầu thêm kênh', { description: `${wanted.join(', ')} — chờ Super Admin duyệt.` })
          setRequestOpen(false)
          setWanted([])
          setReason('')
        }}
        onCancel={() => setRequestOpen(false)}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Kênh muốn thêm</Label>
            <ToggleGroup multiple variant="outline" size="sm" value={wanted} onValueChange={(v) => setWanted(v as Channel[])}>
              {missing.map((c) => (
                <ToggleGroupItem key={c} value={c} className="font-mono">
                  {c}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="space-y-1">
            <Label htmlFor="channel-reason" className="text-xs">
              Lý do <span className="text-[var(--supernova)]">*</span>
            </Label>
            <Textarea id="channel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" />
          </div>
        </div>
      </ConfirmDialog>
    </>
  )
}
