'use client'

import { useCallback, useEffect, useId, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Clock, FileText, Hash, PenLine, PlugZap, Send, ShieldOff, UserRound, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  loadComposeOptionsAction,
  loadPayloadVariablesAction,
  renderPreviewAction,
  sendToPeopleAction,
  sendToTopicAction,
  type ComposeOptions,
} from '@/app/compose/actions'
import { loadRecipientsAction } from '@/app/users/actions'
import { OrbitStepper } from '@/components/apps/orbit-stepper'
import { useApp } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { useRole } from '@/components/role-context'
import { EmailPreviewFrame } from '@/components/templates/preview-pane'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { ActionResult } from '@/lib/api/result'
import type { ConsoleSendContent, TemplateVariableDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { variableLabel } from '@/lib/variable-labels'

/** Khớp `MAX_CONSOLE_RECIPIENTS` của backend — vượt thì backend trả 422. */
const MAX_PEOPLE = 20

type Mode = 'people' | 'topic'
type ContentMode = 'template' | 'direct'
/**
 * Thư phải chờ giới hạn gửi của app (ADR-0032 của backend): thư sớm / muộn nhất sẽ đi lúc nào. Hai mốc bằng
 * nhau = cùng đi một lúc (ngoài khung giờ); khác nhau = dàn đều, thư đi dần.
 */
type Outcome = { scheduledAt: string | null; lastScheduledAt: string | null } & (
  | { kind: 'people'; queued: number; missing: string[] }
  | { kind: 'topic'; queued: number }
)

/** Mã lỗi backend -> câu ngắn. Mã khác: câu chung kèm mã. */
const KNOWN_ERRORS: Record<string, 'errMissingVariable' | 'errTooLarge' | 'errAppNotActive' | 'errContent'> = {
  MISSING_VARIABLE: 'errMissingVariable',
  INVALID_PAYLOAD_VALUE: 'errMissingVariable',
  PUBLICATION_TOO_LARGE: 'errTooLarge',
  APP_NOT_ACTIVE: 'errAppNotActive',
  EMAIL_SUBJECT_INVALID: 'errContent',
  EMAIL_HTML_REQUIRED: 'errContent',
  LINK_SCHEME_NOT_ALLOWED: 'errContent',
}

/** `payload.a.b` + giá trị -> `{ a: { b } }`. Ô trống bỏ qua — biến bắt buộc thiếu thì backend báo. */
function toPayload(values: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(values)) {
    if (value.trim() === '') continue
    const path = name.replace(/^payload\./, '').split('.')
    let node = payload
    path.forEach((key, i) => {
      if (i === path.length - 1) node[key] = value
      else node = (node[key] ??= {}) as Record<string, unknown>
    })
  }
  return payload
}

const newRequestId = () => crypto.randomUUID()

/** Biến dùng làm link: giá trị mẫu là link (backend chỉ nhận https:// / mailto: cho biến nằm trong href). */
const LINK_RE = /^(https:\/\/|mailto:)/i
const isLinkVariable = (v: TemplateVariableDto) => LINK_RE.test(v.sample ?? '')

type FieldError = 'fieldRequired' | 'fieldInvalid' | 'fieldLink'
/** Mã lỗi 422 -> câu dưới ô. `path` của backend = tên biến (`payload.x`); lỗi link chỉ có `path = payload`. */
const FIELD_ERRORS: Record<string, FieldError> = {
  MISSING_VARIABLE: 'fieldRequired',
  INVALID_PAYLOAD_VALUE: 'fieldInvalid',
  LINK_SCHEME_NOT_ALLOWED: 'fieldLink',
}

/**
 * Màn Soạn thông báo — 4 bước: Gửi tới · Nội dung · Xem trước · Gửi. Gửi đi đúng đường `/v1` của backend
 * (cùng kiểm chủ đề, template, consent; origin `dashboard`). Chỉ người quản lý app (`canManage`).
 * `requestId` sinh mỗi lần soạn: bấm Gửi lại không thành thư thứ hai.
 */
