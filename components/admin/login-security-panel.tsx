'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, ChevronRight, LockOpen, RefreshCw, ShieldCheck } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
 * Theo dõi & Bảo mật (ADR-0039 của backend): bảng khoá đang giữ (trên — mở khoá có hỏi lại) + quy tắc chặn đăng nhập sai
 * (dưới, thu gọn kèm dòng tóm tắt; cài đặt hệ thống nhóm `auth.*`, lưu từng dòng như trang Cài đặt hệ thống, không in mã khoá).
 */
export function LoginSecurityPanel({ initialSettings, initialLocks }: { initialSettings: SystemSettingDto[]; initialLocks: LoginLockDto[] }) {
  const t = useTranslations('security')
  const ts = useTranslations('systemSettings')
  const te = useTranslations('errors')
  const { settings, error, row } = useSettingsEditor(initialSettings, isSecuritySetting, { showKeys: false })
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

  const kindPill = (kind: LoginLockDto['kind']) => (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]"
      style={{
        color: KIND_COLOR[kind],
        borderColor: `color-mix(in srgb, ${KIND_COLOR[kind]} 33%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${KIND_COLOR[kind]} 7%, transparent)`,
      }}
    >
      <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} />
      {t(KIND_LABEL[kind])}
    </span>
  )

  const columns: Column<LoginLockDto>[] = [
    {
      key: 'subject',
      label: t('colSubject'),
      render: (l) => (
        // Ô bảng của shadcn là `whitespace-nowrap` (bảng giãn theo nội dung, `truncate` không ăn): email dài phải được
        // xuống dòng, không thì nút Mở khoá bị đẩy ra ngoài khung điện thoại.
        <div className="min-w-0 whitespace-normal">
          <p className="break-all font-mono text-xs">{l.subject}</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {l.kind === 'ip' ? t('ipAddress') : (l.displayName ?? (l.adminId === null ? t('noAccount') : ''))}
          </p>
          {/* Điện thoại: cột Loại ẩn để nút Mở khoá còn trong khung — nhãn loại xuống dưới email. */}
          <div className="mt-1 sm:hidden">{kindPill(l.kind)}</div>
        </div>
      ),
    },
    { key: 'kind', label: t('colKind'), hideBelow: 'sm', render: (l) => kindPill(l.kind) },
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

  /** Một dòng tóm tắt khi khối quy tắc đang thu gọn — đọc được luật đang áp mà không phải mở. */
  const value = (key: string) => settings.find((x) => x.key === key)?.value
  const permanent = Number(value('auth.permanent_lock_after') ?? 0)
  const summary =
    value('auth.lockout_enabled') === false
      ? t('rulesSummaryOff')
      : t('rulesSummaryOn', {
          max: Number(value('auth.max_failed_attempts')),
          window: Number(value('auth.failure_window_minutes')),
          lock: Number(value('auth.lockout_minutes')),
          ip: Number(value('auth.ip_max_failed_attempts')),
          permanent: permanent === 0 ? t('permanentNever') : t('permanentAfter', { count: permanent }),
        })

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Việc hay làm nhất ở mục này là xem ai đang bị khoá và mở khoá — đặt lên đầu; quy tắc chỉnh một lần, thu gọn dưới. */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
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
        // Ô lọc chỉ có ích khi bảng dài; vài dòng thì nó chỉ chiếm chỗ (và bóp nút lọc trên điện thoại).
        hideSearch={locks.length < 8}
        filterKey={locks.length > 0 ? 'kind' : undefined}
        chipLabel={(kind) => t(KIND_LABEL[kind as LoginLockDto['kind']])}
        chipMono={false}
        empty={<EmptyState icon={ShieldCheck} title={t('empty')} description={t('emptyHint')} />}
      />

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle />
          <AlertTitle>{ts('saveFailed')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Panel className="mt-8 overflow-hidden">
        <Collapsible>
          <CollapsibleTrigger className="group/rules flex w-full items-start gap-3 p-5 text-left hover:bg-[var(--orbit)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--starlight)]">
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-[var(--text-secondary)] transition-transform group-data-[panel-open]/rules:rotate-90" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t('rulesTitle')}</span>
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">{summary}</span>
            </span>
            <span className="shrink-0 text-xs text-[var(--starlight)] group-data-[panel-open]/rules:hidden">{t('rulesEdit')}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-[var(--orbit)] p-5">
              <p className="mb-5 text-xs text-[var(--text-secondary)]">{t('rulesIntro')}</p>
              <div className="space-y-6">{rules.map(row)}</div>
              <p className="mt-5 text-xs text-[var(--text-muted)]">{ts('propagation')}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Panel>

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
