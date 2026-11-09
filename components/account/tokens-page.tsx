'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, ArrowRight, KeyRound, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createTokenAction, revokeTokenAction } from '@/app/account/tokens/actions'
import { AppLink, useAppRouter } from '@/components/app-link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { InfoHint } from '@/components/info-hint'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { IssuedPersonalAccessTokenDto, PatScope, PersonalAccessTokenDto } from '@/lib/api/types'
import { DEVELOPERS } from '@/lib/app-routes'
import { fmtDateTime } from '@/lib/time'
import { TokenSecretDialog } from './token-secret-dialog'

/** Hạn dùng cho chọn (ngày). Trần thật là cài đặt hệ thống `pat.max_lifetime_days` — vượt thì backend trả 422. */
const LIFETIMES = [7, 30, 90, 180, 365] as const
const DEFAULT_LIFETIME = 90

/**
 * Khoá truy cập cá nhân (PAT — ADR-0044 của backend): script / CI gọi `/admin/*` bằng quyền của CHÍNH người tạo.
 * Tạo -> token hiện MỘT lần (`<TokenSecretDialog>`); danh sách chỉ có đoạn gợi nhớ; thu hồi có hỏi lại, không quay lại được.
 * Backend trả cả khoá đã hết hạn / thu hồi trong 30 ngày — chúng không có nút.
 */
export function TokensPage({ tokens: initial, error }: { tokens: PersonalAccessTokenDto[]; error: string | null }) {
  const t = useTranslations('account')
  const router = useAppRouter()
  // Danh sách giữ tại chỗ (thu hồi trả list mới); server đọc lại (sau khi tạo -> `router.refresh()`) thì lấy bản của server.
  const [tokens, setTokens] = useState(initial)
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setTokens(initial)
  }
  const [creating, setCreating] = useState(0)
  const [issued, setIssued] = useState<IssuedPersonalAccessTokenDto | null>(null)
  const [revoking, setRevoking] = useState<PersonalAccessTokenDto | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const revoke = (token: PersonalAccessTokenDto) =>
    startTransition(async () => {
      const result = await revokeTokenAction(token.tokenId)
      if (!result.ok) return setRevokeError(result.message)
      setRevokeError(null)
      setRevoking(null)
      setTokens(result.data.tokens)
      // `gone` = khoá đã không còn (404 `NOT_FOUND`) — chỉ báo nhẹ.
      if (result.data.gone) toast.info(t('goneAlready'))
      else toast.success(t('revoked', { name: token.name }))
    })

  const columns: Column<PersonalAccessTokenDto>[] = [
    {
      key: 'name',
      label: t('colName'),
      render: (x) => (
        <div className="min-w-0 whitespace-normal">
          <p className="break-words font-medium">{x.name}</p>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">{x.hint}</p>
        </div>
      ),
    },
    { key: 'scope', label: t('colScope'), render: (x) => <ScopeBadge scope={x.scope} /> },
    { key: 'status', label: t('colStatus'), render: (x) => <StatusPill status={x.status} /> },
    {
      key: 'expiresAt',
      label: t('colExpires'),
      hideBelow: 'sm',
      render: (x) => <span className="font-mono tabular-nums">{fmtDateTime(x.expiresAt)}</span>,
    },
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
      render: (x) =>
        x.status === 'active' ? (
          <Button size="sm" variant="ghost" className="text-[var(--supernova)] max-md:h-11" disabled={pending} onClick={() => setRevoking(x)}>
            <Trash2 /> {t('revoke')}
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title={t('tokensTitle')}
        subtitle={t('tokensSubtitle')}
        actions={
          <div className="flex items-center gap-2">
            <InfoHint
              label={t('tokensTitle')}
              summary={t('tokensInfo')}
              items={[
                { term: 'read', definition: t('scopeReadHelp') },
                { term: 'write', definition: t('scopeWriteHelp') },
              ]}
            />
            <Button onClick={() => setCreating((n) => n + 1)}>
              <Plus /> {t('create')}
            </Button>
          </div>
        }
      />

      {error ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={KeyRound} title={t('loadFailed')} description={error} />
        </Panel>
      ) : (
        <DataTable
          columns={columns}
          rows={tokens}
          hideSearch={tokens.length < 8}
          empty={<EmptyState icon={KeyRound} title={t('empty')} description={t('emptyHint')} />}
        />
      )}

      <AppLink href={DEVELOPERS} className="mt-4 inline-flex min-h-6 items-center gap-1 text-xs text-[var(--starlight)] hover:underline max-md:min-h-11">
        {t('toDevelopers')} <ArrowRight className="size-3" />
      </AppLink>

      {creating > 0 && (
        <CreateTokenDialog
          key={creating}
          onCancel={() => setCreating(0)}
          onCreated={(data) => {
            setCreating(0)
            setIssued(data)
            router.refresh()
          }}
        />
      )}
      {issued && <TokenSecretDialog issued={issued} onClose={() => setIssued(null)} />}

      <ConfirmDialog
        open={revoking !== null}
        tone="blocking"
        title={revoking ? t('revokeTitle', { name: revoking.name }) : ''}
        description={t('revokeBody')}
        facts={revoking ? [[t('colScope'), revoking.scope], ['token', revoking.hint]] : undefined}
        confirmLabel={pending ? t('working') : t('revoke')}
        confirmDisabled={pending}
        onCancel={() => {
          setRevoking(null)
          setRevokeError(null)
        }}
        onConfirm={() => revoking && revoke(revoking)}
      >
        {revokeError && <p className="text-xs text-[var(--supernova)]">{revokeError}</p>}
      </ConfirmDialog>
    </>
  )
}

