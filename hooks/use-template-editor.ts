'use client'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  archiveTemplateAction,
  draftFromVersionAction,
  loadTemplateAction,
  renameTemplateAction,
  saveAndPublishAction,
  saveDraftAction,
} from '@/app/templates/actions'
import type { Issue } from '@/lib/api/problem'
import type { ActionResult } from '@/lib/api/result'
import type { TemplateDetailDto, TemplateVariableDto, TemplateVersionDto } from '@/lib/api/types'
import { hasSource, renderPreview, sourceOf, usedVariablePaths } from '@/lib/template-syntax'

/** Lỗi của thao tác GHI gần nhất — kèm `issues` khi xuất bản bị 422. */
export type EditorError = { message: string; code: string; issues: readonly Issue[] }

/**
 * Toàn bộ state của màn soạn một template (ADR-0020) — component ở `components/templates/*` chỉ render.
 *
 * Bản đang sửa = bản NHÁP nếu có. Không có nháp thì hiện bản đang xuất bản ở chế độ chỉ đọc; bấm "Sửa"
 * là tạo nháp mới chép từ bản đó (backend không cho sửa tại chỗ bản đã xuất bản).
 */
export function useTemplateEditor(appId: string, templateId: string) {
  const [detail, setDetail] = useState<TemplateDetailDto | null>(null)
  const [loadError, setLoadError] = useState<{ message: string; code: string } | null>(null)
  const [error, setError] = useState<EditorError | null>(null)
  const [pending, startTransition] = useTransition()

  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [text, setText] = useState('')
  const [variables, setVariables] = useState<TemplateVariableDto[]>([])
  const [dirty, setDirty] = useState(false)
  const [aiBanner, setAiBanner] = useState(false)

  const draft = detail?.versions.find((v) => v.status === 'draft') ?? null
  const published = detail?.versions.find((v) => v.status === 'published') ?? null
  /** Bản đang hiện trong khung soạn. */
  const shown: TemplateVersionDto | null = draft ?? published ?? detail?.versions[0] ?? null
  const archived = detail?.status === 'archived'
  const locked = !draft || archived

  /** Nạp bản đang hiện vào ô soạn — sau mỗi lần backend trả chi tiết mới. */
  const adopt = useCallback((next: TemplateDetailDto) => {
    setDetail(next)
    const v =
      next.versions.find((x) => x.status === 'draft') ??
      next.versions.find((x) => x.status === 'published') ??
      next.versions[0]
    setSubject(v?.subject ?? '')
    setHtml(v?.html ?? '')
    setText(v?.text ?? '')
    setVariables(v?.variables ?? [])
    setDirty(false)
  }, [])

  const load = useCallback(async () => {
    const result = await loadTemplateAction(appId, templateId)
    if (result.ok) {
      adopt(result.data)
      setLoadError(null)
    } else {
      setDetail(null)
      setLoadError({ message: result.message, code: result.code })
    }
  }, [appId, templateId, adopt])

  useEffect(() => {
    void load()
  }, [load])

  const derived = useMemo(() => {
    const used = usedVariablePaths(subject, html, text)
    const declared = variables.map((v) => v.name)
    return {
      declared,
      /** Dùng trong nội dung mà chưa khai — có nguồn thì bấm "Khai báo" được. */
      undeclared: used.filter((p) => !declared.includes(p) && hasSource(p)),
      /** `{{ vm_name }}` — thiếu `payload.`, backend sẽ từ chối. */
      missingSource: used.filter((p) => !hasSource(p)),
      unused: declared.filter((d) => !used.includes(d)),
      previewSubject: renderPreview(subject, variables, { escape: false }),
      previewHtml: renderPreview(html, variables, { escape: true }),
      /** Bắt buộc mới so với bản ĐANG XUẤT BẢN — app chưa gửi biến này thì mọi lần gửi bị MISSING_VARIABLE. */
      newRequired: published
        ? variables
            .filter((v) => v.required && !published.variables.some((p) => p.name === v.name && p.required))
            .map((v) => v.name)
        : [],
    }
  }, [subject, html, text, variables, published])

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setDirty(true)
  }

  const updateVar = (name: string, patch: Partial<TemplateVariableDto>) => {
    setVariables((vs) => vs.map((v) => (v.name === name ? { ...v, ...patch } : v)))
    setDirty(true)
  }
  const declareVar = (name: string) => {
    setVariables((vs) => [...vs, { name, source: sourceOf(name), required: true }])
    setDirty(true)
  }
  const removeVar = (name: string) => {
    setVariables((vs) => vs.filter((v) => v.name !== name))
    setDirty(true)
  }

  /** Chạy một lệnh ghi; thành công thì nạp chi tiết mới trả về, lỗi thì giữ nguyên ô soạn. */
  const run = (op: () => Promise<ActionResult<TemplateDetailDto>>, onOk?: () => void) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await op()
        if (result.ok) {
          setError(null)
          adopt(result.data)
          onOk?.()
          resolve(true)
        } else {
          setError({ message: result.message, code: result.code, issues: result.issues ?? [] })
          resolve(false)
        }
      })
    })

  const content = () => ({ subject, html, text, variables })

  return {
    detail,
    loadError,
    reload: load,
    error,
    clearError: () => setError(null),
    pending,
    draft,
    published,
    shown,
    archived,
    locked,
    dirty,
    subject,
    setSubject: edit(setSubject),
    html,
    setHtml: edit(setHtml),
    text,
    setText: edit(setText),
    variables,
    updateVar,
    declareVar,
    removeVar,
    aiBanner,
    setAiBanner,
    ...derived,
    saveDraft: () => run(() => saveDraftAction(appId, templateId, content())),
    publish: () => run(() => saveAndPublishAction(appId, templateId, content()), () => setAiBanner(false)),
    /** "Sửa" bản đang xuất bản / "Tạo nháp từ bản này". */
    draftFrom: (version: number) => run(() => draftFromVersionAction(appId, templateId, version)),
    rename: (name: string) => run(() => renameTemplateAction(appId, templateId, name)),
    archive: () => run(() => archiveTemplateAction(appId, templateId)),
  }
}

export type TemplateEditorState = ReturnType<typeof useTemplateEditor>