export function Composer() {
  const t = useTranslations('compose')
  const te = useTranslations('errors')
  const { app } = useApp()
  const appId = app.app_id
  const writable = useRole().canManage(app)

  const [options, setOptions] = useState<ComposeOptions | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>('people')
  const [topic, setTopic] = useState('')
  const [people, setPeople] = useState<string[]>([])
  const [contentMode, setContentMode] = useState<ContentMode>('template')
  const [templateId, setTemplateId] = useState('')
  const [variables, setVariables] = useState<TemplateVariableDto[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({})
  const [requestId, setRequestId] = useState(newRequestId)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [pending, startTransition] = useTransition()

  const failText = useCallback(
    (result: Extract<ActionResult<unknown>, { ok: false }>) => {
      const code = result.issues?.[0]?.code ?? result.code
      const known = KNOWN_ERRORS[code]
      return known ? t(known) : te('withCode', { message: result.message, code })
    },
    [t, te],
  )

  const reset = useCallback(() => {
    setStep(0)
    setMode('people')
    setTopic('')
    setPeople([])
    setContentMode('template')
    setTemplateId('')
    setSubject('')
    setHtml('')
    setPreview(null)
    setError(null)
    setFieldErrors({})
    setOutcome(null)
    setRequestId(newRequestId())
  }, [])

  const load = useCallback(async () => {
    const result = await loadComposeOptionsAction(appId)
    if (result.ok) {
      setOptions(result.data)
      setLoadError(null)
    } else {
      setOptions(null)
      setLoadError(failText(result))
    }
  }, [appId, failText])

  // Đổi app: soạn lại từ đầu.
  useEffect(() => {
    reset()
    setOptions(null)
    void load()
  }, [load, reset])

  // Chọn template -> nạp biến của bản đang xuất bản. Ô để TRỐNG, giá trị mẫu chỉ là gợi ý mờ: điền sẵn thì bấm Tiếp
  // là thư thật đi với số liệu mẫu (UX-10).
  useEffect(() => {
    setVariables([])
    setValues({})
    setFieldErrors({})
    if (!templateId) return
    let live = true
    loadPayloadVariablesAction(appId, templateId).then((result) => {
      if (!live) return
      if (result.ok) {
        setVariables(result.data)
      } else setError(failText(result))
    })
    return () => {
      live = false
    }
  }, [appId, templateId, failText])

  const content: ConsoleSendContent | null =
    contentMode === 'template'
      ? templateId
        ? { templateId, payload: toPayload(values) }
        : null
      : subject.trim() && html.trim()
        ? { subject: subject.trim(), html }
        : null

  const canNext = [
    topic !== '' && (mode === 'topic' || people.length > 0),
    content !== null && (contentMode === 'direct' || variables.every((v) => !v.required || (values[v.name] ?? '').trim() !== '')),
    preview !== null,
  ][step]

  /** Lỗi 422 của backend -> dưới đúng ô. Trả true nếu đã gắn được ít nhất một ô. */
  const markFields = (result: Extract<ActionResult<unknown>, { ok: false }>) => {
    const marks: Record<string, FieldError> = {}
    for (const issue of result.issues ?? []) {
      const kind = FIELD_ERRORS[issue.code]
      if (!kind) continue
      if (kind === 'fieldLink') {
        for (const v of variables) if (isLinkVariable(v) && !LINK_RE.test((values[v.name] ?? '').trim())) marks[v.name] = kind
      } else if (issue.path && variables.some((v) => v.name === issue.path)) marks[issue.path] = kind
    }
    setFieldErrors(marks)
    return Object.keys(marks).length > 0
  }

  const go = (next: number) => {
    setError(null)
    setFieldErrors({})
    if (next === 2 && contentMode === 'template') {
      // Link sai là lỗi hay gặp nhất — báo ngay dưới ô, không đợi backend.
      const bad = variables.filter((v) => isLinkVariable(v) && (values[v.name] ?? '').trim() !== '' && !LINK_RE.test(values[v.name].trim()))
      if (bad.length) {
        setFieldErrors(Object.fromEntries(bad.map((v) => [v.name, 'fieldLink' as const])))
        setError(t('fixFields'))
        return
      }
    }
    if (next !== 2) {
      setStep(next)
      return
    }
    // Vào bước Xem trước: template thì backend đổ biến (đúng hàm lúc gửi), viết thẳng thì hiện y nguyên.
    setPreview(null)
    if (contentMode === 'direct') {
      setPreview({ subject: subject.trim(), html })
      setStep(2)
      return
    }
    startTransition(async () => {
      const result = await renderPreviewAction(appId, templateId, {
        payload: toPayload(values),
        ...(mode === 'people' && people[0] ? { externalId: people[0] } : {}),
      })
      if (!result.ok) {
        setError(markFields(result) ? t('fixFields') : failText(result))
        return
      }
      setPreview({ subject: result.data.subject, html: result.data.html })
      setStep(2)
    })
  }

  const send = () => {
    if (!content) return
    setError(null)
    startTransition(async () => {
      if (mode === 'people') {
        const result = await sendToPeopleAction(appId, { ...content, topic, externalIds: people, requestId })
        if (!result.ok) {
          setError(failText(result))
          return
        }
        setOutcome({
          kind: 'people',
          queued: result.data.queued,
          missing: result.data.results.filter((r) => r.code !== null).map((r) => r.externalId),
          scheduledAt: result.data.scheduledAt ?? null,
          lastScheduledAt: result.data.lastScheduledAt ?? null,
        })
      } else {
        const result = await sendToTopicAction(appId, { ...content, topic, requestId })
        if (!result.ok) {
          setError(failText(result))
          return
        }
        setOutcome({
          kind: 'topic',
          queued: result.data.recipientCount,
          scheduledAt: result.data.scheduledAt ?? null,
          lastScheduledAt: result.data.lastScheduledAt ?? null,
        })
      }
    })
  }

  const header = <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.name })} />

  if (!writable) {
    return (
      <>
        {header}
        <Panel className="overflow-hidden">
          <EmptyState icon={ShieldOff} title={t('forbidden')} description={t('forbiddenBody')} />
        </Panel>
      </>
    )
  }

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

  if (outcome) {
    const spread = outcome.lastScheduledAt !== null && outcome.lastScheduledAt !== outcome.scheduledAt
    return (
      <>
        {header}
        <Panel className="mx-auto max-w-3xl px-8 py-16" ring>
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="size-12 text-[var(--aurora)]" />
            <h2 className="text-xl font-semibold">
              {t(spread ? 'doneTitle' : outcome.scheduledAt ? 'doneTitleScheduled' : 'doneTitle', { count: outcome.queued })}
            </h2>
            {outcome.scheduledAt && (
              <p className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <Clock className="size-4" />
                {spread && outcome.lastScheduledAt
                  ? t('doneSpread', { at: fmtDateTime(outcome.lastScheduledAt) })
                  : t('doneScheduled', { at: fmtDateTime(outcome.scheduledAt) })}
              </p>
            )}
            {outcome.kind === 'people' && outcome.missing.length > 0 && (
              <p className="text-sm text-[var(--solar)]">{t('doneMissing', { ids: outcome.missing.join(', ') })}</p>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={reset}>
                {t('composeAnother')}
              </Button>
              <Button nativeButton={false} render={<AppLink href="/notifications" />}>{t('viewHistory')}</Button>
            </div>
          </div>
        </Panel>
      </>
    )
  }

  const steps = [t('stepTo'), t('stepContent'), t('stepPreview'), t('stepSend')]
  const topicName = options?.topics.find((x) => x.key === topic)?.name ?? topic
  const chosenTemplate = options?.templates.find((x) => x.id === templateId)

  return (
    <>
      {header}
      <div className="mx-auto max-w-4xl">
        <OrbitStepper steps={steps} step={step} />

        <Panel className="p-8" ring>
          <div key={step} className="animate-in fade-in duration-200 motion-reduce:animate-none">
            {step === 0 && (
              <div className="space-y-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceCard
                    active={mode === 'people'}
                    icon={UserRound}
                    title={t('modePeople')}
                    hint={t('modePeopleHint', { max: MAX_PEOPLE })}
                    onClick={() => setMode('people')}
                  />
                  <ChoiceCard
                    active={mode === 'topic'}
                    icon={Hash}
                    title={t('modeTopic')}
                    hint={t('modeTopicHint')}
                    onClick={() => setMode('topic')}
                  />
                </div>

                <Field label={t('topic')} htmlFor="compose-topic" hint={mode === 'people' ? t('topicHintPeople') : undefined}>
                  {options && options.topics.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">{t('noTopics')}</p>
                  ) : (
                    <NativeSelect id="compose-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full">
                      <NativeSelectOption value="">{t('chooseTopic')}</NativeSelectOption>
                      {options?.topics.map((x) => (
                        <NativeSelectOption key={x.key} value={x.key}>
                          {x.name}
                          {x.mandatory ? ` · ${t('mandatory')}` : ''}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </Field>

                {mode === 'people' && (
                  <Field label={t('recipients')} htmlFor="compose-recipient">
                    <RecipientPicker appId={appId} value={people} onChange={setPeople} />
                  </Field>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceCard
                    active={contentMode === 'template'}
                    icon={FileText}
                    title={t('contentTemplate')}
                    onClick={() => setContentMode('template')}
                  />
                  <ChoiceCard
                    active={contentMode === 'direct'}
                    icon={PenLine}
                    title={t('contentDirect')}
                    onClick={() => setContentMode('direct')}
                  />
                </div>

                {contentMode === 'template' ? (
                  <div className="space-y-6">
                    <Field label={t('template')} htmlFor="compose-template">
                      {options && options.templates.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">{t('noTemplates')}</p>
                      ) : (
                        <NativeSelect
                          id="compose-template"
                          value={templateId}
                          onChange={(e) => setTemplateId(e.target.value)}
                          className="w-full"
                        >
                          <NativeSelectOption value="">{t('chooseTemplate')}</NativeSelectOption>
                          {options?.templates.map((x) => (
                            <NativeSelectOption key={x.id} value={x.id}>
                              {x.name} · v{x.version}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      )}
                    </Field>
                    {variables.map((v) => {
                      const id = `compose-var-${v.name}`
                      const fieldError = fieldErrors[v.name]
                      return (
                        <Field
                          key={v.name}
                          label={`${variableLabel(v)}${v.required ? ' *' : ''}`}
                          htmlFor={id}
                          code={v.name}
                          error={fieldError ? t(fieldError) : undefined}
                        >
                          <Input
                            id={id}
                            value={values[v.name] ?? ''}
                            onChange={(e) => {
                              setValues((cur) => ({ ...cur, [v.name]: e.target.value }))
                              if (fieldError) setFieldErrors(({ [v.name]: _, ...rest }) => rest)
                            }}
                            placeholder={v.sample ? t('example', { value: v.sample }) : ''}
                            aria-invalid={fieldError ? true : undefined}
                            aria-describedby={fieldError ? `${id}-error` : undefined}
                          />
                        </Field>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Field label={t('subject')} htmlFor="compose-subject">
                      <Input id="compose-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500} />
                    </Field>
                    <Field label={t('html')} htmlFor="compose-html">
                      <Textarea
                        id="compose-html"
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        rows={12}
                        className="font-mono text-xs"
                        placeholder="<p>…</p>"
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}

            {step === 2 && preview && (
              <div className="overflow-hidden rounded-xl border border-[var(--orbit)]">
                <div className="border-b border-[var(--orbit)] bg-muted/30 px-5 py-3 text-sm">
                  <span className="text-[var(--text-muted)]">{t('subject')}: </span>
                  <span className="font-medium">{preview.subject}</span>
                </div>
                <EmailPreviewFrame html={preview.html} className="h-[460px] w-full border-0 bg-white" />
              </div>
            )}

            {step === 3 && (
              <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-[160px_1fr]">
                <dt className="text-sm text-[var(--text-muted)]">{t('summaryTo')}</dt>
                <dd className="text-sm">
                  {mode === 'people' ? (
                    <>
                      {t('peopleCount', { count: people.length })} · <span className="font-mono">{topic}</span>
                      <span className="mt-2 block font-mono text-xs text-[var(--text-secondary)]">{people.join(', ')}</span>
                    </>
                  ) : (
                    t('wholeTopic', { topic: topicName })
                  )}
                </dd>
                <dt className="text-sm text-[var(--text-muted)]">{t('summaryContent')}</dt>
                <dd className="text-sm">
                  {contentMode === 'template' && chosenTemplate ? `${chosenTemplate.name} · v${chosenTemplate.version}` : t('contentDirect')}
                  <span className="mt-2 block text-[var(--text-secondary)]">{preview?.subject}</span>
                </dd>
              </dl>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-8">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-[var(--orbit)] pt-6">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={pending} className={cn('max-md:h-11', step === 0 && 'invisible')}>
              {t('back')}
            </Button>
            {step < 3 ? (
              <Button onClick={() => go(step + 1)} disabled={!canNext || pending} className="max-md:h-11">
                {t('next')}
              </Button>
            ) : (
              <Button onClick={send} disabled={pending} className="max-md:h-11">
                <Send />
                {pending ? t('sending') : mode === 'people' ? t('sendPeople', { count: people.length }) : t('sendTopic')}
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}

/** Một ô của form: nhãn (+ mã biến mờ bên dưới cho người tích hợp) · ô · gợi ý · lỗi ngay dưới ô (UX-10). */
function Field({
  label,
  htmlFor,
  code,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  code?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor} className="text-sm">
          {label}
        </Label>
        {code && <p className="font-mono text-[11px] text-[var(--text-muted)]">{code}</p>}
      </div>
      {children}
      {hint && <p className="text-xs text-[var(--text-secondary)]">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-[var(--supernova)]">
          {error}
        </p>
      )}
    </div>
  )
}

function ChoiceCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border p-6 text-left transition-colors',
        active
          ? 'border-[var(--starlight)] bg-[var(--starlight)]/5 shadow-[var(--glow-starlight)]'
          : 'border-[var(--orbit)] hover:border-[var(--starlight)]/50',
      )}
    >
      <Icon className={cn('size-6', active ? 'text-[var(--starlight)]' : 'text-[var(--text-muted)]')} />
      <span className="text-base font-medium">{title}</span>
      {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
    </button>
  )
}

/**
 * Gõ để tìm mã (khớp một phần, như màn Người nhận) -> chọn để thêm. Chỉ chọn được mã đã có. Mỗi gợi ý có email (hoặc
 * "chưa có email") để biết đúng người; ↑ / ↓ / Enter chọn bằng bàn phím, Esc đóng (combobox + listbox, UX-10).
 */
function RecipientPicker({ appId, value, onChange }: { appId: string; value: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations('compose')
  const listId = useId()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<{ id: string; email: string | null }[]>([])
  const [active, setActive] = useState(0)
  const [closed, setClosed] = useState(false)
  const full = value.length >= MAX_PEOPLE

  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setFound([])
      return
    }
    let live = true
    const timer = setTimeout(() => {
      loadRecipientsAction(appId, { q: term, limit: 8 }).then((result) => {
        if (!live) return
        setFound(result.ok ? result.data.rows.map((r) => ({ id: r.externalId, email: r.email?.address ?? null })) : [])
        setActive(0)
      })
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [appId, q])

  const choices = useMemo(() => found.filter((r) => !value.includes(r.id)), [found, value])
  const open = q.trim() !== '' && !full && !closed
  const pick = (id: string) => {
    onChange([...value, id])
    setQ('')
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          id="compose-recipient"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && choices[active] ? `${listId}-${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setClosed(false)
          }}
          onKeyDown={(e) => {
            if (!open || choices.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => (i + 1) % choices.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => (i - 1 + choices.length) % choices.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(choices[Math.min(active, choices.length - 1)].id)
            } else if (e.key === 'Escape') setClosed(true)
          }}
          placeholder={full ? t('maxReached', { max: MAX_PEOPLE }) : t('searchRecipients')}
          disabled={full}
          className="font-mono"
          autoComplete="off"
        />
        {open && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--orbit)] bg-popover shadow-md">
            {choices.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[var(--text-secondary)]">{t('noMatch')}</p>
            ) : (
              <ul id={listId} role="listbox" aria-label={t('recipients')}>
                {choices.map((r, i) => (
                  <li
                    key={r.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r.id)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5', i === active && 'bg-muted')}
                  >
                    <span className="font-mono text-sm">{r.id}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{r.email ?? t('noEmail')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-[var(--orbit)] py-0.5 pl-3 pr-0.5 font-mono text-xs">
              {id}
              <button
                type="button"
                aria-label={t('remove', { id })}
                onClick={() => onChange(value.filter((x) => x !== id))}
                className="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-[var(--starlight)]"
              >
                <X className="size-3.5 text-[var(--text-muted)] hover:text-foreground" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
