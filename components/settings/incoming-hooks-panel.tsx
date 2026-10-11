'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Copy, KeyRound, PlugZap, Plus, Power, PowerOff, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  createIncomingHookAction,
  deleteIncomingHookAction,
  loadIncomingAction,
  loadIncomingCallsAction,
  revealIncomingHookUrlAction,
  rotateIncomingHookTokenAction,
  updateIncomingHookAction,
} from '@/app/settings/webhooks/actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { IncomingHookGuide } from '@/components/settings/incoming-hook-guide'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import type { ActionResult } from '@/lib/api/result'
import {
  MAX_INCOMING_HOOKS,
  type IncomingCallDto,
  type IncomingHookConfigInput,
  type IncomingHookDto,
  type IncomingHookListDto,
  type TemplateSummaryDto,
  type TopicDto,
} from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

type View = { list: IncomingHookListDto; topics: TopicDto[]; templates: TemplateSummaryDto[] }
type Confirm = { kind: 'rotate' | 'delete'; hook: IncomingHookDto } | null

/** Cảnh báo về topic / template -> câu ngắn. Cảnh báo về ánh xạ biến KHÔNG hiện (console không có ánh xạ). */
const WARNING_KEY: Partial<
  Record<string, 'warnTemplateNotPublished' | 'warnTemplateArchived' | 'warnTemplateNotFound' | 'warnTopicNotActive' | 'warnTopicNotFound'>
> = {
  TEMPLATE_NOT_PUBLISHED: 'warnTemplateNotPublished',
  TEMPLATE_ARCHIVED: 'warnTemplateArchived',
  TEMPLATE_NOT_FOUND: 'warnTemplateNotFound',
  TOPIC_NOT_ACTIVE: 'warnTopicNotActive',
  TOPIC_NOT_FOUND: 'warnTopicNotFound',
}

/** Mã lỗi một lần gọi -> câu (nhật ký). Mã lạ: câu chung kèm mã. */
const CALL_ERROR_KEY: Partial<
  Record<
    string,
    'errMissing' | 'errInvalidValue' | 'errBody' | 'errRateLimited' | 'errTooLarge' | 'errTopic' | 'errTemplate' | 'errNetwork' | 'errAppInactive'
  >
> = {
  MISSING_VARIABLE: 'errMissing',
  INVALID_PAYLOAD_VALUE: 'errInvalidValue',
  INCOMING_BODY_INVALID: 'errBody',
  INCOMING_HOOK_RATE_LIMITED: 'errRateLimited',
  PUBLICATION_TOO_LARGE: 'errTooLarge',
  TOPIC_NOT_ACTIVE: 'errTopic',
  TOPIC_NOT_FOUND: 'errTopic',
  TEMPLATE_NOT_PUBLISHED: 'errTemplate',
  TEMPLATE_ARCHIVED: 'errTemplate',
  TEMPLATE_NOT_FOUND: 'errTemplate',
  IP_NOT_ALLOWED: 'errNetwork',
  ORIGIN_NOT_ALLOWED: 'errNetwork',
  APP_NOT_ACTIVE: 'errAppInactive',
}

/** Cấu hình gửi lên khi đổi topic / template — tên tự theo template; phần kỹ thuật (đội EWS đặt qua API) giữ nguyên, trừ ánh xạ khi đổi template. */
function configOf(hook: IncomingHookDto | null, topicId: string, templateId: string, templates: TemplateSummaryDto[]): IncomingHookConfigInput {
  const name = templates.find((x) => x.id === templateId)?.name ?? hook?.name ?? 'Incoming webhook'
  return {
    name: name.slice(0, 100),
    topicId,
    templateId,
    mappings: hook && hook.template.id === templateId ? hook.mappings : [],
    dedupePath: hook?.dedupePath ?? null,
    condition: hook?.condition ?? null,
  }
}

/**
 * Tab "Nhận vào" — incoming webhook (ADR-0030 của backend). Người dùng chỉ chọn GỬI CHO AI (topic) và NỘI
 * DUNG GÌ (template); mọi thứ khác EWS tự lo. Không hộp thoại: thêm và sửa ngay trong danh sách; URL sao chép
 * bất cứ lúc nào (backend tính lại token + ghi audit mỗi lần lấy). Ít chữ — trách nhiệm theo dõi bằng audit.
 */
