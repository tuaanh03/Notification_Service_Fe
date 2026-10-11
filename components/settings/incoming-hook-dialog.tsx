'use client'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, Eye, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadTemplateVariablesAction, previewIncomingHookAction } from '@/app/settings/webhooks/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type {
  HookPreviewDto,
  IncomingHookConfigInput,
  IncomingHookDto,
  IncomingVariableMapping,
  TemplateSummaryDto,
  TopicDto,
} from '@/lib/api/types'
import { cn } from '@/lib/utils'

/** Một dòng của bảng ánh xạ = một biến `payload.*` của bản template đang xuất bản. */
type Row = {
  variable: string
  required: boolean
  /** same = lấy trường cùng tên ở tầng đầu (không gửi dòng ánh xạ nào) */
  mode: 'same' | 'path' | 'fixed'
  path: string
  defaultValue: string
  value: string
}

const nameOf = (variable: string) => variable.slice('payload.'.length)

function rowsFor(variables: { name: string; required: boolean }[], mappings: IncomingVariableMapping[]): Row[] {
  const byVariable = new Map(mappings.map((m) => [m.variable, m]))
  return variables.map((v) => {
    const m = byVariable.get(v.name)
    return {
      variable: v.name,
      required: v.required,
      mode: m ? m.kind : 'same',
      path: m?.kind === 'path' ? m.path : '',
      defaultValue: m?.kind === 'path' ? (m.defaultValue ?? '') : '',
      value: m?.kind === 'fixed' ? m.value : '',
    }
  })
}

/**
 * Hộp thêm / sửa incoming webhook (ADR-0030 của backend). Bảng ánh xạ dựng từ biến của bản template
 * ĐANG XUẤT BẢN — mỗi biến một dòng, mặc định "trường cùng tên". Ô "Xem trước" chạy cấu hình đang soạn
 * (chưa lưu) trên JSON mẫu ở backend — không gửi gì. Nơi gọi PHẢI truyền `key` theo mục tiêu (CLAUDE.md mục 6).
 */
