'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { TriangleAlert } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Sao giới hạn của backend (`nameBody`: 1–200 ký tự sau khi bỏ khoảng trắng hai đầu). */
const MAX_NAME = 200

/**
 * Tạo tổ chức. Dùng `<ConfirmDialog children>` — dialog xác nhận duy nhất của app (CLAUDE.md mục 1).
 */
export function CreateOrgDialog({
  open,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (name: string) => void
}) {
  const t = useTranslations('orgs')
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME

  const close = () => {
    setName('')
    onCancel()
  }

  return (
    <ConfirmDialog
      open={open}
      title={t('createTitle')}
      description={t('createBody')}
      confirmLabel={pending ? t('creating') : t('create')}
      confirmDisabled={!valid || pending}
      onConfirm={() => onSubmit(trimmed)}
      onCancel={close}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">{t('nameLabel')}</Label>
          <Input
            id="org-name"
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
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
