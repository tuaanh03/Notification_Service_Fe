'use client'
import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { apps } from '@/lib/mock-data'
import { CredentialDialog } from './credential-dialog'

/** Step 4 — Chờ duyệt: form khoá, chưa sinh credential. Nút demo mô phỏng Super Admin duyệt → modal show-once. */
export function StepWaiting() {
  const [issued, setIssued] = useState(false)
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)] shadow-[var(--glow-starlight-lg)]">
        <LockKeyhole className="size-6" />
      </div>
      <StatusPill status="pending_approval" />
      <h2 className="mt-4 text-2xl font-semibold">Đang chờ Super Admin duyệt</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-secondary)]">
        Form đã khoá. Nhóm Super Admin đã được thông báo về yêu cầu đăng ký này.
      </p>
      <p className="mt-5 font-mono text-xs text-[var(--solar)]">Chưa sinh credential.</p>
      <Button variant="outline" size="sm" className="mt-6" onClick={() => setIssued(true)}>
        Demo: Super Admin đã duyệt
      </Button>
      <CredentialDialog app={apps[3]} open={issued} onClose={() => setIssued(false)} />
    </div>
  )
}