export function IncomingHookDialog({
  appId,
  hook,
  topics,
  templates,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  appId: string
  /** null = thêm mới */
  hook: IncomingHookDto | null
  topics: TopicDto[]
  templates: TemplateSummaryDto[]
  pending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (config: IncomingHookConfigInput) => void
}) {
  const t = useTranslations('incoming')
  const te = useTranslations('errors')
  const [name, setName] = useState(hook?.name ?? '')
  const [topicId, setTopicId] = useState(hook?.topic.id ?? topics.find((x) => x.status === 'active')?.id ?? '')
  const [templateId, setTemplateId] = useState(hook?.template.id ?? templates.find((x) => x.publishedVersion !== null)?.id ?? '')
  const [rows, setRows] = useState<Row[]>([])
  const [templateState, setTemplateState] = useState<{ loading: boolean; version: number | null; error: string | null }>({
    loading: false,
    version: null,
    error: null,
  })
  const [dedupePath, setDedupePath] = useState(hook?.dedupePath ?? '')
  const [conditionOn, setConditionOn] = useState(hook?.condition !== null && hook?.condition !== undefined)
  const [conditionPath, setConditionPath] = useState(hook?.condition?.path ?? '')
  const [conditionValues, setConditionValues] = useState(hook?.condition?.values.join(', ') ?? '')
  const [sample, setSample] = useState('')
  const [preview, setPreview] = useState<HookPreviewDto | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, startPreview] = useTransition()

  // Đổi template: nạp biến của bản đang xuất bản, GIỮ cấu hình của biến trùng tên.
  const loadVariables = useCallback(
    async (id: string, keep: IncomingVariableMapping[]) => {
      if (!id) return setRows([])
      setTemplateState({ loading: true, version: null, error: null })
      const result = await loadTemplateVariablesAction(appId, id)
      if (!result.ok) {
        setTemplateState({ loading: false, version: null, error: te('withCode', { message: result.message, code: result.code }) })
        return setRows([])
      }
      setTemplateState({ loading: false, version: result.data.version, error: null })
      setRows(rowsFor(result.data.variables, keep))
    },
    [appId, te],
  )

  useEffect(() => {
    void loadVariables(templateId, hook?.mappings ?? [])
    // Chỉ lần mở hộp — đổi template sau đó gọi trực tiếp trong onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Ánh xạ cũ cho biến mà bản template hiện tại không khai — lưu là bỏ. */
  const dropped = useMemo(() => {
    const declared = new Set(rows.map((r) => r.variable))
    return (hook?.mappings ?? []).filter((m) => !declared.has(m.variable)).map((m) => m.variable)
  }, [rows, hook])

  const config = (): IncomingHookConfigInput => ({
    name: name.trim(),
    topicId,
    templateId,
    mappings: rows.flatMap((r): IncomingVariableMapping[] =>
      r.mode === 'path'
        ? [{ variable: r.variable, kind: 'path', path: r.path.trim(), defaultValue: r.defaultValue === '' ? null : r.defaultValue }]
        : r.mode === 'fixed'
          ? [{ variable: r.variable, kind: 'fixed', value: r.value }]
          : [],
    ),
    dedupePath: dedupePath.trim() === '' ? null : dedupePath.trim(),
    condition: conditionOn
      ? { path: conditionPath.trim(), values: conditionValues.split(',').map((v) => v.trim()).filter(Boolean) }
      : null,
  })

  const incomplete = rows.some((r) => (r.mode === 'path' && r.path.trim() === '') || (r.mode === 'fixed' && r.value === ''))
  const conditionIncomplete = conditionOn && (conditionPath.trim() === '' || conditionValues.trim() === '')
  const valid = name.trim() !== '' && topicId !== '' && templateId !== '' && !incomplete && !conditionIncomplete

  const runPreview = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(sample)
    } catch {
      setPreview(null)
      return setPreviewError(t('sampleInvalid'))
    }
    startPreview(async () => {
      const result = await previewIncomingHookAction(appId, { config: { ...config(), name: name.trim() || 'preview' }, sample: parsed })
      if (!result.ok) {
        setPreview(null)
        setPreviewError(te('withCode', { message: result.message, code: result.issues?.[0]?.code ?? result.code }))
        return
      }
      setPreviewError(null)
      setPreview(result.data)
    })
  }

  const update = (variable: string, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.variable === variable ? { ...r, ...patch } : r)))

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="orbit-ring z-[100] grid-cols-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] max-w-4xl overflow-x-hidden overflow-y-auto rounded-2xl p-6 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{hook ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>{t('dialogBody')}</DialogDescription>
        </DialogHeader>

        {/* 1. Tên, topic, template */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="hook-name" className="text-xs">{t('nameLabel')}</Label>
            <Input id="hook-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hook-topic" className="text-xs">{t('topicLabel')}</Label>
            <NativeSelect id="hook-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full">
              <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
              {topics.map((x) => (
                <NativeSelectOption key={x.id} value={x.id}>
                  {x.key}
                  {x.status !== 'active' ? ` (${x.status})` : ''}
                  {x.mandatory ? ` · ${t('mandatory')}` : ''}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hook-template" className="text-xs">{t('templateLabel')}</Label>
            <NativeSelect
              id="hook-template"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setPreview(null)
                void loadVariables(e.target.value, config().mappings)
              }}
              className="w-full"
            >
              <NativeSelectOption value="">{t('choose')}</NativeSelectOption>
              {templates
                .filter((x) => x.status !== 'archived')
                .map((x) => (
                  <NativeSelectOption key={x.id} value={x.id}>
                    {x.name}
                    {x.publishedVersion === null ? ` (${t('unpublished')})` : ` · v${x.publishedVersion}`}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>
        </div>

        {/* 2. Bảng ánh xạ */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('mappingTitle')}</h3>
          <p className="text-xs text-[var(--text-secondary)]">{t.rich('mappingHelp', { mono: (c) => <span className="font-mono">{c}</span> })}</p>
          {templateState.error && (
            <Alert variant="destructive">
              <AlertDescription>{templateState.error}</AlertDescription>
            </Alert>
          )}
          {!templateState.loading && templateId && !templateState.error && templateState.version === null && (
            <Alert>
              <AlertTriangle />
              <AlertDescription>{t('templateUnpublished')}</AlertDescription>
            </Alert>
          )}
          {rows.length > 0 && (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.variable} className="grid gap-2 rounded-lg border border-[var(--orbit)] p-3 md:grid-cols-[12rem_10rem_minmax(0,1fr)_minmax(0,12rem)] md:items-center">
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-xs text-[var(--starlight)]">{r.variable}</span>
                    {r.required && <Badge variant="outline" className="mt-1 text-[10px]">{t('required')}</Badge>}
                  </div>
                  <NativeSelect
                    aria-label={t('sourceAria', { variable: r.variable })}
                    value={r.mode}
                    onChange={(e) => update(r.variable, { mode: e.target.value as Row['mode'] })}
                    className="w-full"
                  >
                    <NativeSelectOption value="same">{t('modeSame')}</NativeSelectOption>
                    <NativeSelectOption value="path">{t('modePath')}</NativeSelectOption>
                    <NativeSelectOption value="fixed">{t('modeFixed')}</NativeSelectOption>
                  </NativeSelect>
                  {r.mode === 'same' && (
                    <p className="text-xs text-[var(--text-muted)] md:col-span-2">
                      {t.rich('sameHint', { field: nameOf(r.variable), mono: (c) => <span className="font-mono">{c}</span> })}
                    </p>
                  )}
                  {r.mode === 'path' && (
                    <>
                      <Input
                        aria-label={t('pathAria', { variable: r.variable })}
                        value={r.path}
                        onChange={(e) => update(r.variable, { path: e.target.value })}
                        placeholder="alerts[0].labels.service"
                        className="font-mono text-xs"
                      />
                      <Input
                        aria-label={t('defaultAria', { variable: r.variable })}
                        value={r.defaultValue}
                        onChange={(e) => update(r.variable, { defaultValue: e.target.value })}
                        placeholder={t('defaultPlaceholder')}
                        className="text-xs"
                      />
                    </>
                  )}
                  {r.mode === 'fixed' && (
                    <Input
                      aria-label={t('fixedAria', { variable: r.variable })}
                      value={r.value}
                      onChange={(e) => update(r.variable, { value: e.target.value })}
                      placeholder={t('fixedPlaceholder')}
                      className="text-xs md:col-span-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {dropped.length > 0 && (
            <p className="text-xs text-[var(--solar)]">{t('dropped', { variables: dropped.join(', ') })}</p>
          )}
          <p className="text-[11px] text-[var(--text-muted)]">{t.rich('pathSyntax', { mono: (c) => <span className="font-mono">{c}</span> })}</p>
        </section>

        {/* 3. Chống trùng + điều kiện */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hook-dedupe" className="text-xs">{t('dedupeLabel')}</Label>
            <Input id="hook-dedupe" value={dedupePath} onChange={(e) => setDedupePath(e.target.value)} placeholder="id" className="font-mono text-xs" />
            <p className="text-[11px] text-[var(--text-muted)]">{t('dedupeHelp')}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="hook-condition-on" className="flex items-center gap-2 text-xs font-medium">
              <Checkbox id="hook-condition-on" checked={conditionOn} onCheckedChange={(c) => setConditionOn(c === true)} />
              {t('conditionLabel')}
            </label>
            {conditionOn && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label={t('conditionPathAria')}
                  value={conditionPath}
                  onChange={(e) => setConditionPath(e.target.value)}
                  placeholder="alert.state"
                  className="font-mono text-xs"
                />
                <Input
                  aria-label={t('conditionValuesAria')}
                  value={conditionValues}
                  onChange={(e) => setConditionValues(e.target.value)}
                  placeholder="TRIGGERED, RESOLVED"
                  className="font-mono text-xs"
                />
              </div>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">{t('conditionHelp')}</p>
          </div>
        </section>

        {/* 4. Xem trước */}
        <section className="space-y-2 rounded-lg border border-[var(--orbit)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t('previewTitle')}</h3>
            <Button size="sm" variant="outline" disabled={previewing || sample.trim() === '' || topicId === '' || templateId === ''} onClick={runPreview}>
              <Eye /> {previewing ? t('previewing') : t('previewRun')}
            </Button>
          </div>
          <Textarea
            aria-label={t('sampleAria')}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            placeholder={t('samplePlaceholder')}
            className="min-h-28 font-mono text-xs"
          />
          {previewError && (
            <Alert variant="destructive">
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}
          {preview && <PreviewResult preview={preview} />}
        </section>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit(config())}>
            {pending ? t('saving') : hook ? t('save') : t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Kết quả xem trước: điều kiện, khoá chống trùng, từng biến, thư đã đổ biến (bản chữ thường — không dựng HTML). */
function PreviewResult({ preview }: { preview: HookPreviewDto }) {
  const t = useTranslations('incoming')
  const mono = (c: React.ReactNode) => <span className="font-mono">{c}</span>
  const sourceLabel = (v: HookPreviewDto['variables'][number]) =>
    v.source === 'fixed' ? t('fromFixed') : v.source === 'none' ? t('fromNone') : v.path ?? ''
  return (
    <div className="space-y-3 text-xs">
      <p className="flex items-center gap-1.5">
        {preview.conditionMet ? <CheckCircle2 className="size-3.5 text-[var(--aurora)]" /> : <XCircle className="size-3.5 text-[var(--solar)]" />}
        {preview.conditionMet ? t('conditionMet') : t('conditionNotMet')}
      </p>
      <p className="text-[var(--text-secondary)]">
        {t.rich(`dedupe_${preview.dedupe.source}`, { mono, value: preview.dedupe.value ?? '', minutes: preview.dedupe.windowMinutes })}
      </p>
      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-2">{t('colVariable')}</TableHead>
              <TableHead className="px-2">{t('colFrom')}</TableHead>
              <TableHead className="px-2">{t('colValue')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.variables.map((v) => (
              <TableRow key={v.variable} className="border-[var(--orbit)]">
                <TableCell className="px-2 font-mono">{v.variable}</TableCell>
                <TableCell className="px-2 font-mono text-[var(--text-secondary)]">{sourceLabel(v)}</TableCell>
                <TableCell className={cn('px-2 font-mono whitespace-normal break-all', v.missing && v.required && 'text-[var(--supernova)]')}>
                  {v.missing
                    ? v.required
                      ? t('missingRequired')
                      : t('missingOptional')
                    : `${JSON.stringify(v.value)}${v.usedDefault ? ` ${t('usedDefault')}` : ''}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {[...preview.issues, ...preview.renderIssues].length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {[...preview.issues, ...preview.renderIssues].map((i, n) => (
              <span key={n} className="block font-mono">
                {i.code}
                {i.path ? ` · ${i.path}` : ''}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}
      {preview.rendered && (
        <div className="rounded-lg border border-[var(--orbit)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{t('renderedTitle')}</p>
          <p className="mt-1 font-medium">{preview.rendered.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--text-secondary)]">{preview.rendered.text}</pre>
        </div>
      )}
    </div>
  )
}
