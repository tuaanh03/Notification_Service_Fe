'use client'
import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AppDto } from '@/lib/api/types'
import { DEFAULT_GRANT, toGrant, type GrantDraft } from './wizard-types'
import { GrantFields } from './grant-fields'

/**
 * Hộp duyệt app ở `/admin/apps` — bọc `<ConfirmDialog>` (hộp xác nhận duy nhất của app),
 * không dựng `<Dialog>` song song.
 *
 * Duyệt là lúc app NHẬN QUYỀN, nên hộp này nêu đủ dữ kiện nhận dạng app rồi mới hỏi hạn mức.
 */
export function ApproveAppDialog({
  app,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  app: AppDto | null
  pending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (grant: ReturnType<typeof toGrant>) => void
}) {
  const t = useTranslations('approveApp')
  const [grant, setGrant] = useState<GrantDraft>(DEFAULT_GRANT)
  const [acknowledged, setAcknowledged] = useState(false)

  const close = () => {
    setGrant(DEFAULT_GRANT)
    setAcknowledged(false)
    onCancel()
  }

  return (
    <ConfirmDialog
      open={app !== null}
      title={t('title')}
      description={t('body')}
      facts={
        app
          ? [
              ['app', `${app.name} · ${app.slug}`],
              ['namespace', app.namespace],
              ['origin', app.origin],
            ]
          : undefined
      }
      confirmLabel={pending ? t('approving') : t('confirm')}
      confirmDisabled={!acknowledged || pending}
      onConfirm={() => onConfirm(toGrant(grant))}
      onCancel={close}
    >
      <div className="space-y-4">
        <GrantFields
          id="approve"
          grant={grant}
          onGrantChange={setGrant}
          acknowledged={acknowledged}
          onAcknowledgedChange={setAcknowledged}
        />
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
