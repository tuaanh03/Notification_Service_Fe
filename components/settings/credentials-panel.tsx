'use client'
import { useState } from 'react'
import { KeyRound, RotateCcw, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { AuditTrail } from '@/components/audit-trail'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/components/app-context'
import {
  MAX_ACTIVE_SECRETS,
  appSecrets,
  credentialAudit,
  credentialAuditEntries,
  nextSecretHint,
  type AppSecret,
  type AuditEntry,
} from '@/lib/mock-data'

const HEADERS = ['Hint', 'Trạng thái', 'Tạo lúc', 'Xoay lúc', 'Thu hồi lúc', '']

/** UC-001 §E — bảng secret chỉ có hint; rotate có confirm nêu hậu quả; tối đa 2 active để rotate không downtime. */
export function CredentialsPanel() {
  const { app } = useApp()
  const [secrets, setSecrets] = useState<AppSecret[]>(appSecrets)
  const [audit, setAudit] = useState<AuditEntry[]>(credentialAuditEntries)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [revoking, setRevoking] = useState<AppSecret | null>(null)
  const activeCount = secrets.filter((s) => s.status === 'active').length
  const atLimit = activeCount >= MAX_ACTIVE_SECRETS

  const rotate = () => {
    const hint = nextSecretHint(secrets)
    const current = secrets.find((s) => s.status === 'active')
    setSecrets((prev) => [...prev, { hint, status: 'active', created_at: 'vừa xong' }])
    setAudit((prev) => [
      { actor: 'lan.nguyen', action: 'credential_rotated', from: current?.hint, to: hint, timestamp: 'vừa xong', source: 'admin' },
      ...prev,
    ])
    setRotateOpen(false)
    toast.success('Đã sinh secret mới', { description: `${hint} — bản gốc chỉ hiện một lần ở modal cấp credential.` })
  }
  const revoke = (target: AppSecret) => {
    setSecrets((prev) =>
      prev.map((s) => (s.hint === target.hint ? { ...s, status: 'revoked', revoked_at: 'vừa xong' } : s)),
    )
    setAudit((prev) => [
      { actor: 'lan.nguyen', action: 'credential_revoked', from: target.hint, timestamp: 'vừa xong', source: 'admin' },
      ...prev,
    ])
    setRevoking(null)
  }

  const rotateButton = (
    <Button variant="outline" disabled={atLimit} onClick={() => setRotateOpen(true)}>
      <RotateCcw />
      Sinh secret mới
    </Button>
  )
  return (
    <>
      <PageHeader title="Credentials" subtitle={`Vòng đời secret của ${app.slug} · app_id không đổi`} />
      <Panel className="p-5" ring>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Secrets</h2>
            {/* UC-001 BR-4: không bao giờ hiện secret đầy đủ ở đây */}
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Hệ thống chỉ lưu SHA-256 hash. Mất secret thì phải xoay, không cấp lại được.
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
              {activeCount}/{MAX_ACTIVE_SECRETS} secret active
            </p>
          </div>
          {atLimit ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{rotateButton}</TooltipTrigger>
              <TooltipContent>
                Đã có {MAX_ACTIVE_SECRETS} secret active — thu hồi secret cũ trước khi sinh thêm.
              </TooltipContent>
            </Tooltip>
          ) : (
            rotateButton
          )}
        </div>
        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                {HEADERS.map((h, i) => (
                  <TableHead key={i} className="px-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((s) => (
                <TableRow key={s.hint} className="h-11 border-[var(--orbit)]" data-status={s.status}>
                  <TableCell className="px-3 font-mono text-xs text-[var(--starlight)]">
                    <KeyRound className="mr-2 inline size-3.5" />
                    {s.hint}
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusPill status={s.status} />
                  </TableCell>
                  <TableCell className="px-3 text-xs">{s.created_at}</TableCell>
                  <TableCell className="px-3 text-xs">{s.rotated_at ?? '—'}</TableCell>
                  <TableCell className="px-3 text-xs">{s.revoked_at ?? '—'}</TableCell>
                  <TableCell className="px-3 text-right">
                    {s.status === 'active' && (
                      <Button variant="ghost" size="xs" onClick={() => setRevoking(s)} aria-label={`Thu hồi ${s.hint}`}>
                        <ShieldOff /> Thu hồi
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <Panel className="mt-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">Audit credentials</h2>
        {/* chỉ credential_issued / credential_rotated / credential_revoked */}
        <AuditTrail entries={credentialAudit(audit)} />
      </Panel>

      <ConfirmDialog
        open={rotateOpen}
        tone="warning"
        title="Sinh secret mới?"
        description="Secret cũ bị thu hồi ngay, và mọi access_token đang lưu hành hết hiệu lực. app_id không đổi."
        facts={[
          ['app_id', app.app_id],
          ['secret mới', nextSecretHint(secrets)],
          ['active sau khi sinh', `${activeCount + 1}/${MAX_ACTIVE_SECRETS}`],
        ]}
        confirmLabel="Sinh secret mới"
        onConfirm={rotate}
        onCancel={() => setRotateOpen(false)}
      />
      <ConfirmDialog
        open={revoking !== null}
        tone="warning"
        title="Thu hồi secret?"
        description="Mọi access_token đổi từ secret này hết hiệu lực ngay. Không hoàn tác được."
        facts={
          revoking
            ? [
                ['secret', revoking.hint],
                ['tạo lúc', revoking.created_at],
                ['active còn lại', `${activeCount - 1}/${MAX_ACTIVE_SECRETS}`],
              ]
            : []
        }
        confirmLabel="Thu hồi"
        onConfirm={() => revoking && revoke(revoking)}
        onCancel={() => setRevoking(null)}
      />
    </>
  )
}