export function IncomingHooksPanel() {
  const t = useTranslations('incoming')
  const te = useTranslations('errors')
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const appId = app.app_id

  const [view, setView] = useState<View | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [pending, startTransition] = useTransition()

  const failText = useCallback(
    (r: Extract<ActionResult<unknown>, { ok: false }>) => te('withCode', { message: r.message, code: r.issues?.[0]?.code ?? r.code }),
    [te],
  )

  const load = useCallback(async () => {
    const result = await loadIncomingAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
    } else {
      setView(null)
      setLoadError(failText(result))
    }
  }, [appId, failText])

  useEffect(() => {
    setView(null)
    setOpenId(null)
    setAdding(false)
    setError(null)
    void load()
  }, [load])

  const run = <T,>(op: () => Promise<ActionResult<T>>, onOk: (data: T) => void) =>
    startTransition(async () => {
      const result = await op()
      if (!result.ok) return setError(failText(result))
      setError(null)
      onOk(result.data)
      await load()
    })

  const copyUrl = (hook: IncomingHookDto) =>
    startTransition(async () => {
      const result = await revealIncomingHookUrlAction(appId, hook.id)
      if (!result.ok) return setError(result.code === 'INCOMING_URL_NEEDS_ROTATION' ? t('needsRotation') : failText(result))
      setError(null)
      await navigator.clipboard?.writeText(result.data)
      toast.success(t('urlCopied'))
    })

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
  if (view === null) return null

  const hooks = view.list.hooks
  const activeTopics = view.topics.filter((x) => x.status === 'active')
  const publishedTemplates = view.templates.filter((x) => x.status !== 'archived' && x.publishedVersion !== null)
  const cannotAdd = !view.list.configured
    ? t('notConfigured')
    : activeTopics.length === 0 || publishedTemplates.length === 0
      ? t('needTopicAndTemplate')
      : hooks.length >= MAX_INCOMING_HOOKS
        ? t('atLimit', { max: MAX_INCOMING_HOOKS })
        : null
  const topicName = (id: string, key: string | null) => {
    const topic = view.topics.find((x) => x.id === id)
    return topic ? topic.name : (key ?? '—')
  }
  const groups = [...new Set(hooks.map((h) => h.topic.id))].map((topicId) => ({
    topicId,
    hooks: hooks.filter((h) => h.topic.id === topicId),
  }))

  return (
    <div className="space-y-5">
      {writable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={cannotAdd !== null || adding || pending}
            onClick={() => {
              setAdding(true)
              setOpenId(null)
            }}
          >
            <Plus /> {t('add')}
          </Button>
          {cannotAdd && <span className="text-xs text-[var(--text-muted)]">{cannotAdd}</span>}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {adding && (
        <Panel className="p-4" ring>
          <HookForm
            topics={activeTopics}
            templates={publishedTemplates}
            initialTopicId={activeTopics[0]?.id ?? ''}
            initialTemplateId={publishedTemplates[0]?.id ?? ''}
            submitLabel={t('create')}
            pending={pending}
            onCancel={() => setAdding(false)}
            onSubmit={(topicId, templateId) =>
              run(
                () => createIncomingHookAction(appId, configOf(null, topicId, templateId, view.templates)),
                (data) => {
                  setAdding(false)
                  setOpenId(data.hook.id)
                },
              )
            }
          />
        </Panel>
      )}

      {hooks.length === 0 && !adding && (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={t('emptyTitle')} description={t('emptyBody')} />
        </Panel>
      )}

      {groups.map((group) => (
        <section key={group.topicId} className="space-y-2">
          <h3 className="text-sm font-semibold">{t('sendsTo', { topic: topicName(group.topicId, group.hooks[0]?.topic.key ?? null) })}</h3>
          {group.hooks.map((hook) => (
            <Panel key={hook.id} className="overflow-hidden">
              <Collapsible open={openId === hook.id} onOpenChange={(open) => setOpenId(open ? hook.id : null)}>
                <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--orbit)]/30">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hook.template.name ?? hook.name}</span>
                    {hook.warnings
                      .filter((w) => WARNING_KEY[w.code])
                      .map((w) => (
                        <span key={w.code} className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--solar)]">
                          <AlertTriangle className="size-3" /> {t(WARNING_KEY[w.code]!)}
                        </span>
                      ))}
                  </span>
                  <StatusPill status={hook.status} />
                  {openId === hook.id ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4 border-t border-[var(--orbit)] px-4 py-4">
                    {writable && (
                      <HookForm
                        key={`${hook.id}:${hook.updatedAt}`}
                        topics={view.topics}
                        templates={view.templates.filter((x) => x.status !== 'archived')}
                        initialTopicId={hook.topic.id}
                        initialTemplateId={hook.template.id}
                        submitLabel={t('save')}
                        pending={pending}
                        onSubmit={(topicId, templateId) =>
                          run(
                            () => updateIncomingHookAction(appId, hook.id, { config: configOf(hook, topicId, templateId, view.templates) }),
                            () => toast.success(t('saved')),
                          )
                        }
                      />
                    )}
                    {writable && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={pending || !view.list.configured} onClick={() => copyUrl(hook)}>
                          <Copy /> {t('copyUrl')}
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending || !view.list.configured} onClick={() => setConfirm({ kind: 'rotate', hook })}>
                          <KeyRound /> {t('rotate')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => updateIncomingHookAction(appId, hook.id, { status: hook.status === 'active' ? 'disabled' : 'active' }),
                              () => undefined,
                            )
                          }
                        >
                          {hook.status === 'active' ? <PowerOff /> : <Power />}
                          {hook.status === 'active' ? t('disable') : t('enable')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-[var(--supernova)]" disabled={pending} onClick={() => setConfirm({ kind: 'delete', hook })}>
                          <Trash2 /> {t('delete')}
                        </Button>
                      </div>
                    )}
                    <Section title={t('bodySample')}>
                      <IncomingHookGuide appId={appId} topicId={hook.topic.id} templateId={hook.template.id} />
                    </Section>
                    <Section title={t('callsTitle')}>
                      <CallLog appId={appId} hookId={hook.id} />
                    </Section>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Panel>
          ))}
        </section>
      ))}

      <ConfirmDialog
        open={confirm !== null}
        tone={confirm?.kind === 'delete' ? 'blocking' : 'warning'}
        title={confirm?.kind === 'delete' ? t('deleteTitle') : t('rotateTitle')}
        description={confirm?.kind === 'delete' ? t('deleteBody') : t('rotateBody')}
        confirmLabel={pending ? t('working') : confirm?.kind === 'delete' ? t('delete') : t('rotate')}
        confirmDisabled={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          const { kind, hook } = confirm
          run(
            () => (kind === 'delete' ? deleteIncomingHookAction(appId, hook.id) : rotateIncomingHookTokenAction(appId, hook.id)),
            () => {
              setConfirm(null)
              toast.success(kind === 'delete' ? t('deleted') : t('rotated'))
            },
          )
        }}
      />
    </div>
  )
}

