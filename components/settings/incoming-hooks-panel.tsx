'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  AlertTriangle,
  History,
  KeyRound,
  MoreHorizontal,
  Pencil,
  PlugZap,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Webhook,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  createIncomingHookAction,
  deleteIncomingHookAction,
  loadIncomingAction,
  loadIncomingCallsAction,
  rotateIncomingHookTokenAction,
  updateIncomingHookAction,
} from '@/app/settings/webhooks/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { IncomingHookDialog } from '@/components/settings/incoming-hook-dialog'
import { WebhookSecretDialog } from '@/components/settings/webhook-dialogs'
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
  MAX_INCOMING_HOOKS,
  type IncomingCallDto,
  type IncomingHookConfigInput,
  type IncomingHookDto,
  type IncomingHookListDto,
  type IssuedHookUrlDto,
  type TemplateSummaryDto,
  type TopicDto,
} from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; hook: IncomingHookDto }
  | { kind: 'disable'; hook: IncomingHookDto }
  | { kind: 'rotate'; hook: IncomingHookDto }
  | { kind: 'delete'; hook: IncomingHookDto }
  | null

/** Mã cảnh báo -> khoá câu dịch (nhóm `incoming`). */
const WARNING_KEY: Partial<
  Record<
    string,
    | 'warnTemplateNotPublished'
    | 'warnTemplateArchived'
    | 'warnTemplateNotFound'
    | 'warnTopicNotActive'
    | 'warnTopicNotFound'
    | 'warnRequiredUnmapped'
    | 'warnMappingNotInTemplate'
  >
> = {
  TEMPLATE_NOT_PUBLISHED: 'warnTemplateNotPublished',
  TEMPLATE_ARCHIVED: 'warnTemplateArchived',
  TEMPLATE_NOT_FOUND: 'warnTemplateNotFound',
  TOPIC_NOT_ACTIVE: 'warnTopicNotActive',
  TOPIC_NOT_FOUND: 'warnTopicNotFound',
  REQUIRED_VARIABLE_UNMAPPED: 'warnRequiredUnmapped',
  MAPPING_NOT_IN_TEMPLATE: 'warnMappingNotInTemplate',
}

/**
 * Tab "Nhận vào" của màn Webhooks — incoming webhook (ADR-0030 của backend): công cụ ngoài (Gatus, JSON
 * tự build…) gọi vào URL bí mật để phát tin vào topic. Mọi người xem; chỉ `canManage(app)` thêm, sửa,
 * tắt, đổi URL, xoá. URL hiện một lần trong `<WebhookSecretDialog variant="hookUrl">`.
 */
