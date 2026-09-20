'use client'
import { useState } from 'react'
import { ChevronRight, Info, ShieldAlert, Users } from 'lucide-react'
import { Panel } from '@/components/panel'
import { ResolutionPipeline } from '@/components/resolution-pipeline'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { composableTopics, estimateRecipients, topicByKey } from '@/lib/mock-data'
import { useApp } from '@/components/app-context'
import { cn } from '@/lib/utils'

export function RecipientBlock({
  topic,
  onSelect,
  locked = false,
}: {
  topic: string
  onSelect: (value: string) => void
  /** bản nháp đã khoá (đang gửi / đã hẹn giờ) — UC-008: bấm Gửi là khoá nháp */
  locked?: boolean
}) {
  const [drawer, setDrawer] = useState(false)
  const { app } = useApp()
  const selected = topic.length > 0
  // một helper cho mọi con số — card, nút Gửi, confirm đều dùng chung
  const est = estimateRecipients(topic)
  const mandatory = selected && topicByKey(topic)?.user_mutable === false
  // waterfall: mỗi khoản trừ là một đoạn mờ dần của thanh cyan
  const total = Math.max(est.active, 1)
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`
  return (
    <Panel className={cn('p-5', selected && 'border-[var(--starlight)]/30 shadow-[var(--glow-starlight)]')}>
      <div className="flex gap-4">
        <Badge
          variant="outline"
          className="size-7 shrink-0 rounded-full border-[var(--starlight)]/60 px-0 font-mono text-sm text-[var(--starlight)]"
        >
          1
        </Badge>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--starlight)]">
              block 01
            </p>
            <h2 className="font-heading text-lg font-semibold">Gửi cho ai</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="compose-topic">Topic</Label>
            <NativeSelect
              id="compose-topic"
              value={topic}
              disabled={locked}
              onChange={(e) => onSelect(e.target.value)}
              className="w-full font-mono"
            >
              <NativeSelectOption value="">
                Chọn topic active trong namespace {app.namespace}
              </NativeSelectOption>
              {composableTopics(app.namespace).map((t) => (
                <NativeSelectOption key={t.topic_key} value={t.topic_key}>
                  {t.topic_key}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="rounded-xl border border-[var(--starlight)]/20 bg-[var(--starlight)]/[.04] p-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <Users className="size-4" />
              {selected ? `Topic ${topic}` : 'Chưa chọn topic'}
            </div>
            {selected && (
              <>
                <div className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--orbit)]">
                  <div className="h-full bg-[var(--starlight)]/80" style={{ width: pct(est.expected) }} />
                  <div className="h-full bg-[var(--starlight)]/35" style={{ width: pct(est.optedOut) }} />
                  <div className="h-full bg-[var(--starlight)]/20" style={{ width: pct(est.invalid) }} />
                  <div className="h-full bg-[var(--starlight)]/10" style={{ width: pct(est.excluded) }} />
                </div>
                <div className="mt-3 grid gap-1 font-mono text-xs tabular-nums">
                  <span className="text-[var(--text-primary)]">{est.active} người có kênh email active</span>
                  <span className="text-[var(--text-muted)]">− {est.optedOut} người đã tắt topic này</span>
                  <span className="text-[var(--text-muted)]">− {est.invalid} người email hỏng (invalid)</span>
                  {est.excluded > 0 && (
                    <span className="text-[var(--text-muted)]">
                      − {est.excluded} người bị binding excluded
                    </span>
                  )}
                  <strong className="text-[var(--starlight)]">→ Dự kiến gửi {est.expected}</strong>
                </div>
                <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setDrawer(!drawer)}>
                  Xem chi tiết <ChevronRight data-icon="inline-end" />
                </Button>
                {drawer && (
                  <div className="mt-4">
                    <ResolutionPipeline topicKey={topic} readOnly />
                  </div>
                )}
              </>
            )}
          </div>
          <Alert className="border-[var(--orbit)] bg-transparent text-[var(--text-muted)]">
            <Info />
            <AlertDescription className="text-xs text-[var(--text-muted)]">
              Người nhận do topic quyết. Cần gửi cho một nhóm rời rạc thì tạo topic hành chính và quản bằng
              binding cá nhân.
              <br />
              Đây là ước lượng tại thời điểm soạn. Số thật chốt lúc gửi.
            </AlertDescription>
          </Alert>
          {mandatory && (
            <Alert className="border-[var(--solar)]/25 bg-[var(--solar)]/10 text-[var(--solar)]">
              <ShieldAlert />
              <AlertDescription className="text-xs text-[var(--solar)]">
                Topic bắt buộc — người nhận không tắt được. Lần gửi này sẽ cần Super Admin duyệt.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Panel>
  )
}
