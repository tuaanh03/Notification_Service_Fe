'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CURRENT_USER } from '@/lib/mock-data'
import { useApp } from '@/components/app-context'

export type TestSendMode = 'me' | 'reviewers' | null

/**
 * UC-008 §D — Gửi thử cho tôi / cho nhóm rà soát. Không có ô nhập email: "tôi" = user đăng nhập,
 * nhóm = `app.reviewers` khai sẵn. Subject test luôn có prefix [BẢN THỬ]; log là test_send, không vào báo cáo thật.
 */
export function TestSendDialog({
  mode,
  subject,
  onClose,
}: {
  mode: TestSendMode
  subject: string
  onClose: () => void
}) {
  const t = useTranslations('testSend')
  const { app } = useApp()
  const reviewers = app.reviewers ?? []
  const [picked, setPicked] = useState<string[]>([])
  const targets = mode === 'me' ? [CURRENT_USER.email] : picked
  return (
    <ConfirmDialog
      open={mode !== null}
      title={mode === 'me' ? t('titleMe') : t('titleReviewers')}
      description={
        mode === 'me'
          ? t('bodyMe', { email: CURRENT_USER.email })
          : t('bodyReviewers')
      }
      facts={[
        // Tiền tố `[BẢN THỬ]` là chữ trên THƯ gửi đi (spec UC-008 §D), không phải chữ giao diện — giữ nguyên.
        [t('factSubject'), `[BẢN THỬ] ${subject || t('noContent')}`],
        [t('factRecipients'), t('recipientsValue', { count: targets.length })],
      ]}
      confirmLabel={t('confirm', { count: targets.length })}
      onCancel={onClose}
      onConfirm={() => {
        if (targets.length === 0) return
        toast.success(t('sent'), { description: t('sentBody', { targets: targets.join(', ') }) })
        onClose()
      }}
    >
      {mode === 'reviewers' && (
        <div className="space-y-2">
          {reviewers.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">{t('noReviewers')}</p>
          )}
          {reviewers.map((email) => (
            <div key={email} className="flex items-center gap-2">
              <Checkbox
                id={`rev-${email}`}
                checked={picked.includes(email)}
                onCheckedChange={(c) => setPicked((p) => (c === true ? [...p, email] : p.filter((e) => e !== email)))}
              />
              <Label htmlFor={`rev-${email}`} className="font-mono text-xs">
                {email}
              </Label>
            </div>
          ))}
        </div>
      )}
    </ConfirmDialog>
  )
}
