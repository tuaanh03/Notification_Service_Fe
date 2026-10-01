'use client'

import { AlertTriangle, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useSendSimulation } from '@/hooks/use-send-simulation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenNotice } from '@/components/forbidden-notice'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { estimateRecipients, topicByKey } from '@/lib/mock-data'
import { useApp } from '@/components/app-context'
import { RecipientBlock } from './recipient-block'
import { ContentBlock, emptyContent, type ContentSelection } from './content-block'
import { ScheduleDialog } from './schedule-dialog'
import { PreviewBlock } from './preview-block'
import { SendBlock } from './send-block'

/** Vượt ngưỡng này → pending_approval (UC-008 §F, quyết định 11_gia_dinh). */
export const APPROVAL_THRESHOLD = 200

/** Đổi app ở switcher → remount toàn bộ nháp (topic thuộc namespace khác). */
export function Composer() {
  const { app } = useApp()
  return <ComposerDraft key={app.slug} />
}

function ComposerDraft() {
  const t = useTranslations('compose')
  const tc = useTranslations('common')
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState<ContentSelection>(emptyContent)
  const [contentValid, setContentValid] = useState(false)
  const [previewOpened, setPreviewOpened] = useState(false)
  const [unresolved, setUnresolved] = useState<string[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [noRecipient, setNoRecipient] = useState(false)
  const [editorConflict, setEditorConflict] = useState(false)

  // Mọi con số người nhận đi qua một helper (UC-008 BR-4)
  const estimate = estimateRecipients(topic)
  // state machine gửi — Composer giữ để biết đang có lần gửi chạy (BR-6: bấm Gửi hai lần không tạo lần gửi thứ hai)
  const sim = useSendSimulation(estimate.expected)
  const mandatory = topicByKey(topic)?.user_mutable === false
  const requiresApproval = mandatory || estimate.expected > APPROVAL_THRESHOLD
  // Gating BR-5: 3 block hợp lệ + đã xem thử + không còn {{ }} sót. contentValid chỉ do <ContentBlock> báo lên.
  const canSend = Boolean(topic) && contentValid && previewOpened && unresolved.length === 0
  const templateLabel = content.mode === 'quick' ? t('quickLabel') : content.template

  // callback ổn định → effect trong PreviewBlock không chạy lại mỗi render (bẫy §6)
  const markPreviewOpened = useCallback(() => setPreviewOpened(true), [])
  const onUnresolved = useCallback((vars: string[]) => setUnresolved(vars), [])
  // BR-6: đang có lần gửi chạy → không mở dialog mới, chỉ báo
  const guardRunning = () => {
    if (!sim.running) return false
    toast.info(t('runningTitle'), { description: t('runningBody', { state: sim.state }) })
    return true
  }

  const facts = useMemo(
    () =>
      [
        [t('factTopic'), topic],
        [t('factRecipients'), t('factRecipientsValue', { count: estimate.expected })],
        [t('factTemplate'), templateLabel],
      ] as [string, string][],
    [estimate.expected, templateLabel, topic, t],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <Alert className="border-[var(--solar)]/25 bg-[var(--solar)]/10 text-[var(--solar)]">
        <AlertTriangle />
        <AlertDescription className="text-[var(--solar)]">{t('warning')}</AlertDescription>
      </Alert>
      {editorConflict && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/10 text-[var(--solar)]">
          <Users />
          <AlertDescription className="text-[var(--solar)]">{t('conflict')}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          id="demo-conflict"
          checked={editorConflict}
          onCheckedChange={(checked) => setEditorConflict(checked === true)}
        />
        <Label htmlFor="demo-conflict" className="text-xs text-[var(--text-secondary)]">
          {t('conflictDemo')}
        </Label>
      </div>
      <RecipientBlock
        topic={topic}
        locked={sim.running}
        onSelect={(value) => {
          setTopic(value)
          // block 2 & 3 remount theo key={topic} → state + validity reset sạch
          setContent(emptyContent)
          setUnresolved([])
          setContentValid(false)
          setPreviewOpened(false)
        }}
      />
      {/* fieldset disabled khoá mọi input trong block 2 khi nháp đã khoá */}
      <fieldset disabled={sim.running} className="contents">
        <ContentBlock key={topic} topic={topic} onValid={setContentValid} onSelect={setContent} />
      </fieldset>
      <PreviewBlock
        key={`preview-${topic}`}
        topic={topic}
        content={content}
        onOpen={markPreviewOpened}
        onUnresolved={onUnresolved}
      />
      <SendBlock
        enabled={canSend}
        topic={topic}
        estimate={estimate}
        sim={sim}
        // UC-008 BR-10: đường tay chặn 0 người nhận bằng modal, không gửi im lặng
        onSend={() => {
          if (guardRunning()) return
          estimate.expected === 0 ? setNoRecipient(true) : setConfirm(true)
        }}
        onSchedule={() => {
          if (guardRunning()) return
          estimate.expected === 0 ? setNoRecipient(true) : setScheduleOpen(true)
        }}
      />
      <ScheduleDialog
        open={scheduleOpen}
        facts={facts}
        onCancel={() => setScheduleOpen(false)}
        onConfirm={(at) => {
          setScheduleOpen(false)
          sim.schedule(at)
        }}
      />
      <ConfirmDialog
        open={confirm}
        title={t('confirmTitle')}
        description={
          requiresApproval
            ? t('confirmApproval')
            : t('confirmNow')
        }
        facts={facts}
        confirmLabel={requiresApproval ? t('sendApproval') : t('sendTo', { count: estimate.expected })}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          sim.start(requiresApproval)
        }}
      />
      <ConfirmDialog
        open={noRecipient}
        tone="blocking"
        title={t('zeroTitle')}
        description={t('zeroBody', { topic })}
        cancelLabel={tc('close')}
        confirmLabel={t('zeroFix')}
        confirmHref="/topics"
        onCancel={() => setNoRecipient(false)}
      >
        <ul className="space-y-1 font-mono text-sm tabular-nums text-[var(--text-primary)]">
          {estimate.noChannel > 0 && (
            <li>{t('zeroNoChannel', { count: estimate.noChannel, reason: estimate.noChannelReason ?? '' })}</li>
          )}
          {estimate.optedOut > 0 && <li>{t('zeroOptedOut', { count: estimate.optedOut })}</li>}
          {estimate.invalid > 0 && <li>{t('zeroInvalid', { count: estimate.invalid })}</li>}
          {estimate.noChannel + estimate.optedOut + estimate.invalid === 0 && (
            <li>{t('zeroNoBinding')}</li>
          )}
        </ul>
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          {t.rich('zeroApiNote', { mono: (chunks) => <span className="font-mono">{chunks}</span> })}
        </p>
      </ConfirmDialog>
    </div>
  )
}

export function ComposerForbidden() {
  const t = useTranslations('compose')
  return (
    <ForbiddenNotice
      title={t('forbiddenTitle')}
      description={t('forbiddenBody')}
      backHref="/topics"
      backLabel={t('forbiddenBack')}
    />
  )
}
