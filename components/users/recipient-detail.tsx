'use client'

import { useEffect, useState } from 'react'
import { PlugZap, UserX } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadPreferencesAction, loadRecipientAction } from '@/app/users/actions'
import { useApp } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { EmptyState } from '@/components/empty-state'
import { NotificationsTable } from '@/components/notifications/notifications-table'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import type { RecipientDto, UserPreferencesDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { RecipientPreferences, useSuppressedLabel } from './recipient-preferences'

type Failure = { message: string; code: string }

/**
 * Trang chi tiết MỘT người nhận — trả lời cả hai câu hỏi hỗ trợ trên một màn:
 * "có bị chặn không" (cài đặt nhận tin) và "thư đã ra sao" (các lần gửi).
 *
 * CHỈ ĐỌC, như `/users` và `/notifications` — không công tắc chủ đề, không Gửi lại / Huỷ.
 *
 * App lấy từ `?app=` như mọi màn (`lib/app-routes.ts`); đổi app ở đây thì về `/users`
 * (`APP_DETAIL_ROUTES`) — cùng mã ở app khác là người khác.
 */
export function RecipientDetail({ externalId }: { externalId: string }) {
  const t = useTranslations('recipientDetail')
  const tr = useTranslations('recipients')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const suppressedLabel = useSuppressedLabel()
  const { app } = useApp()
  const appId = app.app_id

  const [recipient, setRecipient] = useState<RecipientDto | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([loadRecipientAction(appId, externalId), loadPreferencesAction(appId, externalId)]).then(
      ([person, prefs]) => {
        if (!live) return
        if (person.ok) setRecipient(person.data)
        else setFailure({ message: person.message, code: person.code })
        if (prefs.ok) setPreferences(prefs.data)
        else setPreferencesError(te('withCode', { message: prefs.message, code: prefs.code }))
      },
    )
    return () => {
      live = false
    }
  }, [appId, externalId, te])

  const breadcrumb = [{ label: tr('title'), href: '/users' }, { label: externalId }]
  const back = (
    <Button variant="outline" render={<AppLink href="/users" />}>
      {t('back')}
    </Button>
  )

  if (failure) {
    return (
      <>
        <PageHeader title={externalId} breadcrumb={breadcrumb} />
        <Panel className="overflow-hidden">
          {failure.code === 'NOT_FOUND' ? (
            <EmptyState
              icon={UserX}
              title={t('notInApp', { id: externalId, app: app.name })}
              description={t('notInAppBody')}
              action={back}
            />
          ) : (
            <EmptyState
              icon={PlugZap}
              title={tc('loadErrorTitle')}
              description={te('withCode', { message: failure.message, code: failure.code })}
              action={back}
            />
          )}
        </Panel>
      </>
    )
  }

  if (!recipient) {
    return (
      <>
        <PageHeader title={externalId} breadcrumb={breadcrumb} />
        <p className="py-10 text-center text-xs text-[var(--text-muted)]">{t('loading')}</p>
      </>
    )
  }

  const email = recipient.email

  return (
    <div className="space-y-5">
      <PageHeader
        title={recipient.externalId}
        subtitle={t('subtitle', { app: app.name, at: fmtDateTime(recipient.createdAt) })}
        breadcrumb={breadcrumb}
        actions={
          email ? (
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs">{email.address}</span>
              <StatusPill status={email.status} />
              {email.suppressedReason && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {suppressedLabel(email.suppressedReason)}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">{t('noEmail')}</span>
          )
        }
      />

      <RecipientPreferences
        recipient={recipient}
        preferences={preferences}
        error={preferencesError}
        loading={preferences === null && preferencesError === null}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">{t('sends')}</h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {t('sendsNote')}
          </p>
        </div>
        <NotificationsTable recipient={recipient.externalId} />
      </section>
    </div>
  )
}
