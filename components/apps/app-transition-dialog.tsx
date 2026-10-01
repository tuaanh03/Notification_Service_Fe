'use client'
import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AppTransition } from '@/lib/api/apps'
import type { AppDto } from '@/lib/api/types'

/** Hành động console cho phép trên một app đang chạy. `submit` thuộc wizard, không ở đây. */
export type AppAction = Extract<AppTransition, 'suspend' | 'resume' | 'revoke'>

/**
 * Chữ cho từng hành động: `<action>Title` / `<action>Body` / `<action>Confirm` trong nhóm
 * `appTransition`. `revoked` là trạng thái KẾT THÚC trong `app-transitions.ts` — không có `resume`,
 * không có đường nào quay lại — nên câu cảnh báo phải nói đúng điều đó, không dùng câu chung chung.
 */
const BLOCKING: Record<AppAction, boolean> = { suspend: false, resume: false, revoke: true }

export function AppTransitionDialog({
  app,
  action,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  app: AppDto | null
  action: AppAction
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const t = useTranslations('appTransition')
  const [reason, setReason] = useState('')

  const close = () => {
    setReason('')
    onCancel()
  }

  return (
    <ConfirmDialog
      open={app !== null}
      title={t(`${action}Title`)}
      description={t(`${action}Body`)}
      tone={BLOCKING[action] ? 'blocking' : 'warning'}
      facts={
        app
          ? [
              ['app', `${app.name} · ${app.slug}`],
              [t('factStatus'), app.status],
              ['namespace', app.namespace],
            ]
          : undefined
      }
      confirmLabel={pending ? t('processing') : t(`${action}Confirm`)}
      confirmDisabled={reason.trim().length === 0 || pending}
      onConfirm={() => onConfirm(reason.trim())}
      onCancel={close}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="transition-reason">{t('reason')}</Label>
          <Textarea
            id="transition-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
            maxLength={500}
          />
          <p className="text-xs text-[var(--text-muted)]">{t('reasonHint')}</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
