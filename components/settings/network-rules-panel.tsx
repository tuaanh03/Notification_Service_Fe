'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Globe, Info, Network, PlugZap, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  addNetworkRuleAction,
  loadNetworkRulesAction,
  removeNetworkRuleAction,
  type NetworkRulesView,
} from '@/app/settings/origins/actions'
import { useApp } from '@/components/app-context'
import { validateIp, validateOrigin } from '@/components/apps/wizard-types'
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

/** Chữ của từng loại — khớp luật `checkNetworkAccess` của backend (`network-access.ts`). */
const KIND: Record<
  Kind,
  { title: string; icon: typeof Network; hint: string; empty: string; placeholder: string; validate: (v: string) => string | null }
> = {
  ip: {
    title: 'Địa chỉ IP',
    icon: Network,
    hint: 'IP của máy chủ app service. Từng địa chỉ một — chưa hỗ trợ dải.',
    empty: 'Chưa khai — MỌI IP đều gọi được.',
    placeholder: '10.20.0.15',
    validate: validateIp,
  },
  origin: {
    title: 'Origin (trình duyệt)',
    icon: Globe,
    hint: 'Chỉ áp dụng khi lời gọi có header Origin, tức gọi từ trình duyệt. Server gọi server không bị luật này chặn.',
    empty: 'Chưa khai — không kiểm Origin.',
    placeholder: 'https://service.enterprise.vn',
    validate: validateOrigin,
  },
}

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
  const meta = KIND[kind]
  const Icon = meta.icon
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    const value = draft.trim()
    if (!value) return
    const err = meta.validate(value) ?? (rules.some((r) => sameValue(kind, r.value, value)) ? 'Đã có trong danh sách' : null)
    if (err) return setError(err)
    setError(null)
    setDraft('')
    onAdd(value)
  }

  return (
    <Panel className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-[var(--starlight)]" /> {meta.title}
      </h2>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{meta.hint}</p>

      <ul className="mt-4 space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.value}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--orbit)] px-3 py-1.5"
          >
            <span className="min-w-0 break-all font-mono text-xs">{rule.value}</span>
            <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={`Gỡ ${rule.value}`} onClick={() => onRemove(rule)}>
              <X />
            </Button>
          </li>
        ))}
        {rules.length === 0 && <li className="py-2 text-xs text-[var(--text-muted)]">{meta.empty}</li>}
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
          aria-label={`Thêm ${meta.title}`}
          aria-invalid={error !== null}
          className="min-w-0 font-mono"
        />
        <Button variant="outline" size="sm" disabled={busy || !draft.trim()} onClick={add}>
          <Plus /> Thêm
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
      setLoadError(`${result.message} (mã: ${result.code})`)
    }
  }, [appId])

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
        setActionError(`${result.message} (mã: ${result.code})`)
        return
      }
      setActionError(null)
      setConfirming(null)
      toast.success(action === 'add' ? `Đã thêm ${rule.value}` : `Đã gỡ ${rule.value}`)
      await load()
    })

  const add = (kind: Kind, value: string) => {
    const rule = { kind, value }
    if (ofKind(kind).length === 0) setConfirming({ action: 'add', rule })
    else run({ action: 'add', rule })
  }

  const header = <PageHeader title="IP & Origin" subtitle={`Nguồn được phép gọi /v1 bằng khoá của ${app.slug}`} />

  if (loadError) {
    return (
      <>
        {header}
        <Panel className="overflow-hidden">
          <EmptyState
            icon={PlugZap}
            title="Không đọc được danh sách nguồn gọi"
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                Thử lại
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
            title: 'Giới hạn IP được gọi?',
            description: `Hiện MỌI IP đều gọi được. Từ lúc này CHỈ ${rule.value} (và các IP thêm sau) gọi được — máy chủ app service ở IP khác bị chặn IP_NOT_ALLOWED ngay. Kiểm đúng IP máy gọi trước khi thêm.`,
            label: 'Giới hạn theo IP này',
          }
        : {
            title: 'Bắt đầu kiểm Origin?',
            description: `Từ lúc này lời gọi từ trình duyệt ở origin khác ${rule.value} bị chặn ORIGIN_NOT_ALLOWED. Server gọi server không bị ảnh hưởng.`,
            label: 'Bắt đầu kiểm Origin',
          }
    }
    return rule.kind === 'ip'
      ? last
        ? {
            title: 'Gỡ IP cuối cùng?',
            description: `Không còn IP nào trong danh sách nghĩa là MỌI IP đều gọi được — ai cầm được khoá cũng gọi được.${app.origin === 'external' ? ' App này là app bên ngoài: nên thêm IP mới TRƯỚC rồi mới gỡ IP cũ.' : ''}`,
            label: 'Gỡ và mở cho mọi IP',
          }
        : {
            title: `Gỡ ${rule.value}?`,
            description: 'Máy chủ app service đang gọi từ IP này bị chặn IP_NOT_ALLOWED ngay lập tức.',
            label: 'Gỡ IP',
          }
      : {
          title: `Gỡ ${rule.value}?`,
          description: last
            ? 'Không còn origin nào nghĩa là không kiểm Origin nữa — trình duyệt ở đâu cũng gọi được.'
            : 'Lời gọi từ trình duyệt ở origin này bị chặn ORIGIN_NOT_ALLOWED ngay lập tức.',
          label: 'Gỡ origin',
        }
  })()

  return (
    <>
      {header}

      <Alert className="mb-5">
        <Info />
        <AlertDescription>
          Mỗi loại tính riêng: chưa khai dòng nào thì loại đó không giới hạn, khai rồi thì chỉ các giá trị trong danh
          sách qua được. So khớp chính xác từng giá trị. Thay đổi có hiệu lực ngay với lời gọi kế tiếp.
        </AlertDescription>
      </Alert>

      {view !== null && app.origin === 'external' && ips.length === 0 && (
        <Alert className="mb-5 bg-[var(--solar)]/10">
          <AlertTriangle className="text-[var(--solar)]" />
          <AlertDescription>
            App bên ngoài chưa khai IP nào — ai cầm được khoá cũng gọi được. Thêm IP máy chủ của app service.
          </AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>Thao tác không thành công</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {view === null ? (
        <p className="py-10 text-center text-xs text-[var(--text-muted)]">Đang tải…</p>
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
        <h2 className="mb-4 text-sm font-semibold">Audit IP & Origin</h2>
        {view && view.audit.length > 0 ? (
          <AuditTrail entries={view.audit} />
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            Chưa có sự kiện nào. Audit được ghi bất đồng bộ nên thao tác vừa xong có thể chưa hiện ngay.
          </p>
        )}
      </Panel>

      <ConfirmDialog
        open={confirming !== null}
        tone="warning"
        title={confirmText?.title ?? ''}
        description={confirmText?.description ?? ''}
        facts={confirming ? [['app', app.slug], ['loại', confirming.rule.kind], ['giá trị', confirming.rule.value]] : undefined}
        confirmLabel={pending ? 'Đang lưu…' : (confirmText?.label ?? '')}
        confirmDisabled={pending}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
