'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, FileText, Hash, PenLine, PlugZap, Send, ShieldOff, UserRound, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'

/** Khớp `MAX_CONSOLE_RECIPIENTS` của backend — vượt thì backend trả 422. */
const MAX_PEOPLE = 20

type Mode = 'people' | 'topic'
type ContentMode = 'template' | 'direct'
type Outcome = { kind: 'people'; queued: number; missing: string[] } | { kind: 'topic'; queued: number }

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

  // Chọn template -> nạp biến của bản đang xuất bản, điền sẵn giá trị mẫu.
  useEffect(() => {
    setVariables([])
    setValues({})
    if (!templateId) return
    let live = true
    loadPayloadVariablesAction(appId, templateId).then((result) => {
      if (!live) return
      if (result.ok) {
        setVariables(result.data)
        setValues(Object.fromEntries(result.data.map((v) => [v.name, v.sample ?? ''])))
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

  const go = (next: number) => {
    setError(null)
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
        setError(failText(result))
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
        })
      } else {
        const result = await sendToTopicAction(appId, { ...content, topic, requestId })
        if (!result.ok) {
          setError(failText(result))
          return
        }
        setOutcome({ kind: 'topic', queued: result.data.recipientCount })
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
    return (
      <>
        {header}
        <Panel className="mx-auto max-w-3xl px-8 py-16" ring>
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="size-12 text-[var(--aurora)]" />
            <h2 className="text-xl font-semibold">{t('doneTitle', { count: outcome.queued })}</h2>
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

                <Field label={t('topic')} htmlFor="compose-topic">
                  {options && options.topics.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">{t('noTopics')}</p>
                  ) : (
                    <NativeSelect id="compose-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full">
                      <NativeSelectOption value="">{t('chooseTopic')}</NativeSelectOption>
                      {options?.topics.map((x) => (
                        <NativeSelectOption key={x.key} value={x.key}>
                          {x.name} · {x.key}
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
                    {variables.map((v) => (
                      <Field
                        key={v.name}
                        label={`${v.name.replace(/^payload\./, '')}${v.required ? ' *' : ''}`}
                        htmlFor={`compose-var-${v.name}`}
                        mono
                      >
                        <Input
                          id={`compose-var-${v.name}`}
                          value={values[v.name] ?? ''}
                          onChange={(e) => setValues((cur) => ({ ...cur, [v.name]: e.target.value }))}
                          placeholder={v.description ?? ''}
                        />
                      </Field>
                    ))}
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
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={pending} className={cn(step === 0 && 'invisible')}>
              {t('back')}
            </Button>
            {step < 3 ? (
              <Button onClick={() => go(step + 1)} disabled={!canNext || pending}>
                {t('next')}
              </Button>
            ) : (
              <Button onClick={send} disabled={pending}>
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

function Field({ label, htmlFor, mono, children }: { label: string; htmlFor: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={cn('text-sm', mono && 'font-mono')}>
        {label}
      </Label>
      {children}
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

/** Gõ để tìm mã (khớp một phần, như màn Người nhận) -> bấm để thêm. Chỉ chọn được mã đã có. */
function RecipientPicker({ appId, value, onChange }: { appId: string; value: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations('compose')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<string[]>([])
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
        if (live) setFound(result.ok ? result.data.rows.map((r) => r.externalId) : [])
      })
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [appId, q])

  const choices = useMemo(() => found.filter((id) => !value.includes(id)), [found, value])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          id="compose-recipient"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={full ? t('maxReached', { max: MAX_PEOPLE }) : t('searchRecipients')}
          disabled={full}
          className="font-mono"
          autoComplete="off"
        />
        {q.trim() && !full && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--orbit)] bg-popover shadow-md">
            {choices.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[var(--text-muted)]">{t('noMatch')}</p>
            ) : (
              choices.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="block w-full px-3 py-2.5 text-left font-mono text-sm hover:bg-muted"
                  onClick={() => {
                    onChange([...value, id])
                    setQ('')
                  }}
                >
                  {id}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--orbit)] px-3 py-1 font-mono text-xs">
              {id}
              <button type="button" aria-label={t('remove', { id })} onClick={() => onChange(value.filter((x) => x !== id))}>
                <X className="size-3.5 text-[var(--text-muted)] hover:text-foreground" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
