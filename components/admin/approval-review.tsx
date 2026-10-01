'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CredentialDialog } from '@/components/apps/credential-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { approvalApp, DEMO_API_KEY, requestedGrant, type ApprovalGrant } from '@/lib/mock-data'
import { AdjustForm, GrantDiff } from './adjust-form'

type Decision = '' | 'approved' | 'adjusted' | 'rejected'

/** UC-001 §C — Super Admin rà soát hồ sơ; Duyệt → mở modal credential show-once (§D). */
export function ApprovalReview({ id }: { id: string }) {
  const t = useTranslations('appReview')
  const [decision, setDecision] = useState<Decision>('')
  const [issued, setIssued] = useState(false)
  const requested = requestedGrant(approvalApp)
  // "Duyệt có điều chỉnh": grant sau khi Super Admin sửa — null = form chưa lưu
  const [adjusted, setAdjusted] = useState<{ grant: ApprovalGrant; reason: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejected, setRejected] = useState(false)
  const [credentialClosed, setCredentialClosed] = useState(false)
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{approvalApp.name}</h2>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                {approvalApp.slug} · {approvalApp.app_id}
              </p>
            </div>
            <StatusPill status={issued ? 'active' : rejected ? 'draft' : 'pending_approval'} />
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">topic_namespace</dt>
              <dd className="mt-1 font-mono text-[var(--starlight)]">{approvalApp.namespace}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('contact')}</dt>
              <dd className="mt-1">{approvalApp.technical_contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('channels')}</dt>
              <dd className="mt-1 font-mono text-xs">{approvalApp.granted_channels.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('quota')}</dt>
              <dd className="mt-1 font-mono tabular-nums">{t('perMin', { count: approvalApp.quota })}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-[var(--orbit)] pt-5">
            <h3 className="text-sm font-semibold">{t('topics')}</h3>
            {approvalApp.submitted_topics.map((topic) => (
              <div key={topic} className="mt-3 rounded-lg border border-[var(--orbit)] p-3">
                <p className="font-mono text-xs text-[var(--starlight)]">{topic}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('zeroSubscribers')}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="h-fit p-5 lg:sticky lg:top-5">
          <h2 className="text-sm font-semibold">{t('decision')}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('decisionNote')}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              disabled={issued || rejected}
              onClick={() => {
                setDecision('approved')
                setIssued(true)
              }}
            >
              {t('approve')}
            </Button>
            <Button variant="secondary" onClick={() => setDecision('adjusted')} disabled={issued || rejected}>
              {t('approveAdjusted')}
            </Button>
            <Button variant="destructive" onClick={() => setDecision('rejected')} disabled={issued || rejected}>
              {t('reject')}
            </Button>
          </div>
          {decision === 'adjusted' && !adjusted && (
            <AdjustForm requested={requested} onSubmit={(grant, reason) => setAdjusted({ grant, reason })} />
          )}
          {decision === 'adjusted' && adjusted && (
            <>
              <GrantDiff
                requested={requested}
                granted={adjusted.grant}
                reason={adjusted.reason}
                topicKeys={approvalApp.submitted_topics}
              />
              {!issued && (
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAdjusted(null)}>
                    {t('editAgain')}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setIssued(true)}>
                    {t('approveWithGrant')}
                  </Button>
                </div>
              )}
            </>
          )}
          {decision === 'rejected' && !rejected && (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (rejectNote.trim()) setRejected(true)
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="rej-reason" className="text-xs">
                  {t('rejectReason')}
                </Label>
                <NativeSelect id="rej-reason" className="w-full">
                  <NativeSelectOption>{t('reasonMissingIp')}</NativeSelectOption>
                  <NativeSelectOption>{t('reasonNamespace')}</NativeSelectOption>
                  <NativeSelectOption>{t('reasonChannel')}</NativeSelectOption>
                  <NativeSelectOption>{t('reasonOther')}</NativeSelectOption>
                </NativeSelect>
              </div>
              <Textarea
                placeholder={t('notePlaceholder')}
                required
                className="min-h-24"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)]">{t('backToDraft')}</p>
              <Button type="submit" variant="destructive" className="w-full" disabled={!rejectNote.trim()}>
                {t('rejectSubmit')}
              </Button>
            </form>
          )}
          {rejected && (
            <Alert className="mt-4 border-[var(--orbit)] bg-transparent">
              <AlertDescription className="text-[var(--text-secondary)]">
                {t.rich('rejected', { mono: (chunks) => <span className="font-mono">{chunks}</span> })}
              </AlertDescription>
            </Alert>
          )}
          {issued && credentialClosed && (
            <Alert className="mt-4 border-[var(--aurora)]/30 bg-[var(--aurora)]/[.06]">
              <AlertDescription className="text-[var(--aurora)]">
                {t('approved')}
              </AlertDescription>
            </Alert>
          )}
        </Panel>
      </div>
      <CredentialDialog app={approvalApp} apiKey={DEMO_API_KEY} open={issued && !credentialClosed} onClose={() => setCredentialClosed(true)} />
    </>
  )
}
