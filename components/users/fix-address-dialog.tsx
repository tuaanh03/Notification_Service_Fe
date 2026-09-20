'use client'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Subscription } from '@/lib/mock-data'

/** UC-007 BR-9: invalid → "Sửa địa chỉ", KHÔNG phải "Bật lại". Đổi mailbox không xoá opt-out cũ. */
export function FixAddressDialog({
  subscription,
  onConfirm,
  onCancel,
}: {
  subscription: Subscription | null
  onConfirm: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')
  const s = subscription
  const valid = s?.channel === 'email' ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) : value.trim().length >= 8
  return (
    <ConfirmDialog
      open={s !== null}
      title="Sửa địa chỉ nhận"
      description="Mailbox này đã chết (hard bounce). Bật lại một mailbox chết chỉ tạo thêm bounce — thay địa chỉ mới."
      facts={s ? [['kênh', s.channel], ['địa chỉ cũ', s.value], ['lỗi', s.error ?? '—']] : []}
      confirmLabel="Lưu địa chỉ mới"
      confirmDisabled={!valid}
      onConfirm={() => {
        onConfirm(value.trim())
        setValue('')
      }}
      onCancel={onCancel}
    >
      <div className="space-y-1">
        <Label htmlFor="fix-value" className="text-xs">
          Địa chỉ mới
        </Label>
        <Input id="fix-value" value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" placeholder={s?.channel === 'email' ? 'ten.moi@enterprise.vn' : '09xxxxxxxx'} />
      </div>
      <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
        <AlertDescription className="text-[var(--solar)]">
          Đổi địa chỉ không xoá các opt-out cũ — đổi mailbox không có nghĩa là đã đồng ý nhận lại.
        </AlertDescription>
      </Alert>
    </ConfirmDialog>
  )
}
