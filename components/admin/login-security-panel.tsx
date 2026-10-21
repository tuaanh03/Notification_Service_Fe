'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, LockOpen, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { loadLoginLocksAction, unlockLoginAction } from '@/app/admin/security/actions'
import { isSecuritySetting, useSettingsEditor } from '@/components/admin/system-settings-panel'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { LoginLockDto, SystemSettingDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

/** Thứ tự cố định của các quy tắc — đọc từ trên xuống như một câu: bật -> mấy lần -> trong bao lâu -> khoá bao lâu. */
const RULE_ORDER = [
  'auth.lockout_enabled',
  'auth.max_failed_attempts',
  'auth.failure_window_minutes',
  'auth.lockout_minutes',
  'auth.ip_max_failed_attempts',
  'auth.permanent_lock_after',
]

/** Màu pill theo loại khoá: khoá hẳn = `--supernova`, khoá tạm = `--solar` (chữ = màu, nền ≈ 7% — CLAUDE.md §7). */
const KIND_COLOR: Record<LoginLockDto['kind'], string> = { account: 'var(--supernova)', email: 'var(--solar)', ip: 'var(--solar)' }
const KIND_LABEL = { account: 'kindAccount', email: 'kindEmail', ip: 'kindIp' } as const

/**
 * Theo dõi & Bảo mật (ADR-0039 của backend): quy tắc chặn đăng nhập sai (cài đặt hệ thống nhóm `auth.*`, cùng cách lưu
 * từng dòng như trang Cài đặt hệ thống) + bảng khoá đang giữ, mở khoá có hỏi lại.
 */
export function LoginSecurityPanel({ initialSettings, initialLocks }: { initialSettings: SystemSettingDto[]; initialLocks: LoginLockDto[] }) {
  const t = useTranslations('security')
  const ts = useTranslations('systemSettings')
  const te = useTranslations('errors')
  const { settings, error, row } = useSettingsEditor(initialSettings, isSecuritySetting)
  const [locks, setLocks] = useState(initialLocks)
  const [locksError, setLocksError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<LoginLockDto | null>(null)
  const [pending, startTransition] = useTransition()
  const rules = [...settings].sort((a, b) => RULE_ORDER.indexOf(a.key) - RULE_ORDER.indexOf(b.key))

  const reload = () =>
    startTransition(async () => {
      const result = await loadLoginLocksAction()
      if (result.ok) {
        setLocks(result.data)
        setLocksError(null)
      } else setLocksError(te('withCode', { message: result.message, code: result.code }))
    })

  const unlock = (lock: LoginLockDto) =>
    startTransition(async () => {
      setConfirming(null)
      const result = await unlockLoginAction(lock.kind === 'ip' ? { ip: lock.subject } : { email: lock.subject })
      if (result.ok) {
        setLocks(result.data)
        setLocksError(null)
        toast.success(t('unlocked', { subject: lock.subject }))
        return
      }
      if (result.code === 'NOT_FOUND') {
        toast.info(t('notFound'))
        const fresh = await loadLoginLocksAction()
        if (fresh.ok) setLocks(fresh.data)
        return
      }
      setLocksError(te('withCode', { message: result.message, code: result.code }))
    })

  const columns: Column<LoginLockDto>[] = [
    {
      key: 'subject',
      label: t('colSubject'),
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{l.subject}</p>
          <p className="truncate text-[11px] text-[var(--text-muted)]">
            {l.kind === 'ip' ? t('ipAddress') : (l.displayName ?? (l.adminId === null ? t('noAccount') : ''))}
          </p>
        </div>
      ),
    },
    {
      key: 'kind',
      label: t('colKind'),
      render: (l) => (
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]"
          style={{
            color: KIND_COLOR[l.kind],
            borderColor: `color-mix(in srgb, ${KIND_COLOR[l.kind]} 33%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${KIND_COLOR[l.kind]} 7%, transparent)`,
          }}
        >
          <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: KIND_COLOR[l.kind] }} />
          {t(KIND_LABEL[l.kind])}
        </span>
      ),
    },
    { key: 'lockedAt', label: t('colLockedAt'), hideBelow: 'sm', render: (l) => <span className="tabular-nums">{fmtDateTime(l.lockedAt)}</span> },
    {
      key: 'until',
      label: t('colUntil'),
      hideBelow: 'lg',
      render: (l) =>
        l.until === null ? (
          <span className="text-[var(--text-secondary)]">{t('manualOnly')}</span>
        ) : (
          <span className="tabular-nums">{fmtDateTime(l.until)}</span>
        ),
    },
    {
      key: 'adminId',
      label: t('colAction'),
      align: 'right',
      render: (l) => (
        <Button size="sm" variant="outline" className="max-md:h-11" disabled={pending} onClick={() => setConfirming(l)}>
          <LockOpen /> {t('unlock')}
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{ts('saveFailed')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Panel className="p-5" ring>
        <h2 className="text-sm font-semibold">{t('rulesTitle')}</h2>
        <p className="mt-1 mb-5 text-xs text-[var(--text-secondary)]">{t('rulesIntro')}</p>
        <div className="space-y-6">{rules.map(row)}</div>
        <p className="mt-5 text-xs text-[var(--text-muted)]">{ts('propagation')}</p>
      </Panel>

      <div className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('locksTitle')}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('locksIntro')}</p>
        </div>
        <Button size="sm" variant="outline" className="max-md:h-11" disabled={pending} onClick={reload}>
          <RefreshCw /> {t('refresh')}
        </Button>
      </div>
      {locksError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertTitle>{t('unlockFailed')}</AlertTitle>
          <AlertDescription>{locksError}</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={locks}
        hideSearch={locks.length === 0}
        filterKey={locks.length > 0 ? 'kind' : undefined}
        chipLabel={(kind) => t(KIND_LABEL[kind as LoginLockDto['kind']])}
        empty={<EmptyState icon={ShieldCheck} title={t('empty')} description={t('emptyHint')} />}
      />
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        {t.rich('cliHint', {
          cmd: (chunks) => <code className="font-mono text-[11px] text-[var(--text-secondary)]">{chunks}</code>,
        })}
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{t('auditHint')}</p>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming ? t('unlockTitle', { subject: confirming.subject }) : ''}
        description={
          confirming === null ? '' : t(confirming.kind === 'account' ? 'unlockAccount' : confirming.kind === 'ip' ? 'unlockIp' : 'unlockEmail')
        }
        icon={confirming?.kind === 'account' ? undefined : LockOpen}
        confirmLabel={t('unlock')}
        onConfirm={() => confirming && unlock(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
