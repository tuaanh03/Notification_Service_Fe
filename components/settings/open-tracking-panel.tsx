'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, MailOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { loadOpenTrackingAction, setOpenTrackingAction } from '@/app/settings/tracking/actions'
import { useApp } from '@/components/app-context'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { useRole } from '@/components/role-context'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { OpenTrackingDto } from '@/lib/api/types'

/**
 * `/settings/tracking` — bật / tắt đếm "đã mở" của app đang xem (ADR-0031 của backend). Ai xem app
 * cũng thấy trạng thái; chỉ người quản lý app (`canManage`) bật / tắt — backend vẫn chặn (403).
 */
export function OpenTrackingPanel() {
  const t = useTranslations('tracking')
  const te = useTranslations('errors')
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const appId = app.app_id

  const [view, setView] = useState<OpenTrackingDto | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadOpenTrackingAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
    } else {
      setView(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

  useEffect(() => {
    setView(null)
    setLoadError(null)
    void load()
  }, [load])

  const toggle = (enabled: boolean) =>
    startTransition(async () => {
      const result = await setOpenTrackingAction(appId, enabled)
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setView(result.data)
      toast.success(enabled ? t('enabledToast') : t('disabledToast'))
    })

  const header = <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.slug })} />

  if (loadError) {
    return (
      <>
        {header}
        <Panel className="overflow-hidden">
          <EmptyState
            icon={MailOpen}
            title={t('loadFailed')}
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                {t('retry')}
              </Button>
            }
          />
        </Panel>
      </>
    )
  }

  return (
    <>
      {header}
      {view && !view.ready && (
        <Alert className="mb-5">
          <AlertTriangle />
          <AlertDescription>{t('notReady')}</AlertDescription>
        </Alert>
      )}
      <Panel className="p-5" ring>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="open-tracking">{t('toggle')}</Label>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t('hint')}</p>
          </div>
          <Switch
            id="open-tracking"
            checked={view?.enabled ?? false}
            disabled={!view || !writable || pending}
            onCheckedChange={toggle}
          />
        </div>
      </Panel>
    </>
  )
}