/** `read` / `write` — mono (định danh của hợp đồng), `write` tô `--solar` vì làm được mọi lệnh ghi. */
export function ScopeBadge({ scope }: { scope: PatScope }) {
  return (
    <span
      className="inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[11px]"
      style={{ color: scope === 'write' ? 'var(--solar)' : 'var(--text-secondary)' }}
    >
      {scope}
    </span>
  )
}

/** Hộp tạo: tên + phạm vi + hạn. Dựng lại mỗi lần mở (`key`) — không giữ chữ của lần trước. */
function CreateTokenDialog({ onCancel, onCreated }: { onCancel: () => void; onCreated: (data: IssuedPersonalAccessTokenDto) => void }) {
  const t = useTranslations('account')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<PatScope>('read')
  const [days, setDays] = useState<number>(DEFAULT_LIFETIME)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const valid = name.trim().length > 0 && name.trim().length <= 100

  const submit = () =>
    startTransition(async () => {
      const result = await createTokenAction({ name: name.trim(), scope, expiresInDays: days })
      if (!result.ok) return setError(result.message)
      onCreated(result.data)
    })

  return (
    <ConfirmDialog
      open
      icon={KeyRound}
      title={t('createTitle')}
      description={t('createBody')}
      confirmLabel={pending ? t('working') : t('create')}
      confirmDisabled={!valid || pending}
      onCancel={onCancel}
      onConfirm={submit}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pat-name" className="text-xs">
            {t('nameLabel')}
          </Label>
          <Input
            id="pat-name"
            value={name}
            maxLength={100}
            placeholder={t('namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valid && !pending && submit()}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium">{t('scopeLabel')}</span>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[scope]}
            onValueChange={(v) => (v[0] === 'read' || v[0] === 'write') && setScope(v[0])}
            className="w-full"
            aria-label={t('scopeLabel')}
          >
            <ToggleGroupItem value="read" className="flex-1 text-xs">
              {t('scopeRead')}
            </ToggleGroupItem>
            <ToggleGroupItem value="write" className="flex-1 text-xs">
              {t('scopeWrite')}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[11px] text-[var(--text-muted)]">{scope === 'read' ? t('scopeReadHelp') : t('scopeWriteHelp')}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pat-days" className="text-xs">
            {t('expiresLabel')}
          </Label>
          <NativeSelect id="pat-days" value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-full">
            {LIFETIMES.map((d) => (
              <NativeSelectOption key={d} value={String(d)}>
                {t('days', { count: d })}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}