/** Hai ô chọn + nút — dùng cho dòng "Thêm" và phần sửa trong hook. */
function HookForm({
  topics,
  templates,
  initialTopicId,
  initialTemplateId,
  submitLabel,
  pending,
  onCancel,
  onSubmit,
}: {
  topics: TopicDto[]
  templates: TemplateSummaryDto[]
  initialTopicId: string
  initialTemplateId: string
  submitLabel: string
  pending: boolean
  onCancel?: () => void
  onSubmit: (topicId: string, templateId: string) => void
}) {
  const t = useTranslations('incoming')
  const [topicId, setTopicId] = useState(initialTopicId)
  const [templateId, setTemplateId] = useState(initialTemplateId)
  const changed = topicId !== initialTopicId || templateId !== initialTemplateId
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
        <span className="text-[var(--text-muted)]">{t('topicLabel')}</span>
        <NativeSelect value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full">
          {topics.map((x) => (
            <NativeSelectOption key={x.id} value={x.id}>
              {x.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
        <span className="text-[var(--text-muted)]">{t('templateLabel')}</span>
        <NativeSelect value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full">
          {templates.map((x) => (
            <NativeSelectOption key={x.id} value={x.id}>
              {x.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || !topicId || !templateId || (onCancel === undefined && !changed)} onClick={() => onSubmit(topicId, templateId)}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/sec flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-foreground">
        <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]/sec:rotate-90" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Nhật ký 50 lần gọi gần nhất — nạp khi mở mục, viết bằng lời. */
function CallLog({ appId, hookId }: { appId: string; hookId: string }) {
  const t = useTranslations('incoming')
  const [calls, setCalls] = useState<IncomingCallDto[] | null>(null)
  useEffect(() => {
    let alive = true
    void loadIncomingCallsAction(appId, hookId).then((r) => alive && setCalls(r.ok ? r.data : []))
    return () => {
      alive = false
    }
  }, [appId, hookId])
  if (calls === null) return null
  if (calls.length === 0) return <p className="text-xs text-[var(--text-muted)]">{t('callsEmpty')}</p>
  const describe = (c: IncomingCallDto) => {
    if (c.outcome === 'published') return t('callPublished', { count: c.recipientCount ?? 0 })
    if (c.outcome === 'duplicate') return t('callDuplicate')
    if (c.outcome === 'skipped') return t('callSkipped')
    const key = c.errorCode ? CALL_ERROR_KEY[c.errorCode] : undefined
    return key ? t(key) : t('errOther', { code: c.errorCode ?? String(c.httpStatus) })
  }
  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-2">{t('colTime')}</TableHead>
            <TableHead className="px-2">{t('colOutcome')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((c) => (
            <TableRow key={c.id} className="border-[var(--orbit)]">
              <TableCell className="px-2 font-mono whitespace-nowrap">{fmtDateTime(c.at)}</TableCell>
              <TableCell className={cn('px-2 whitespace-normal', c.outcome === 'rejected' && 'text-[var(--supernova)]')}>{describe(c)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
