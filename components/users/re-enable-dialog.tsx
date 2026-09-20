'use client'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Subscription } from '@/lib/mock-data'
import { maskValue } from '@/lib/mock-data'

/**
 * UC-007 §E "Bật lại" của admin — bắt buộc có bằng chứng yêu cầu (ticket / trích dẫn email chính chủ).
 * Không bao giờ là toggle trơn. Dùng chung /users/[id] và Preference center (08).
 */
export function ReEnableDialog({
  subscription,
  onConfirm,
  onCancel,
}: {
  subscription: Subscription | null
  onConfirm: (evidence: string) => void
  onCancel: () => void
}) {
  const [evidence, setEvidence] = useState('')
  const s = subscription
  return (
    <ConfirmDialog
      open={s !== null}
      title="Bật lại nhận tin?"
      description="Người này đã tắt. Bật lại cần bằng chứng họ yêu cầu — không có thì đừng."
      facts={s ? [['kênh', `${s.channel} · ${maskValue(s.channel, s.value)}`], ['tắt lúc', s.unsubscribed_at ?? '—'], ['tắt bởi', s.unsubscribed_by ?? '—']] : []}
      confirmLabel="Bật lại"
      confirmDisabled={!evidence.trim()}
      onConfirm={() => {
        onConfirm(evidence.trim())
        setEvidence('')
      }}
      onCancel={onCancel}
    >
      <div className="space-y-1">
        <Label htmlFor="re-evidence" className="text-xs">
          Bằng chứng yêu cầu <span className="text-[var(--supernova)]">*</span>
        </Label>
        <Textarea
          id="re-evidence"
          placeholder="Mã ticket hoặc trích dẫn email của chính chủ"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="min-h-20"
        />
      </div>
      <Alert className="border-[var(--orbit)] bg-transparent">
        <AlertDescription className="text-[var(--text-secondary)]">
          Hệ thống sẽ gửi email báo cho chính chủ kèm nút hoàn tác.
        </AlertDescription>
      </Alert>
    </ConfirmDialog>
  )
}
