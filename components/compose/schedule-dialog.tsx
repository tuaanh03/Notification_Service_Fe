'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('schedule')
  const [at, setAt] = useState('')
  const late = at && outsideWorkingHours(at)
  return (
    <ConfirmDialog
      open={open}
      title={t('title')}
      description={t('body')}
      facts={facts}
      confirmLabel={t('save')}
      onCancel={onCancel}
      onConfirm={() => at && onConfirm(at)}
    >
      <div className="space-y-1">
        <Label htmlFor="schedule-at">{t('at')}</Label>
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
            {t.rich('late', {
              time: formatTime(at),
              mono: (chunks) => <span className="font-mono tabular-nums">{chunks}</span>,
            })}
          </AlertDescription>
        </Alert>
      )}
    </ConfirmDialog>
  )
}
