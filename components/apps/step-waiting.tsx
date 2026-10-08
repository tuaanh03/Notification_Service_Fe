'use client'
import { LockKeyhole, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAppSelection } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { appKey } from '@/lib/app-routes'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { App } from '@/lib/mock-data'
import type { ActionStop } from '@/lib/api/result'
import type { IssuedAppSecretDto } from '@/lib/api/types'
import { CredentialDialog } from './credential-dialog'
import { GrantFields } from './grant-fields'
import type { GrantDraft } from './wizard-types'

/**
 * Bước 4 — app đã nằm trong hệ thống, đang chờ duyệt.
 *
 * Duyệt là hành động RIÊNG, không phải phần đuôi của việc tạo: đây mới là chỗ quyết định app
 * được gửi kênh nào và trần bao nhiêu. Chỉ Super Admin duyệt được (ADR-0022): người khác thấy
 * "đã gửi duyệt, chờ Super Admin" thay cho ô cấp quyền.
 */
export function StepWaiting({
  app,
  created,
  grant,
  onGrantChange,
  acknowledged,
  onAcknowledgedChange,
  pending,
  error,
  stop,
  secret,
  canApprove,
  onApprove,
  onCloseSecret,
}: {
  app: App
  created: { rulesAdded: number; topicsCreated: number; stoppedAt: ActionStop | null }
  grant: GrantDraft
  onGrantChange: (next: GrantDraft) => void
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
  pending: boolean
  error: string | null
  stop: ActionStop | null
  secret: IssuedAppSecretDto | null
  canApprove: boolean
  onApprove: () => void
  onCloseSecret: () => void
}) {
  const t = useTranslations('wizard')
  const ta = useTranslations('approveApp')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const active = app.status === 'active'
  // App mới tạo: lấy giá trị `?app=` từ danh sách đã nạp lại (có thể kèm đuôi khi trùng slug).
  const { apps } = useAppSelection()
  const key = appKey(apps.find((a) => a.app_id === app.app_id) ?? app)

  return (
    <div className="py-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)] shadow-[var(--glow-starlight-lg)]">
          <LockKeyhole className="size-6" />
        </div>
        <StatusPill status={app.status} />
        <h2 className="mt-4 text-2xl font-semibold">{app.name}</h2>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{app.app_id}</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-[var(--text-secondary)]">
          {t('createdSummary', { topics: created.topicsCreated, rules: created.rulesAdded })}
        </p>
      </div>

      {created.stoppedAt && (
        <Alert variant="destructive" className="mt-6">
          <TriangleAlert />
          <AlertTitle>{t('stoppedTitle', { step: created.stoppedAt.step })}</AlertTitle>
          <AlertDescription>
            {t.rich('stoppedBody', {
              message: created.stoppedAt.message,
              status: app.status,
              mono,
              link: (chunks) => (
                <AppLink href="/admin/apps" className="underline">
                  {chunks}
                </AppLink>
              ),
            })}
          </AlertDescription>
        </Alert>
      )}

      {!active && !created.stoppedAt && !canApprove && (
        <Alert className="mx-auto mt-8 max-w-lg">
          <AlertTitle>{t('waitingReviewTitle')}</AlertTitle>
          <AlertDescription>{t('waitingReviewBody')}</AlertDescription>
        </Alert>
      )}

      {!active && !created.stoppedAt && canApprove && (
        <div className="mx-auto mt-8 max-w-lg space-y-4 rounded-xl border border-[var(--orbit)] p-5">
          <div>
            <h3 className="text-sm font-semibold">{t('approveTitle')}</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{t.rich('approveBody', { mono })}</p>
          </div>
          <GrantFields
            id="wz"
            grant={grant}
            onGrantChange={onGrantChange}
            acknowledged={acknowledged}
            onAcknowledgedChange={onAcknowledgedChange}
          />
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" disabled={pending || !acknowledged} onClick={onApprove}>
            {pending ? ta('approving') : ta('confirm')}
          </Button>
        </div>
      )}

      {active && (
        <div className="mx-auto mt-8 max-w-lg text-center">
          {stop ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>{t('noKeyTitle')}</AlertTitle>
              <AlertDescription>
                {t.rich('noKeyBody', {
                  message: stop.message,
                  mono,
                  link: (chunks) => (
                    <AppLink href="/settings/credentials" app={key} className="underline">
                      {chunks}
                    </AppLink>
                  ),
                })}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              {t.rich('activeNote', {
                mono,
                link: (chunks) => (
                  <AppLink href="/topics" app={key} className="underline">
                    {chunks}
                  </AppLink>
                ),
              })}
            </p>
          )}
        </div>
      )}

      {secret && <CredentialDialog app={app} apiKey={secret.apiKey} open onClose={onCloseSecret} />}
    </div>
  )
}
