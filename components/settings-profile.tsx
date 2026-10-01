'use client'
import { AppLink } from '@/components/app-link'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/app-context'

const testSendResponse = `202 Accepted
{ "notification_id": "ntf_01HZ...", "recipients": 0, "status": "no_recipient" }`

/** UC-001 §A (App Owner view) + §G Gửi thử. */
export function SettingsProfile() {
  const t = useTranslations('profile')
  const { app } = useApp()
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { app: app.slug })}
        actions={
          <Button variant="outline" render={<AppLink href="/apps/new" />}>
            {t('registerAnother')}
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        {/* min-w-0: con của grid mặc định min-width:auto -> track phình theo <pre>/mono bên trong (mục 6) */}
        <Panel className="min-w-0 p-5" glow>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{app.name}</h2>
              <p className="mt-1 break-all font-mono text-xs text-[var(--text-muted)]">
                {app.slug} · {app.app_id}
              </p>
            </div>
            <StatusPill status={app.status} />
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">topic_namespace</dt>
              <dd className="mt-1 font-mono text-[var(--starlight)]">{app.namespace}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('contact')}</dt>
              <dd className="mt-1">{app.technical_contact ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('channels')}</dt>
              <dd className="mt-1 font-mono text-xs">{app.granted_channels.join(' · ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">{t('quota')}</dt>
              <dd className="mt-1 font-mono tabular-nums">{t('perMinute', { count: app.quota })}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="min-w-0 p-5">
          <h2 className="text-sm font-semibold">{t('testSend')}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('testSendBody')}</p>
          <div className="mt-4 min-w-0 overflow-x-auto">
            <CodeBlock language="http" value={testSendResponse} />
          </div>
          {/* UC-001 BR-6: 0 người nhận ở đường API là bình thường — màu trung tính, không đỏ */}
          <Alert className="mt-4 border-[var(--orbit)] bg-transparent">
            <AlertDescription className="text-[var(--text-secondary)]">
              {t('zeroOk')}
            </AlertDescription>
          </Alert>
          <Button variant="link" className="mt-3 px-0" render={<AppLink href="/topics" />}>
            {t('manageSubscribers')} <ExternalLink data-icon="inline-end" />
          </Button>
        </Panel>
      </div>
    </>
  )
}
