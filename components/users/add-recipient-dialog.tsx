'use client'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createRecipientAction } from '@/app/users/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RecipientDto } from '@/lib/api/types'

/** Mã lỗi backend -> câu ngắn trong hộp. Mã khác: câu chung kèm mã. */
const KNOWN_ERRORS: Record<string, 'errExists' | 'errEmailTaken' | 'errEmailInvalid'> = {
  USER_ALREADY_EXISTS: 'errExists',
  EMAIL_TAKEN: 'errEmailTaken',
  EMAIL_INVALID: 'errEmailInvalid',
}

/**
 * Thêm TAY một người nhận (`POST /admin/apps/:appId/users`). Chỉ mã + email — đúng thứ hệ thống lưu
 * và dùng. Mã đã có -> báo lỗi, KHÔNG ghi đè (khác `PUT /v1/users`).
 */
export function AddRecipientDialog({
  open,
  appId,
  onClose,
  onCreated,
}: {
  open: boolean
  appId: string
  onClose: () => void
  onCreated: (recipient: RecipientDto) => void
}) {
  const t = useTranslations('recipients')
  const te = useTranslations('errors')
  const [externalId, setExternalId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const close = () => {
    setExternalId('')
    setEmail('')
    setError(null)
    onClose()
  }

  const submit = () =>
    startTransition(async () => {
      const id = externalId.trim()
      const result = await createRecipientAction(appId, { externalId: id, ...(email.trim() ? { email: email.trim() } : {}) })
      if (!result.ok) {
        const code = result.issues?.[0]?.code ?? result.code
        const path = result.issues?.[0]?.path
        const known = KNOWN_ERRORS[code]
        setError(
          known ? t(known) : path === 'externalId' ? t('errExternalId') : te('withCode', { message: result.message, code }),
        )
        return
      }
      toast.success(t('added', { id }))
      close()
      onCreated(result.data)
    })

  return (
    <ConfirmDialog
      open={open}
      title={t('addTitle')}
      description={t('addBody')}
      confirmLabel={pending ? t('adding') : t('add')}
      confirmDisabled={pending || !externalId.trim()}
      onCancel={close}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="recipient-external-id" className="text-xs">
            {t('externalIdLabel')}
          </Label>
          <Input
            id="recipient-external-id"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="NV-001"
            className="font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
            maxLength={255}
          />
          <p className="text-[11px] text-[var(--text-muted)]">{t('externalIdHint')}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipient-email" className="text-xs">
            {t('emailLabel')}
          </Label>
          <Input
            id="recipient-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="text-xs"
            autoComplete="off"
            maxLength={320}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
