'use client'
import { useState } from 'react'
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
  const { app } = useApp()
  const reviewers = app.reviewers ?? []
  const [picked, setPicked] = useState<string[]>([])
  const targets = mode === 'me' ? [CURRENT_USER.email] : picked
  return (
    <ConfirmDialog
      open={mode !== null}
      title={mode === 'me' ? 'Gửi thử cho tôi' : 'Gửi thử cho nhóm rà soát'}
      description={
        mode === 'me'
          ? `Gửi tới ${CURRENT_USER.email}. Không đụng tới subscriber nào của topic.`
          : 'Chỉ chọn trong nhóm rà soát app đã khai. Không đụng tới subscriber nào.'
      }
      facts={[
        ['Subject', `[BẢN THỬ] ${subject || '(chưa có nội dung)'}`],
        ['Người nhận', `${targets.length} người (test_send)`],
      ]}
      confirmLabel={`Gửi thử cho ${targets.length} người`}
      onCancel={onClose}
      onConfirm={() => {
        if (targets.length === 0) return
        toast.success('Đã gửi bản thử', {
          description: `${targets.join(', ')} · ghi log test_send, không tính vào báo cáo thật.`,
        })
        onClose()
      }}
    >
      {mode === 'reviewers' && (
        <div className="space-y-2">
          {reviewers.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">App chưa khai nhóm rà soát (settings → Hồ sơ).</p>
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
