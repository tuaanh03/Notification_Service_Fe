'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Globe, Info, Network, PlugZap, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  addNetworkRuleAction,
  loadNetworkRulesAction,
  removeNetworkRuleAction,
  type NetworkRulesView,
} from '@/app/settings/origins/actions'
import { useApp } from '@/components/app-context'
import { useNetworkValidators } from '@/components/apps/use-network-validators'
import { AuditTrail } from '@/components/audit-trail'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NetworkRuleDto } from '@/lib/api/types'

type Kind = 'ip' | 'origin'

/**
 * Chữ của từng loại (khoá trong nhóm `network`) — khớp luật `checkNetworkAccess` của backend
 * (`network-access.ts`).
 */
const KIND = {
  ip: { title: 'ipTitle', hint: 'ipHint', empty: 'ipEmpty', icon: Network, placeholder: '10.20.0.15' },
  origin: { title: 'originTitle', hint: 'originHint', empty: 'originEmpty', icon: Globe, placeholder: 'https://service.enterprise.vn' },
} as const

/** Backend so Origin không phân biệt hoa thường, bỏ `/` cuối — kiểm trùng theo cùng cách. */
const sameValue = (kind: Kind, a: string, b: string) =>
  kind === 'origin' ? a.toLowerCase().replace(/\/+$/, '') === b.toLowerCase().replace(/\/+$/, '') : a.toLowerCase() === b.toLowerCase()

type Pending = { action: 'add' | 'remove'; rule: NetworkRuleDto }

function RuleSection({
  kind,
  rules,
  busy,
  onAdd,
  onRemove,
}: {
  kind: Kind
  rules: NetworkRuleDto[]
  busy: boolean
  onAdd: (value: string) => void
  onRemove: (rule: NetworkRuleDto) => void
}) {
  const t = useTranslations('network')
  const tv = useTranslations('validation')
  const { validateIp, validateOrigin } = useNetworkValidators()
  const meta = KIND[kind]
  const title = t(meta.title)
  const validate = kind === 'ip' ? validateIp : validateOrigin
  const Icon = meta.icon
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const value = draft.trim()
    if (!value) return
    const err = validate(value) ?? (rules.some((r) => sameValue(kind, r.value, value)) ? tv('duplicate') : null)
    if (err) return setError(err)
    setError(null)
    setDraft('')
    onAdd(value)
  }

  return (
    <Panel className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-[var(--starlight)]" /> {title}
      </h2>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{t(meta.hint)}</p>

      <ul className="mt-4 space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.value}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--orbit)] px-3 py-1.5"
          >
            <span className="min-w-0 break-all font-mono text-xs">{rule.value}</span>
            <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={t('remove', { value: rule.value })} onClick={() => onRemove(rule)}>
              <X />
            </Button>
          </li>
        ))}
        {rules.length === 0 && <li className="py-2 text-xs text-[var(--text-muted)]">{t(meta.empty)}</li>}
      </ul>

      <div className="mt-4 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={meta.placeholder}
          aria-label={t('addAria', { title })}
          aria-invalid={error !== null}
          className="min-w-0 font-mono"
        />
        <Button variant="outline" size="sm" disabled={busy || !draft.trim()} onClick={add}>
          <Plus /> {t('add')}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-[var(--supernova)]">{error}</p>}
    </Panel>
  )
}

/**
 * Cài đặt App → IP & Origin: allowlist nguồn gọi `/v1/*` của app đang xem.
 *
 * Đọc / thêm / gỡ qua `/admin/apps/:appId/network-rules` — mỗi thay đổi có hiệu lực NGAY với
 * lời gọi kế tiếp của app service, nên hai bước làm đổi hẳn hành vi phải xác nhận:
 * - thêm dòng ĐẦU TIÊN của một loại: từ "không giới hạn" thành "chỉ danh sách này";
 * - gỡ bất kỳ dòng nào: IP / trình duyệt đang dùng dòng đó bị chặn ngay; gỡ dòng CUỐI thì mở cho tất cả.
 * Thêm dòng thứ hai trở đi chỉ nới ra, không chặn ai — không hỏi lại.
 */
export function NetworkRulesPanel() {
  const t = useTranslations('network')
  const te = useTranslations('errors')
  const { app } = useApp()
  const appId = app.app_id
  const [view, setView] = useState<NetworkRulesView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Pending | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadNetworkRulesAction(appId)
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
    setConfirming(null)
    void load()
  }, [load])

  const rules = view?.rules ?? []
  const ofKind = (kind: Kind) => rules.filter((r) => r.kind === kind)
  const ips = ofKind('ip')

  const run = ({ action, rule }: Pending) =>
    startTransition(async () => {
      const result =
        action === 'add' ? await addNetworkRuleAction(appId, rule) : await removeNetworkRuleAction(appId, rule)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setConfirming(null)
      toast.success(action === 'add' ? t('added', { value: rule.value }) : t('removed', { value: rule.value }))
      await load()
    })

  const add = (kind: Kind, value: string) => {
    const rule = { kind, value }
    if (ofKind(kind).length === 0) setConfirming({ action: 'add', rule })
    else run({ action: 'add', rule })
  }

  const header = <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.slug })} />

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

  const confirmText = (() => {
    if (!confirming) return null
    const { action, rule } = confirming
    const last = ofKind(rule.kind as Kind).length === 1
    if (action === 'add') {
      return rule.kind === 'ip'
        ? {
            title: t('limitIpTitle'),
            description: t('limitIpBody', { value: rule.value }),
            label: t('limitIpLabel'),
          }
        : {
            title: t('startOriginTitle'),
            description: t('startOriginBody', { value: rule.value }),
            label: t('startOriginLabel'),
          }
    }
    return rule.kind === 'ip'
      ? last
        ? {
            title: t('lastIpTitle'),
            description: t('lastIpBody') + (app.origin === 'external' ? t('lastIpExternal') : ''),
            label: t('lastIpLabel'),
          }
        : {
            title: t('removeTitle', { value: rule.value }),
            description: t('removeIpBody'),
            label: t('removeIpLabel'),
          }
      : {
          title: t('removeTitle', { value: rule.value }),
          description: last ? t('lastOriginBody') : t('removeOriginBody'),
          label: t('removeOriginLabel'),
        }
  })()

  return (
    <>
      {header}

      <Alert className="mb-5">
        <Info />
        <AlertDescription>{t('rules')}</AlertDescription>
      </Alert>

      {view !== null && app.origin === 'external' && ips.length === 0 && (
        <Alert className="mb-5 bg-[var(--solar)]/10">
          <AlertTriangle className="text-[var(--solar)]" />
          <AlertDescription>{t('externalNoIp')}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('actionFailed')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {view === null ? (
        <p className="py-10 text-center text-xs text-[var(--text-muted)]">{t('loading')}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(['ip', 'origin'] as const).map((kind) => (
            <RuleSection
              key={kind}
              kind={kind}
              rules={ofKind(kind)}
              busy={pending}
              onAdd={(value) => add(kind, value)}
              onRemove={(rule) => setConfirming({ action: 'remove', rule })}
            />
          ))}
        </div>
      )}

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
        open={confirming !== null}
        tone="warning"
        title={confirmText?.title ?? ''}
        description={confirmText?.description ?? ''}
        facts={
          confirming
            ? [
                ['app', app.slug],
                [t('factKind'), confirming.rule.kind],
                [t('factValue'), confirming.rule.value],
              ]
            : undefined
        }
        confirmLabel={pending ? t('saving') : (confirmText?.label ?? '')}
        confirmDisabled={pending}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
