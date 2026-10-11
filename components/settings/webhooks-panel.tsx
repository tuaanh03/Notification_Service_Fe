'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  History,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  PlugZap,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  createWebhookAction,
  deleteWebhookAction,
  loadWebhookDeliveriesAction,
  loadWebhooksAction,
  rotateWebhookSecretAction,
  testWebhookAction,
  updateWebhookAction,
} from '@/app/settings/webhooks/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { WebhookFormDialog, WebhookSecretDialog } from '@/components/settings/webhook-dialogs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import type { ActionResult } from '@/lib/api/result'
import {
  MAX_WEBHOOK_ENDPOINTS,
  type WebhookDeliveryDto,
  type WebhookEndpointDto,
  type WebhookEventType,
  type WebhookListDto,
} from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/** Hộp nào đang mở. `endpoint` = URL đang thao tác. */
type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; endpoint: WebhookEndpointDto }
  | { kind: 'disable'; endpoint: WebhookEndpointDto }
  | { kind: 'rotate'; endpoint: WebhookEndpointDto }
  | { kind: 'delete'; endpoint: WebhookEndpointDto }
  | null

/**
 * Outgoing webhook của app đang xem (ADR-0029 của backend): EWS tự gọi sang URL của app khi một thư
 * có kết quả. Mọi người xem được danh sách + nhật ký gọi; chỉ người quản lý app (`canManage`) thêm,
 * sửa, tắt, đổi secret, xoá, gửi thử — backend vẫn chặn (403) nếu nút có lọt ra.
 *
 * Secret chỉ hiện một lần trong `<WebhookSecretDialog>` rồi mất — giống khoá API (UC-001 BR-4).
 */
