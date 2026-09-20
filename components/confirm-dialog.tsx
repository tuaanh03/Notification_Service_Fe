'use client'

import Link from 'next/link'
import { AlertTriangle, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  /** 3 dòng mono: topic / bao nhiêu người / template (UC-008 BR-5) */
  facts?: [string, string][]
  /** nội dung bổ sung (lý do từng người bị trừ, footnote…) — render dưới facts */
  children?: React.ReactNode
  /** `blocking` = modal chặn (icon Ban, supernova); mặc định = xác nhận có hậu quả (solar) */
  tone?: 'warning' | 'blocking'
  onConfirm?: () => void
  onCancel: () => void
  confirmLabel?: string
  /** có href → nút confirm là <Link> (CTA điều hướng, ví dụ "Sửa người nhận của topic") */
  confirmHref?: string
  cancelLabel?: string
  /** khoá nút confirm khi form trong `children` chưa hợp lệ */
  confirmDisabled?: boolean
}

/**
 * Dialog xác nhận duy nhất của app — bọc shadcn <Dialog>. Nền/viền/overlay do rule
 * `[data-slot=dialog-*]` trong globals.css; z-[100] để nằm trên <CosmicBackground fixed> và app shell.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  facts,
  children,
  tone = 'warning',
  onConfirm,
  onCancel,
  confirmLabel = 'Xác nhận',
  confirmHref,
  cancelLabel = 'Hủy',
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const Icon = tone === 'blocking' ? Ban : AlertTriangle
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        showCloseButton={false}
        // grid-cols-[minmax(0,1fr)]: `children` có thể chứa <pre>/chuỗi mono dài; cột grid `auto`
        // sẽ phình theo max-content và làm dialog cắt mất nội dung bên trái (bẫy mục 6).
        className="z-[100] grid-cols-[minmax(0,1fr)] max-w-lg rounded-2xl p-6 shadow-[var(--glow-panel)] ring-0 sm:max-w-lg"
      >
        <DialogHeader>
          <Icon
            className={cn(
              'mb-1 size-6',
              tone === 'blocking' ? 'text-[var(--supernova)]' : 'text-[var(--solar)]',
            )}
            aria-hidden="true"
          />
          <DialogTitle className="font-heading text-xl font-semibold text-[var(--text-primary)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        {facts && (
          <div className="divide-y divide-[var(--orbit)] border-y border-[var(--orbit)]">
            {facts.map(([label, value]) => (
              <div key={label} className="py-3 font-mono text-base tabular-nums text-[var(--text-primary)]">
                <span>{label} — </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
        {children}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {confirmHref ? (
            <Button render={<Link href={confirmHref} />} onClick={onCancel}>
              {confirmLabel}
            </Button>
          ) : (
            <Button type="button" onClick={onConfirm} disabled={confirmDisabled}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
