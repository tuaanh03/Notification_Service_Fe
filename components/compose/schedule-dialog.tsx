'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WORKING_HOURS } from '@/lib/mock-data'

/** Ngoài giờ làm việc? (UC-008 §E) — cảnh báo nhưng vẫn cho lưu */
export const outsideWorkingHours = (iso: string) => {
  const h = new Date(iso).getHours()
  return Number.isNaN(h) ? false : h < WORKING_HOURS.start || h >= WORKING_HOURS.end
}
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

export function ScheduleDialog({
  open,
  facts,
  onCancel,
  onConfirm,
}: {
  open: boolean
  facts: [string, string][]
  onCancel: () => void
  onConfirm: (at: string) => void
}) {
  const [at, setAt] = useState('')
  const late = at && outsideWorkingHours(at)
  return (
    <ConfirmDialog
      open={open}
      title="Hẹn giờ gửi"
      description="Nội dung khoá lại khi lưu lịch. Người nhận sẽ được giải lại từ đầu tại thời điểm chạy."
      facts={facts}
      confirmLabel="Lưu lịch"
      onCancel={onCancel}
      onConfirm={() => at && onConfirm(at)}
    >
      <div className="space-y-1">
        <Label htmlFor="schedule-at">Thời điểm gửi</Label>
        <Input
          id="schedule-at"
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>
      {late && (
        <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/10">
          <Clock />
          <AlertDescription className="text-[var(--solar)]">
            Thư sẽ tới lúc <span className="font-mono tabular-nums">{formatTime(at)}</span>. Người nhận nội bộ
            nhiều khả năng thấy phiền → dễ bấm Junk.
          </AlertDescription>
        </Alert>
      )}
    </ConfirmDialog>
  )
}
