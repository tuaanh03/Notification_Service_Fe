'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Thêm user (hồ sơ) — email/phone ở đây là định danh điểm nhận, không phải ô "gửi tới" (UC-008 BR-1 không đụng). */
export function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [ext, setExt] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const subs = [email && 'email', phone && 'sms'].filter(Boolean)
  const valid = name.trim() && ext.trim() && subs.length > 0
  return (
    <ConfirmDialog
      open={open}
      title="Thêm user"
      description="Tạo 1 hồ sơ; mỗi định danh điền vào sinh 1 subscription."
      confirmLabel={`Tạo 1 user + ${subs.length} subscription`}
      confirmDisabled={!valid}
      onConfirm={() => {
        toast.success('Đã tạo user', { description: `${name} · ${subs.length} subscription (${subs.join(', ')})` })
        onClose()
      }}
      onCancel={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nu-name" className="text-xs">Tên</Label>
          <Input id="nu-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nu-ext" className="font-mono text-xs">external_id</Label>
          <Input id="nu-ext" value={ext} onChange={(e) => setExt(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nu-email" className="text-xs">Email</Label>
          <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nu-phone" className="text-xs">Phone</Label>
          <Input id="nu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="font-mono" />
        </div>
      </div>
      <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
        <AlertDescription className="text-[var(--solar)]">
          email và phone để trống 1 trong 2 được. Trống cả hai thì không có điểm nhận nào.
        </AlertDescription>
      </Alert>
    </ConfirmDialog>
  )
}
