'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, KeyRound, PlugZap, RotateCcw, ShieldOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  issueSecretAction,
  loadCredentialsAction,
  revokeSecretAction,
  type CredentialsView,
} from '@/app/settings/credentials/actions'
import { AuditTrail } from '@/components/audit-trail'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { CredentialDialog } from '@/components/apps/credential-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import type { AppSecretDto, IssuedAppSecretDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

const HEADERS = ['colName', 'colHint', 'colStatus', 'colCreated', 'colLastUsed', 'colRevoked', null] as const

/** Trùng `SECRET_NAME_MAX_LENGTH` của backend. */
const NAME_MAX = 100

/**
 * UC-001 §E — vòng đời khoá API của app đang chọn. Bảng chỉ có hint; plaintext chỉ hiện
 * đúng một lần ngay sau khi cấp, trong `<CredentialDialog>` (BR-4).
 *
 * Mỗi nơi gọi `/v1` nên có khoá riêng, đặt tên để biết khoá dùng ở đâu. Trần số khoá active do
 * Super Admin chỉnh ở Cài đặt hệ thống (`apps.max_active_api_keys`) — console không biết con số,
 * vượt trần thì backend trả 422 `ACTIVE_SECRET_LIMIT`. Cấp mới KHÔNG tự thu hồi khoá cũ.
 */
export function CredentialsPanel() {
  const t = useTranslations('credentials')
  const te = useTranslations('errors')
  const { app } = useApp()
  // App Viewer chỉ xem khoá (đã che) — không cấp / thu hồi.
  const writable = useRole().canManage(app)
  const [view, setView] = useState<CredentialsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [revoking, setRevoking] = useState<AppSecretDto | null>(null)
  /** Khoá vừa cấp — chỉ nằm ở đây cho tới khi người dùng đóng modal, rồi mất hẳn. */
  const [issued, setIssued] = useState<IssuedAppSecretDto | null>(null)
  const [pending, startTransition] = useTransition()

  const appId = app.app_id

  const load = useCallback(async () => {
    const result = await loadCredentialsAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
    } else {
      setView(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

  useEffect(() => {
    setView(null)
    setLoadError(null)
    setActionError(null)
    void load()
  }, [load])

  const secrets = view?.secrets ?? []
  const trimmedName = keyName.trim()

  const openIssue = () => {
    setKeyName('')
    setIssueOpen(true)
  }

  const issue = () => {
    startTransition(async () => {
      const result = await issueSecretAction(appId, trimmedName)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setIssueOpen(false)
      setIssued(result.data)
      await load()
    })
  }

  const revoke = (target: AppSecretDto) => {
    startTransition(async () => {
      const result = await revokeSecretAction(appId, target.id)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setRevoking(null)
      toast.success(t('revoked', { hint: target.hint }))
      await load()
    })
  }

  const header = (
    <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.slug })} />
  )

  if (loadError) {
    return (
      <>
        {header}
        <Panel className="overflow-hidden">
          <EmptyState
            icon={PlugZap}
            title={t('loadFailed')}
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                {t('retry')}
              </Button>
            }
          />
        </Panel>
      </>
    )
  }

  return (
    <>
      {header}

      {actionError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('actionFailed')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Panel className="p-5" ring>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          {/* UC-001 BR-4: không bao giờ hiện khoá đầy đủ ở đây */}
          <h2 className="text-sm font-semibold">{t('keys')}</h2>
          {writable && (
            <Button variant="outline" disabled={pending} onClick={openIssue}>
              <RotateCcw />
              {t('issue')}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                {HEADERS.map((h, i) => (
                  <TableHead key={i} className="px-3">
                    {h && t(h)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((s) => (
                <TableRow key={s.id} className="h-11 border-[var(--orbit)]" data-status={s.status}>
                  <TableCell className="max-w-56 truncate px-3" title={s.name ?? undefined}>
                    {s.name ?? '—'}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs text-[var(--starlight)]">
                    <KeyRound className="mr-2 inline size-3.5" />
                    {s.hint}
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusPill status={s.status} />
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs">{fmtDateTime(s.createdAt)}</TableCell>
                  <TableCell className="px-3 font-mono text-xs">
                    {s.lastUsedAt ? fmtDateTime(s.lastUsedAt) : t('neverUsed')}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs">
                    {s.revokedAt ? fmtDateTime(s.revokedAt) : '—'}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    {writable && s.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => setRevoking(s)}
                        aria-label={t('revokeAria', { hint: s.name ?? s.hint })}
                      >
                        <ShieldOff /> {t('revoke')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {view !== null && secrets.length === 0 && (
            <EmptyState
              icon={KeyRound}
              title={t('emptyTitle')}
              description={t('emptyBody', { app: app.name })}
            />
          )}
        </div>
      </Panel>

      <Panel className="mt-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">{t('auditTitle')}</h2>
        {view && view.audit.length > 0 ? (
          <AuditTrail entries={view.audit} />
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            {t('auditEmpty')}
          </p>
        )}
      </Panel>

      <ConfirmDialog
        open={issueOpen}
        tone="warning"
        title={t('issueTitle')}
        description={t('issueBody')}
        confirmLabel={pending ? t('issuing') : t('issue')}
        confirmDisabled={pending || trimmedName === '' || trimmedName.length > NAME_MAX}
        onConfirm={issue}
        onCancel={() => setIssueOpen(false)}
      >
        <div className="space-y-2">
          <Label htmlFor="api-key-name" className="text-xs">
            {t('nameLabel')}
          </Label>
          <Input
            id="api-key-name"
            value={keyName}
            maxLength={NAME_MAX}
            autoFocus
            onChange={(e) => setKeyName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={revoking !== null}
        tone="warning"
        title={t('revokeTitle')}
        description={t('revokeBody')}
        facts={
          revoking
            ? [
                ...(revoking.name ? [[t('factName'), revoking.name] as [string, string]] : []),
                [t('factKey'), revoking.hint],
                [t('factLastUsed'), revoking.lastUsedAt ? fmtDateTime(revoking.lastUsedAt) : t('neverUsed')],
              ]
            : undefined
        }
        confirmLabel={pending ? t('revoking') : t('revoke')}
        confirmDisabled={pending}
        onConfirm={() => revoking && revoke(revoking)}
        onCancel={() => setRevoking(null)}
      />

      {issued && (
        <CredentialDialog
          app={app}
          apiKey={issued.apiKey}
          open
          onClose={() => setIssued(null)}
        />
      )}
    </>
  )
}
