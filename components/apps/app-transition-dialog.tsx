'use client'
import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AppTransition } from '@/lib/api/apps'
import type { AppDto } from '@/lib/api/types'

/** Hành động console cho phép trên một app đang chạy. `submit` thuộc wizard, không ở đây. */
export type AppAction = Extract<AppTransition, 'suspend' | 'resume' | 'revoke'>

/**
 * Chữ cho từng hành động. `revoked` là trạng thái KẾT THÚC trong `app-transitions.ts` — không
 * có `resume`, không có đường nào quay lại — nên câu cảnh báo phải nói đúng điều đó, không
 * dùng câu chung chung.
 */
const COPY: Record<AppAction, { title: string; description: string; confirm: string; blocking: boolean }> = {
  suspend: {
    title: 'Tạm ngưng app này?',
    description:
      'App ngừng gửi được thư ngay lập tức. Khoá API vẫn còn, mở lại là chạy tiếp — không mất gì.',
    confirm: 'Tạm ngưng',
    blocking: false,
  },
  resume: {
    title: 'Mở lại app này?',
    description: 'App gửi thư lại được ngay. Quyền và khoá API giữ nguyên như trước khi tạm ngưng.',
    confirm: 'Mở lại',
    blocking: false,
  },
  revoke: {
    title: 'Thu hồi app này?',
    description:
      'Thu hồi là trạng thái KẾT THÚC — không có đường quay lại, kể cả mở lại. App ngừng gửi vĩnh viễn. Chỉ tạm ngưng nếu bạn còn định dùng lại.',
    confirm: 'Thu hồi vĩnh viễn',
    blocking: true,
  },
}

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
  const [reason, setReason] = useState('')
  const copy = COPY[action]

  const close = () => {
    setReason('')
    onCancel()
  }

  return (
    <ConfirmDialog
      open={app !== null}
      title={copy.title}
      description={copy.description}
      tone={copy.blocking ? 'blocking' : 'warning'}
      facts={
        app
          ? [
              ['app', `${app.name} · ${app.slug}`],
              ['trạng thái', app.status],
              ['namespace', app.namespace],
            ]
          : undefined
      }
      confirmLabel={pending ? 'Đang xử lý…' : copy.confirm}
      confirmDisabled={reason.trim().length === 0 || pending}
      onConfirm={() => onConfirm(reason.trim())}
      onCancel={close}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="transition-reason">Lý do</Label>
          <Textarea
            id="transition-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Đội đã ngừng dự án, không còn gửi thông báo."
            maxLength={500}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Bắt buộc, vào nhật ký hệ thống. Tối đa 500 ký tự.
          </p>
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
