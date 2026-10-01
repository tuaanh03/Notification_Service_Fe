'use client'
import { useState } from 'react'
import { ChevronRight, Info, ShieldAlert, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('recipientBlock')
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
            <h2 className="font-heading text-lg font-semibold">{t('title')}</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="compose-topic">{t('topic')}</Label>
            <NativeSelect
              id="compose-topic"
              value={topic}
              disabled={locked}
              onChange={(e) => onSelect(e.target.value)}
              className="w-full font-mono"
            >
              <NativeSelectOption value="">
                {t('chooseTopic', { ns: app.namespace })}
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
              {selected ? t('selected', { topic }) : t('noTopic')}
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
                  <span className="text-[var(--text-primary)]">{t('active', { count: est.active })}</span>
                  <span className="text-[var(--text-muted)]">{t('optedOut', { count: est.optedOut })}</span>
                  <span className="text-[var(--text-muted)]">{t('invalid', { count: est.invalid })}</span>
                  {est.excluded > 0 && (
                    <span className="text-[var(--text-muted)]">
                      {t('excluded', { count: est.excluded })}
                    </span>
                  )}
                  <strong className="text-[var(--starlight)]">{t('expected', { count: est.expected })}</strong>
                </div>
                <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setDrawer(!drawer)}>
                  {t('details')} <ChevronRight data-icon="inline-end" />
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
              {t('topicDecides')}
              <br />
              {t('estimateNote')}
            </AlertDescription>
          </Alert>
          {mandatory && (
            <Alert className="border-[var(--solar)]/25 bg-[var(--solar)]/10 text-[var(--solar)]">
              <ShieldAlert />
              <AlertDescription className="text-xs text-[var(--solar)]">
                {t('mandatory')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </Panel>
  )
}
