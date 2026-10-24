'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, KeyRound, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { revokeAnyTokenAction } from '@/app/account/tokens/actions'
import { ScopeBadge } from '@/components/account/tokens-page'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { InfoHint } from '@/components/info-hint'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { AdminPersonalAccessTokenDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

/**
 * Khối "Khoá truy cập cá nhân đang hoạt động" của Theo dõi & Bảo mật (ADR-0041 §9 của backend): PAT còn hiệu lực của
 * MỌI người, để Super Admin dập token bị lộ. Thu hồi luôn qua `<ConfirmDialog tone="blocking">` — script đang dùng
 * khoá đó hỏng ngay, không có đường quay lại. `error` = đọc danh sách hỏng (khối hiện mã, phần còn lại của màn vẫn dùng được).
 */
export function PatAdminPanel({ initial, error }: { initial: AdminPersonalAccessTokenDto[]; error: string | null }) {
  const t = useTranslations('account')
  const [tokens, setTokens] = useState(initial)
  const [revoking, setRevoking] = useState<AdminPersonalAccessTokenDto | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const revoke = (token: AdminPersonalAccessTokenDto) =>
    startTransition(async () => {
      const result = await revokeAnyTokenAction(token.tokenId)
      if (!result.ok) return setRevokeError(result.message)
      setRevokeError(null)
      setRevoking(null)
      setTokens(result.data.tokens)
      if (result.data.gone) toast.info(t('goneAlready'))
      else toast.success(t('revoked', { name: token.name }))
    })

  const columns: Column<AdminPersonalAccessTokenDto>[] = [
    {
      key: 'adminEmail',
      label: t('colOwner'),
      render: (x) => (
        <div className="min-w-0 whitespace-normal">
          <p className="break-all font-mono text-xs">{x.adminEmail}</p>
          {x.adminName && <p className="text-[11px] text-[var(--text-muted)]">{x.adminName}</p>}
        </div>
      ),
    },
    {
      key: 'name',
      label: t('colName'),
      render: (x) => (
        <div className="min-w-0 whitespace-normal">
          <p className="break-words">{x.name}</p>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">{x.hint}</p>
        </div>
      ),
    },
    { key: 'scope', label: t('colScope'), hideBelow: 'sm', render: (x) => <ScopeBadge scope={x.scope} /> },
    { key: 'expiresAt', label: t('colExpires'), hideBelow: 'lg', render: (x) => <span className="font-mono tabular-nums">{fmtDateTime(x.expiresAt)}</span> },
    {
      key: 'lastUsedAt',
      label: t('colLastUsed'),
      hideBelow: 'lg',
      render: (x) =>
        x.lastUsedAt === null ? (
          <span className="text-[var(--text-muted)]">{t('neverUsed')}</span>
        ) : (
          <div className="font-mono tabular-nums">
            <p>{fmtDateTime(x.lastUsedAt)}</p>
            {x.lastUsedIp && <p className="text-[11px] text-[var(--text-muted)]">{x.lastUsedIp}</p>}
          </div>
        ),
    },
    {
      key: 'tokenId',
      label: '',
      align: 'right',
      render: (x) => (
        <Button size="sm" variant="ghost" className="text-[var(--supernova)] max-md:h-11" disabled={pending} onClick={() => setRevoking(x)}>
          <Trash2 /> {t('revoke')}
        </Button>
      ),
    },
  ]

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold">{t('adminTitle')}</h2>
        <InfoHint label={t('adminTitle')} summary={t('adminInfo')} />
      </div>
      {error ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={KeyRound} title={t('loadFailed')} description={error} />
        </Panel>
      ) : (
        <DataTable
          columns={columns}
          rows={tokens}
          hideSearch={tokens.length < 8}
          empty={<EmptyState icon={KeyRound} title={t('adminEmpty')} description={t('adminEmptyHint')} />}
        />
      )}

      <ConfirmDialog
        open={revoking !== null}
        tone="blocking"
        title={revoking ? t('revokeTitle', { name: revoking.name }) : ''}
        description={t('revokeOtherBody')}
        facts={revoking ? [[t('colOwner'), revoking.adminEmail], [t('colScope'), revoking.scope], ['token', revoking.hint]] : undefined}
        confirmLabel={pending ? t('working') : t('revoke')}
        confirmDisabled={pending}
        onCancel={() => {
          setRevoking(null)
          setRevokeError(null)
        }}
        onConfirm={() => revoking && revoke(revoking)}
      >
        {revokeError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{revokeError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>
    </section>
  )
}
