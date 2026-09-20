'use client'
import { useMemo, useState } from 'react'
import {
  linkSchemeIssues,
  renderHtmlPreview,
  renderTemplate,
  sampleValuesOf,
  sanitizeHtml,
  schemaIssues,
  schemaOf,
  templateAudit,
  templateByKey,
  unresolvedVariables,
  type AuditEntry,
  type Template,
  type TemplateVersion,
  type VariableSchemaEntry,
} from '@/lib/mock-data'

export type SchemaRow = VariableSchemaEntry & { defaultValue?: string }

const blank = (key: string, ns: string): Template => ({ key, namespace: ns, versions: ['v1 draft'], name: key, channel: 'email', status: 'active', subject: '', html: '' })

/** Toàn bộ state/derived của Template editor (05 §B–§D) — UI ở components/templates/* chỉ render. */
export function useTemplateEditor(key: string, namespace: string, ai?: { prompt: string; subject: string; html: string } | null) {
  const base = templateByKey(key) ?? blank(key, namespace)
  const initialHistory: TemplateVersion[] = base.history ?? [
    { version: base.published ?? 'v1', status: base.published ? 'published' : 'draft', by: base.updated_by ?? 'bạn', at: '2026-09-01', diff: 'bản đầu', subject: base.subject ?? '', html: base.html ?? '' },
  ]
  const [history, setHistory] = useState<TemplateVersion[]>(initialHistory)
  const editing = ai ? { version: 'v1', status: 'draft' as const } : history.find((v) => v.status === 'draft') ?? history[history.length - 1]
  const [version, setVersion] = useState(editing.version)
  const [status, setStatus] = useState<'published' | 'superseded' | 'draft'>(ai ? 'draft' : editing.status)
  const [subject, setSubject] = useState(ai?.subject ?? (base.subject ?? ''))
  const [html, setHtml] = useState(ai?.html ?? (base.html ?? ''))
  const [schema, setSchema] = useState<SchemaRow[]>(() => schemaOf(base))
  const [aiBanner, setAiBanner] = useState(Boolean(ai))
  const [audit, setAudit] = useState<AuditEntry[]>(() => [
    ...(ai ? [{ actor: 'ai', action: 'ai_generated', to: `prompt: "${ai.prompt}"`, timestamp: 'vừa xong', source: 'dashboard' }] : []),
    ...templateAudit(base),
  ])
  const [demoHtmlValue, setDemoHtmlValue] = useState(false)
  const [archived, setArchived] = useState(base.status === 'archived')

  const derived = useMemo(() => {
    const issues = schemaIssues(schema, subject, html)
    const sanitized = sanitizeHtml(html)
    const values = sampleValuesOf(schema)
    // §H: custom_data chứa HTML → hiện như chữ (escape), không phải markup
    if (demoHtmlValue && schema[0]) values[schema[0].name] = '<b>Xin chào</b> <script>alert(1)</script>'
    const previewSubject = renderTemplate(subject, values)
    const previewHtml = renderHtmlPreview(html, values)
    const unresolved = Array.from(new Set([...unresolvedVariables(previewSubject), ...unresolvedVariables(previewHtml)]))
    const links = linkSchemeIssues(html)
    const htmlVars = schema.filter((v) => v.type === 'html').map((v) => v.name)
    const urlMissingSample = schema.filter((v) => v.type === 'url' && !(v.sample ?? '').trim()).map((v) => v.name)
    const newRequired = schema.filter((v) => v.required && !schemaOf(base).some((b) => b.name === v.name)).map((v) => v.name)
    return { ...issues, sanitized, values, previewSubject, previewHtml, unresolved, links, htmlVars, urlMissingSample, newRequired }
  }, [schema, subject, html, demoHtmlValue, base])

  const canSave = derived.undeclared.length === 0
  const canPublish = canSave && derived.unresolved.length === 0 && derived.links.length === 0 && derived.urlMissingSample.length === 0 && status === 'draft'

  const updateVar = (name: string, patch: Partial<SchemaRow>) => setSchema((s) => s.map((v) => (v.name === name ? { ...v, ...patch } : v)))
  const declareVar = (name: string) => setSchema((s) => [...s, { name, type: 'string', required: true, sample: '' }])
  const removeVar = (name: string) => setSchema((s) => s.filter((v) => v.name !== name))
  const log = (e: AuditEntry) => setAudit((a) => [e, ...a])

  const saveDraft = () => {
    if (!canSave) return false
    setHistory((h) => (h.some((v) => v.version === version) ? h.map((v) => (v.version === version ? { ...v, subject, html, status: 'draft' } : v)) : [...h, { version, status: 'draft', by: 'bạn', at: 'vừa xong', diff: 'nháp', subject, html }]))
    log({ actor: 'bạn', action: 'template_draft_saved', to: version, timestamp: 'vừa xong', source: 'dashboard' })
    return true
  }
  const publish = () => {
    setHistory((h) => [...h.filter((v) => v.version !== version).map((v) => (v.status === 'published' ? { ...v, status: 'superseded' as const } : v)), { version, status: 'published', by: 'bạn', at: 'vừa xong', diff: derived.newRequired.length ? `+${derived.newRequired.length} biến bắt buộc` : 'sửa nội dung', subject, html }])
    setStatus('published')
    setAiBanner(false)
    log({ actor: 'bạn', action: 'template_published', to: version, timestamp: 'vừa xong', source: 'dashboard' })
  }
  /** Sửa bản published → không sửa tại chỗ: tạo draft v(n+1) */
  const startEdit = () => {
    const n = Math.max(...history.map((v) => Number(v.version.replace('v', '')))) + 1
    const next = `v${n}`
    setHistory((h) => [...h, { version: next, status: 'draft', by: 'bạn', at: 'vừa xong', diff: 'nháp từ ' + version, subject, html }])
    setVersion(next)
    setStatus('draft')
    return next
  }
  const rollback = (v: TemplateVersion) => {
    setHistory((h) => h.map((x) => (x.version === v.version ? { ...x, status: 'published' } : x.status === 'published' ? { ...x, status: 'superseded' } : x)))
    setSubject(v.subject)
    setHtml(v.html)
    setVersion(v.version)
    setStatus('published')
    log({ actor: 'bạn', action: 'template_rolled_back', from: version, to: v.version, timestamp: 'vừa xong', source: 'dashboard' })
  }
  const archive = () => {
    setArchived(true)
    log({ actor: 'bạn', action: 'template_archived', timestamp: 'vừa xong', source: 'dashboard' })
  }

  return {
    base,
    version,
    status,
    subject,
    setSubject,
    html,
    setHtml,
    schema,
    updateVar,
    declareVar,
    removeVar,
    history,
    audit,
    aiBanner,
    setAiBanner,
    archived,
    demoHtmlValue,
    setDemoHtmlValue,
    ...derived,
    canSave,
    canPublish,
    saveDraft,
    publish,
    startEdit,
    rollback,
    archive,
  }
}
export type TemplateEditorState = ReturnType<typeof useTemplateEditor>