export function WebhooksPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('webhooks')
  const te = useTranslations('errors')
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const appId = app.app_id

  const [view, setView] = useState<WebhookListDto | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [issued, setIssued] = useState<{ url: string; secret: string; rotated: boolean } | null>(null)
  /** Kết quả lần "Gửi thử" gần nhất — hiện ngay dưới tiêu đề, không phải toast (exception path là UI thật). */
  const [testResult, setTestResult] = useState<{ url: string; delivery: WebhookDeliveryDto } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDto[] | null>(null)
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Lỗi 422 `VALIDATION`: mã cụ thể (WEBHOOK_URL_INVALID…) nằm trong `issues` — hiện mã đó, không hiện VALIDATION.
  const failText = useCallback(
    (result: Extract<ActionResult<unknown>, { ok: false }>) =>
      te('withCode', { message: result.message, code: result.issues?.[0]?.code ?? result.code }),
    [te],
  )

  const load = useCallback(async () => {
    const result = await loadWebhooksAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
      // Giữ URL đang xem nhật ký nếu còn; không thì mở URL đầu tiên.
      setSelectedId((current) =>
        result.data.endpoints.some((e) => e.id === current) ? current : (result.data.endpoints[0]?.id ?? null),
      )
    } else {
      setView(null)
      setLoadError(failText(result))
    }
  }, [appId, failText])

  const loadDeliveries = useCallback(
    async (endpointId: string) => {
      const result = await loadWebhookDeliveriesAction(appId, endpointId)
      if (result.ok) {
        setDeliveries(result.data)
        setDeliveriesError(null)
      } else {
        setDeliveries(null)
        setDeliveriesError(failText(result))
      }
    },
    [appId, failText],
  )

  // Đổi app: dọn sạch mọi thứ của app cũ rồi nạp lại.
  useEffect(() => {
    setView(null)
    setLoadError(null)
    setActionError(null)
    setTestResult(null)
    setSelectedId(null)
    void load()
  }, [load])

  useEffect(() => {
    setDeliveries(null)
    setDeliveriesError(null)
    if (selectedId) void loadDeliveries(selectedId)
  }, [selectedId, loadDeliveries])

  const endpoints = view?.endpoints ?? []
  const configured = view?.configured ?? true
  const atLimit = endpoints.length >= MAX_WEBHOOK_ENDPOINTS
  const selected = endpoints.find((e) => e.id === selectedId) ?? null

  /** Chạy một lệnh ghi; thành công thì nạp lại danh sách (và nhật ký của URL đang xem). */
  const run = <T,>(op: () => Promise<ActionResult<T>>, onOk: (data: T) => void, inForm = false) => {
    startTransition(async () => {
      const result = await op()
      if (!result.ok) {
        if (inForm) setFormError(failText(result))
        else setActionError(failText(result))
        return
      }
      setActionError(null)
      setFormError(null)
      onOk(result.data)
      await load()
      if (selectedId) await loadDeliveries(selectedId)
    })
  }

  const create = (input: { url: string; events: WebhookEventType[] }) =>
    run(
      () => createWebhookAction(appId, input),
      (data) => {
        setDialog(null)
        setSelectedId(data.endpoint.id)
        setIssued({ url: data.endpoint.url, secret: data.secret, rotated: false })
      },
      true,
    )

  const edit = (endpoint: WebhookEndpointDto, events: WebhookEventType[]) =>
    run(
      () => updateWebhookAction(appId, endpoint.id, { events }),
      () => {
        setDialog(null)
        toast.success(t('saved'))
      },
      true,
    )

  const setStatus = (endpoint: WebhookEndpointDto, status: 'active' | 'disabled') =>
    run(
      () => updateWebhookAction(appId, endpoint.id, { status }),
      () => {
        setDialog(null)
        toast.success(status === 'active' ? t('enabledToast') : t('disabledToast'))
      },
    )

  const rotate = (endpoint: WebhookEndpointDto) =>
    run(
      () => rotateWebhookSecretAction(appId, endpoint.id),
      (data) => {
        setDialog(null)
        setIssued({ url: data.endpoint.url, secret: data.secret, rotated: true })
      },
    )

  const remove = (endpoint: WebhookEndpointDto) =>
    run(
      () => deleteWebhookAction(appId, endpoint.id),
      () => {
        setDialog(null)
        if (selectedId === endpoint.id) setSelectedId(null)
        if (testResult?.url === endpoint.url) setTestResult(null)
        toast.success(t('deletedToast'))
      },
    )

  const test = (endpoint: WebhookEndpointDto) =>
    run(
      () => testWebhookAction(appId, endpoint.id),
      (delivery) => {
        setTestResult({ url: endpoint.url, delivery })
        setSelectedId(endpoint.id)
      },
    )

  // `embedded`: nằm trong tab "Gửi đi" của `<WebhooksPage>` — tiêu đề trang do trang lo.
  const header = embedded ? null : <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.slug })} />

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

  const addButton = (
    <Button variant="outline" disabled={atLimit || pending || !configured} onClick={() => setDialog({ kind: 'create' })}>
      <Plus />
      {t('add')}
    </Button>
  )

  return (
    <>
      {header}

      {!configured && (
        <Alert className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('notConfiguredTitle')}</AlertTitle>
          <AlertDescription>{t('notConfiguredBody')}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('actionFailed')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {testResult && <TestResultAlert url={testResult.url} delivery={testResult.delivery} onDismiss={() => setTestResult(null)} />}

      <Panel className="p-5" ring>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold">{t('endpoints')}</h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{t('intro')}</p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
              {t('count', { count: endpoints.length, max: MAX_WEBHOOK_ENDPOINTS })}
            </p>
          </div>
          {!writable ? null : atLimit ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{addButton}</TooltipTrigger>
              <TooltipContent>{t('atLimit', { max: MAX_WEBHOOK_ENDPOINTS })}</TooltipContent>
            </Tooltip>
          ) : (
            addButton
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{t('colUrl')}</TableHead>
                <TableHead className="px-3">{t('colEvents')}</TableHead>
                <TableHead className="px-3">{t('colStatus')}</TableHead>
                <TableHead className="px-3">{t('colCreated')}</TableHead>
                <TableHead className="px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((e) => (
                <TableRow
                  key={e.id}
                  className={cn('h-11 cursor-pointer border-[var(--orbit)]', e.id === selectedId && 'bg-[var(--orbit)]/40')}
                  onClick={() => setSelectedId(e.id)}
                >
                  <TableCell className="min-w-[220px] max-w-[320px] px-3 font-mono text-xs break-all whitespace-normal text-[var(--starlight)]">
                    {e.url}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-[11px] whitespace-normal text-[var(--text-secondary)]">
                    {e.events.map((ev) => (
                      <span key={ev} className="block">
                        {ev}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusPill status={e.status} />
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs">{fmtDateTime(e.createdAt)}</TableCell>
                  <TableCell className="px-3 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                    {writable && (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={pending || !configured}
                          onClick={() => test(e)}
                          aria-label={t('testAria', { url: e.url })}
                        >
                          <Send /> {t('test')}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t('actionsFor', { url: e.url })}
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 bg-popover border border-border shadow-md">
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={() => {
                                setFormError(null)
                                setDialog({ kind: 'edit', endpoint: e })
                              }}
                            >
                              <Pencil className="size-3.5 mr-1.5" /> {t('editEvents')}
                            </DropdownMenuItem>
                            {e.status === 'active' ? (
                              <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setDialog({ kind: 'disable', endpoint: e })}>
                                <PowerOff className="size-3.5 mr-1.5" /> {t('disable')}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setStatus(e, 'active')}>
                                <Power className="size-3.5 mr-1.5" /> {t('enable')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              disabled={!configured}
                              onClick={() => setDialog({ kind: 'rotate', endpoint: e })}
                            >
                              <KeyRound className="size-3.5 mr-1.5" /> {t('rotate')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="text-xs cursor-pointer"
                              onClick={() => setDialog({ kind: 'delete', endpoint: e })}
                            >
                              <Trash2 className="size-3.5 mr-1.5" /> {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {view !== null && endpoints.length === 0 && (
            <EmptyState icon={Webhook} title={t('emptyTitle')} description={t('emptyBody', { app: app.name })} />
          )}
        </div>
      </Panel>

      {selected && (
        <DeliveriesPanel
          endpoint={selected}
          deliveries={deliveries}
          error={deliveriesError}
          onRefresh={() => void loadDeliveries(selected.id)}
        />
      )}

      <Panel className="mt-5 p-5">
        <h2 className="mb-3 text-sm font-semibold">{t('howTitle')}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-[var(--text-secondary)]">
          <li>{t('howCall')}</li>
          <li>{t.rich('howSignature', { mono: (c) => <span className="font-mono">{c}</span> })}</li>
          <li>{t('howRetry')}</li>
          <li>{t.rich('howDuplicate', { mono: (c) => <span className="font-mono">{c}</span> })}</li>
          <li>{t('howPrivacy')}</li>
        </ul>
      </Panel>

      {dialog?.kind === 'create' && (
        <WebhookFormDialog
          key="create"
          open
          mode="create"
          pending={pending}
          error={formError}
          onCancel={() => setDialog(null)}
          onSubmit={create}
        />
      )}
      {dialog?.kind === 'edit' && (
        <WebhookFormDialog
          key={`edit:${dialog.endpoint.id}`}
          open
          mode="edit"
          initialUrl={dialog.endpoint.url}
          initialEvents={dialog.endpoint.events}
          pending={pending}
          error={formError}
          onCancel={() => setDialog(null)}
          onSubmit={({ events }) => edit(dialog.endpoint, events)}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'disable'}
        title={t('disableTitle')}
        description={t('disableBody')}
        facts={dialog?.kind === 'disable' ? [['url', dialog.endpoint.url]] : undefined}
        confirmLabel={pending ? t('working') : t('disable')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'disable' && setStatus(dialog.endpoint, 'disabled')}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog?.kind === 'rotate'}
        title={t('rotateTitle')}
        description={t('rotateBody')}
        facts={dialog?.kind === 'rotate' ? [['url', dialog.endpoint.url]] : undefined}
        confirmLabel={pending ? t('working') : t('rotate')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'rotate' && rotate(dialog.endpoint)}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        tone="blocking"
        title={t('deleteTitle')}
        description={t('deleteBody')}
        facts={dialog?.kind === 'delete' ? [['url', dialog.endpoint.url]] : undefined}
        confirmLabel={pending ? t('working') : t('delete')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'delete' && remove(dialog.endpoint)}
        onCancel={() => setDialog(null)}
      />

      {issued && (
        <WebhookSecretDialog url={issued.url} secret={issued.secret} rotated={issued.rotated} onClose={() => setIssued(null)} />
      )}
    </>
  )
}

/** Kết quả "Gửi thử": thành công / lỗi kèm mã — người bấm biết ngay URL có nhận được không. */
function TestResultAlert({ url, delivery, onDismiss }: { url: string; delivery: WebhookDeliveryDto; onDismiss: () => void }) {
  const t = useTranslations('webhooks')
  const ok = delivery.status === 'delivered'
  return (
    <Alert variant={ok ? 'default' : 'destructive'} className="mb-5">
      {ok ? <CheckCircle2 /> : <AlertTriangle />}
      <AlertTitle>{ok ? t('testOk') : t('testFailed')}</AlertTitle>
      <AlertDescription>
        <span className="block break-all font-mono text-xs">{url}</span>
        <span className="font-mono text-xs tabular-nums">
          {delivery.lastStatusCode !== null ? `HTTP ${delivery.lastStatusCode}` : ''}
          {delivery.lastStatusCode !== null && delivery.lastError ? ' · ' : ''}
          {delivery.lastError ?? ''}
        </span>
        {!ok && <span className="block text-xs">{t(errorHint(delivery.lastError))}</span>}
        <Button variant="ghost" size="xs" className="mt-1 px-0" onClick={onDismiss}>
          {t('dismiss')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** Câu gợi ý cho mã lỗi ngắn của backend. Mã giữ nguyên dạng mono bên cạnh — đây chỉ là lời giải thích. */
function errorHint(error: string | null): 'hintBlocked' | 'hintTimeout' | 'hintConnection' | 'hintHttp' | 'hintDisabled' | 'hintOther' {
  if (error === null) return 'hintOther'
  if (error === 'blocked_private_address') return 'hintBlocked'
  if (error === 'timeout') return 'hintTimeout'
  if (error.startsWith('connection_failed')) return 'hintConnection'
  if (error.startsWith('http_')) return 'hintHttp'
  if (error === 'endpoint_disabled') return 'hintDisabled'
  return 'hintOther'
}

/** Nhật ký 50 lần gọi gần nhất của MỘT URL — chỉ đọc. */
function DeliveriesPanel({
  endpoint,
  deliveries,
  error,
  onRefresh,
}: {
  endpoint: WebhookEndpointDto
  deliveries: WebhookDeliveryDto[] | null
  error: string | null
  onRefresh: () => void
}) {
  const t = useTranslations('webhooks')
  return (
    <Panel className="mt-5 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> {t('deliveriesTitle')}
          </h2>
          <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-muted)]">{endpoint.url}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw /> {t('refresh')}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : deliveries === null ? null : deliveries.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{t('deliveriesEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{t('colTime')}</TableHead>
                <TableHead className="px-3">{t('colEvent')}</TableHead>
                <TableHead className="px-3">{t('colStatus')}</TableHead>
                <TableHead className="px-3 text-right">{t('colAttempts')}</TableHead>
                <TableHead className="px-3">{t('colResult')}</TableHead>
                <TableHead className="px-3">{t('colNext')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id} className="h-11 border-[var(--orbit)]">
                  <TableCell className="px-3 font-mono text-xs">{fmtDateTime(d.createdAt)}</TableCell>
                  <TableCell className="px-3 font-mono text-xs">{d.eventType}</TableCell>
                  <TableCell className="px-3">
                    <StatusPill status={d.status} />
                  </TableCell>
                  <TableCell className="px-3 text-right font-mono text-xs tabular-nums">{d.attempts}</TableCell>
                  <TableCell className="px-3 font-mono text-xs text-[var(--text-secondary)]">
                    {[d.lastStatusCode !== null ? `HTTP ${d.lastStatusCode}` : null, d.lastError].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs">
                    {d.status === 'pending' && d.nextAttemptAt ? fmtDateTime(d.nextAttemptAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  )
}
