'use client'
import { LockKeyhole, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAppSelection } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { appKey } from '@/lib/app-routes'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { App } from '@/lib/mock-data'
import type { ActionStop } from '@/lib/api/result'
import type { IssuedAppSecretDto } from '@/lib/api/types'
import { CredentialDialog } from './credential-dialog'

/**
 * Bước 4 — app đã nằm trong hệ thống và `active` (ADR-0023 của backend: không còn duyệt).
 *
 * Khoá API đầu tiên hiện ĐÚNG MỘT LẦN ở `<CredentialDialog>`: đóng là mất, cấp lại ở Khoá API.
 * Chuỗi dừng giữa chừng thì nói rõ dừng ở đâu và chỉ chỗ làm nốt — không mời bấm tạo lại.
 */
export function StepDone({
  app,
  created,
  secret,
  onCloseSecret,
}: {
  app: App
  created: { topicsCreated: number; stoppedAt: ActionStop | null }
  secret: IssuedAppSecretDto | null
  onCloseSecret: () => void
}) {
  const t = useTranslations('wizard')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  // App mới tạo: lấy giá trị `?app=` từ danh sách đã nạp lại (có thể kèm đuôi khi trùng slug).
  const { apps } = useAppSelection()
  const key = appKey(apps.find((a) => a.app_id === app.app_id) ?? app)
  const link = (href: string) => (chunks: React.ReactNode) => (
    <AppLink href={href} app={key} className="underline">
      {chunks}
    </AppLink>
  )

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
          {t('createdSummary', { topics: created.topicsCreated })}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-lg text-center">
        {created.stoppedAt ? (
          <Alert variant="destructive" className="text-left">
            <TriangleAlert />
            <AlertTitle>{t('stoppedTitle', { step: created.stoppedAt.step })}</AlertTitle>
            <AlertDescription>
              {t.rich('stoppedBody', { message: created.stoppedAt.message, mono, link: link('/') })}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">{t.rich('activeNote', { mono, link: link('/topics') })}</p>
        )}
      </div>

      {secret && <CredentialDialog app={app} apiKey={secret.apiKey} open onClose={onCloseSecret} />}
    </div>
  )
}