export function IncomingHooksPanel() {
  const t = useTranslations('incoming')
  const te = useTranslations('errors')
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const appId = app.app_id

  const [view, setView] = useState<{ list: IncomingHookListDto; topics: TopicDto[]; templates: TemplateSummaryDto[] } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [issued, setIssued] = useState<{ name: string; url: string; rotated: boolean } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [calls, setCalls] = useState<IncomingCallDto[] | null>(null)
  const [callsError, setCallsError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const failText = useCallback(
    (result: Extract<ActionResult<unknown>, { ok: false }>) =>
      te('withCode', { message: result.message, code: result.issues?.[0]?.code ?? result.code }),
    [te],
  )

  const load = useCallback(async () => {
    const result = await loadIncomingAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
      setSelectedId((current) =>
        result.data.list.hooks.some((h) => h.id === current) ? current : (result.data.list.hooks[0]?.id ?? null),
      )
    } else {
      setView(null)
      setLoadError(failText(result))
    }
  }, [appId, failText])

  const loadCalls = useCallback(
    async (hookId: string) => {
      const result = await loadIncomingCallsAction(appId, hookId)
      if (result.ok) {
        setCalls(result.data)
        setCallsError(null)
      } else {
        setCalls(null)
        setCallsError(failText(result))
      }
    },
    [appId, failText],
  )

  useEffect(() => {
    setView(null)
    setLoadError(null)
    setActionError(null)
    setSelectedId(null)
    void load()
  }, [load])

  useEffect(() => {
    setCalls(null)
    setCallsError(null)
    if (selectedId) void loadCalls(selectedId)
  }, [selectedId, loadCalls])

  const hooks = view?.list.hooks ?? []
  const atLimit = hooks.length >= MAX_INCOMING_HOOKS
  const selected = hooks.find((h) => h.id === selectedId) ?? null

  const showUrl = (data: IssuedHookUrlDto, rotated: boolean) =>
    setIssued({ name: data.hook.name, url: data.url ?? data.path, rotated })

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
    })
  }

  const create = (config: IncomingHookConfigInput) =>
    run(
      () => createIncomingHookAction(appId, config),
      (data) => {
        setDialog(null)
        setSelectedId(data.hook.id)
        showUrl(data, false)
      },
      true,
    )

  const edit = (hook: IncomingHookDto, config: IncomingHookConfigInput) =>
    run(
      () => updateIncomingHookAction(appId, hook.id, { config }),
      () => {
        setDialog(null)
        toast.success(t('savedToast'))
      },
      true,
    )

  const setStatus = (hook: IncomingHookDto, status: 'active' | 'disabled') =>
    run(
      () => updateIncomingHookAction(appId, hook.id, { status }),
      () => {
        setDialog(null)
        toast.success(status === 'active' ? t('enabledToast') : t('disabledToast'))
      },
    )

  const rotate = (hook: IncomingHookDto) =>
    run(
      () => rotateIncomingHookTokenAction(appId, hook.id),
      (data) => {
        setDialog(null)
        showUrl(data, true)
      },
    )

  const remove = (hook: IncomingHookDto) =>
    run(
      () => deleteIncomingHookAction(appId, hook.id),
      () => {
        setDialog(null)
        if (selectedId === hook.id) setSelectedId(null)
        toast.success(t('deletedToast'))
      },
    )

  if (loadError) {
    return (
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
    )
  }

  const addButton = (
    <Button
      variant="outline"
      disabled={atLimit || pending || view === null}
      onClick={() => {
        setFormError(null)
        setDialog({ kind: 'create' })
      }}
    >
      <Plus />
      {t('add')}
    </Button>
  )

  return (
    <>
      {view !== null && view.list.publicBaseUrl === null && (
        <Alert className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('noBaseUrlTitle')}</AlertTitle>
          <AlertDescription>{t('noBaseUrlBody')}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('actionFailed')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Panel className="p-5" ring>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold">{t('hooks')}</h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{t('intro')}</p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
              {t('count', { count: hooks.length, max: MAX_INCOMING_HOOKS })}
            </p>
          </div>
          {!writable ? null : atLimit ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{addButton}</TooltipTrigger>
              <TooltipContent>{t('atLimit', { max: MAX_INCOMING_HOOKS })}</TooltipContent>
            </Tooltip>
          ) : (
            addButton
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{t('colName')}</TableHead>
                <TableHead className="px-3">{t('colTopic')}</TableHead>
                <TableHead className="px-3">{t('colTemplate')}</TableHead>
                <TableHead className="px-3">{t('colUrl')}</TableHead>
                <TableHead className="px-3">{t('colStatus')}</TableHead>
                <TableHead className="px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hooks.map((h) => (
                <TableRow
                  key={h.id}
                  className={cn('cursor-pointer border-[var(--orbit)] align-top', h.id === selectedId && 'bg-[var(--orbit)]/40')}
                  onClick={() => setSelectedId(h.id)}
                >
                  <TableCell className="min-w-[180px] px-3 py-2.5 whitespace-normal">
                    <span className="font-medium">{h.name}</span>
                    {h.warnings.map((w, i) => (
                      <span key={i} className="mt-1 flex items-start gap-1 text-[11px] text-[var(--solar)]">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                        {t(WARNING_KEY[w.code] ?? 'warnOther', { variable: w.variable ?? '', code: w.code })}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 font-mono text-xs">{h.topic.key ?? '—'}</TableCell>
                  <TableCell className="px-3 py-2.5 text-xs">
                    {h.template.name ?? '—'}
                    {h.template.version !== null && <span className="ml-1 font-mono text-[var(--text-muted)]">v{h.template.version}</span>}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-secondary)]">/hooks/{h.tokenHint}</TableCell>
                  <TableCell className="px-3 py-2.5">
                    <StatusPill status={h.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {writable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={t('actionsFor', { name: h.name })}
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
                              setDialog({ kind: 'edit', hook: h })
                            }}
                          >
                            <Pencil className="size-3.5 mr-1.5" /> {t('edit')}
                          </DropdownMenuItem>
                          {h.status === 'active' ? (
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setDialog({ kind: 'disable', hook: h })}>
                              <PowerOff className="size-3.5 mr-1.5" /> {t('disable')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setStatus(h, 'active')}>
                              <Power className="size-3.5 mr-1.5" /> {t('enable')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setDialog({ kind: 'rotate', hook: h })}>
                            <KeyRound className="size-3.5 mr-1.5" /> {t('rotate')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" className="text-xs cursor-pointer" onClick={() => setDialog({ kind: 'delete', hook: h })}>
                            <Trash2 className="size-3.5 mr-1.5" /> {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {view !== null && hooks.length === 0 && (
            <EmptyState icon={Webhook} title={t('emptyTitle')} description={t('emptyBody', { app: app.name })} />
          )}
        </div>
      </Panel>

      {selected && <CallsPanel hook={selected} calls={calls} error={callsError} onRefresh={() => void loadCalls(selected.id)} />}

      {view && (dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <IncomingHookDialog
          key={dialog.kind === 'edit' ? `edit:${dialog.hook.id}` : 'create'}
          appId={appId}
          hook={dialog.kind === 'edit' ? dialog.hook : null}
          topics={view.topics}
          templates={view.templates}
          pending={pending}
          error={formError}
          onCancel={() => setDialog(null)}
          onSubmit={(config) => (dialog.kind === 'edit' ? edit(dialog.hook, config) : create(config))}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'disable'}
        title={t('disableTitle')}
        description={t('disableBody')}
        facts={dialog?.kind === 'disable' ? [[t('factHook'), dialog.hook.name]] : undefined}
        confirmLabel={pending ? t('working') : t('disable')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'disable' && setStatus(dialog.hook, 'disabled')}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === 'rotate'}
        title={t('rotateTitle')}
        description={t('rotateBody')}
        facts={dialog?.kind === 'rotate' ? [[t('factHook'), dialog.hook.name], ['url', `/hooks/${dialog.hook.tokenHint}`]] : undefined}
        confirmLabel={pending ? t('working') : t('rotate')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'rotate' && rotate(dialog.hook)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        tone="blocking"
        title={t('deleteTitle')}
        description={t('deleteBody')}
        facts={dialog?.kind === 'delete' ? [[t('factHook'), dialog.hook.name]] : undefined}
        confirmLabel={pending ? t('working') : t('delete')}
        confirmDisabled={pending}
        onConfirm={() => dialog?.kind === 'delete' && remove(dialog.hook)}
        onCancel={() => setDialog(null)}
      />

      {issued && (
        <WebhookSecretDialog variant="hookUrl" url={issued.name} secret={issued.url} rotated={issued.rotated} onClose={() => setIssued(null)} />
      )}
    </>
  )
}

/** Nhật ký 50 lần gọi gần nhất của MỘT hook — chỉ đọc. */
function CallsPanel({
  hook,
  calls,
  error,
  onRefresh,
}: {
  hook: IncomingHookDto
  calls: IncomingCallDto[] | null
  error: string | null
  onRefresh: () => void
}) {
  const t = useTranslations('incoming')
  return (
    <Panel className="mt-5 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> {t('callsTitle')}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hook.name} · {t('callsRetention')}</p>
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
      ) : calls === null ? null : calls.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{t('callsEmpty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{t('colTime')}</TableHead>
                <TableHead className="px-3">{t('colOutcome')}</TableHead>
                <TableHead className="px-3 text-right">HTTP</TableHead>
                <TableHead className="px-3 text-right">{t('colRecipients')}</TableHead>
                <TableHead className="px-3">{t('colError')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c) => (
                <TableRow key={c.id} className="h-11 border-[var(--orbit)]">
                  <TableCell className="px-3 font-mono text-xs">{fmtDateTime(c.at)}</TableCell>
                  <TableCell className="px-3">
                    <StatusPill status={c.outcome} />
                  </TableCell>
                  <TableCell className="px-3 text-right font-mono text-xs tabular-nums">{c.httpStatus}</TableCell>
                  <TableCell className="px-3 text-right font-mono text-xs tabular-nums">{c.recipientCount ?? '—'}</TableCell>
                  <TableCell className="px-3 font-mono text-xs text-[var(--text-secondary)]">{c.errorCode ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  )
}
