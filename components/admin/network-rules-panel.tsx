'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Info, Network, PlugZap, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  addNetworkRuleAction,
  loadNetworkRulesAction,
  removeNetworkRuleAction,
  type NetworkRulesView,
} from '@/app/admin/apps/[appId]/network/actions'
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

type Pending = { action: 'add' | 'remove'; rule: NetworkRuleDto }

/**
 * Quản trị EWS → Tất cả app → Giới hạn IP (bổ sung ADR-0023 của backend): chỉ Super Admin xem / thêm / gỡ.
 *
 * Đọc / thêm / gỡ qua `/admin/apps/:appId/network-rules` — mỗi thay đổi có hiệu lực NGAY với lời gọi kế
 * tiếp của app (`/v1` và `/hooks`), nên hai bước làm đổi hẳn hành vi phải xác nhận:
 * - thêm IP ĐẦU TIÊN: từ "không giới hạn" thành "chỉ danh sách này";
 * - gỡ bất kỳ IP nào: máy đang gọi từ IP đó bị chặn ngay; gỡ IP CUỐI thì mở cho mọi IP.
 * Thêm IP thứ hai trở đi chỉ nới ra, không chặn ai — không hỏi lại.
 */
export function NetworkRulesPanel({ app }: { app: { id: string; slug: string; external: boolean } }) {
  const t = useTranslations('network')
  const tv = useTranslations('validation')
  const te = useTranslations('errors')
  const tn = useTranslations('nav')
  const { validateIp } = useNetworkValidators()
  const [view, setView] = useState<NetworkRulesView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Pending | null>(null)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadNetworkRulesAction(app.id)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
    } else {
      setView(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [app.id, te])

  useEffect(() => {
    void load()
  }, [load])

  const ips = view?.rules ?? []

  const run = ({ action, rule }: Pending) =>
    startTransition(async () => {
      const result = action === 'add' ? await addNetworkRuleAction(app.id, rule) : await removeNetworkRuleAction(app.id, rule)
      if (!result.ok) {
        setActionError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setActionError(null)
      setConfirming(null)
      toast.success(action === 'add' ? t('added', { value: rule.value }) : t('removed', { value: rule.value }))
      await load()
    })

  const add = () => {
    const value = draft.trim()
    if (!value) return
    const err = validateIp(value) ?? (ips.some((r) => r.value.toLowerCase() === value.toLowerCase()) ? tv('duplicate') : null)
    if (err) return setDraftError(err)
    setDraftError(null)
    setDraft('')
    const rule = { kind: 'ip', value }
    if (ips.length === 0) setConfirming({ action: 'add', rule })
    else run({ action: 'add', rule })
  }

  const header = (
    <PageHeader
      title={t('title')}
      subtitle={t('subtitle', { app: app.slug })}
      breadcrumb={[{ label: tn('allApps'), href: '/admin/apps' }, { label: app.slug }]}
    />
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

  const confirmText = (() => {
    if (!confirming) return null
    if (confirming.action === 'add') {
      return { title: t('limitIpTitle'), description: t('limitIpBody', { value: confirming.rule.value }), label: t('limitIpLabel') }
    }
    return ips.length === 1
      ? {
          title: t('lastIpTitle'),
          description: t('lastIpBody') + (app.external ? t('lastIpExternal') : ''),
          label: t('lastIpLabel'),
        }
      : { title: t('removeTitle', { value: confirming.rule.value }), description: t('removeIpBody'), label: t('removeIpLabel') }
  })()

  return (
    <>
      {header}

      <Alert className="mb-5">
        <Info />
        <AlertDescription>{t('rules')}</AlertDescription>
      </Alert>

      {view !== null && app.external && ips.length === 0 && (
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
        <Panel className="max-w-xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Network className="size-4 text-[var(--starlight)]" /> {t('ipTitle')}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{t('ipHint')}</p>

          <ul className="mt-4 space-y-1.5">
            {ips.map((rule) => (
              <li
                key={rule.value}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--orbit)] px-3 py-1.5"
              >
                <span className="min-w-0 break-all font-mono text-xs">{rule.value}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={t('remove', { value: rule.value })}
                  onClick={() => setConfirming({ action: 'remove', rule })}
                >
                  <X />
                </Button>
              </li>
            ))}
            {ips.length === 0 && <li className="py-2 text-xs text-[var(--text-muted)]">{t('ipEmpty')}</li>}
          </ul>

          <div className="mt-4 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setDraftError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="10.20.0.15"
              aria-label={t('addAria', { title: t('ipTitle') })}
              aria-invalid={draftError !== null}
              className="min-w-0 font-mono"
            />
            <Button variant="outline" size="sm" disabled={pending || !draft.trim()} onClick={add}>
              <Plus /> {t('add')}
            </Button>
          </div>
          {draftError && <p className="mt-1.5 text-xs text-[var(--supernova)]">{draftError}</p>}
        </Panel>
      )}

      <Panel className="mt-5 p-5">
        <h2 className="mb-4 text-sm font-semibold">{t('auditTitle')}</h2>
        {view && view.audit.length > 0 ? (
          <AuditTrail entries={view.audit} />
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{t('auditEmpty')}</p>
        )}
      </Panel>

      <ConfirmDialog
        open={confirming !== null}
        tone="warning"
        title={confirmText?.title ?? ''}
        description={confirmText?.description ?? ''}
        facts={confirming ? [['app', app.slug], ['IP', confirming.rule.value]] : undefined}
        confirmLabel={pending ? t('saving') : (confirmText?.label ?? '')}
        confirmDisabled={pending}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
