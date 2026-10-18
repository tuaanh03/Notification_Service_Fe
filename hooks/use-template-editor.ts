'use client'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  aiComposeAction,
  archiveTemplateAction,
  convertToHtmlAction,
  draftFromVersionAction,
  duplicateTemplateAction,
  loadTemplateAction,
  saveAndPublishAction,
  saveDraftAction,
  updateTemplateAction,
} from '@/app/templates/actions'
import type { Issue } from '@/lib/api/problem'
import type { ActionResult } from '@/lib/api/result'
import type { TemplateContentInput } from '@/lib/api/templates'
import type { AiComposeResultDto, AiSuggestedVariableDto, TemplateDetailDto, TemplateVariableDto, TemplateVersionDto } from '@/lib/api/types'
import { designTexts, type EmailDesign, type TemplateEditor } from '@/lib/email-design'
import type { TemplateCategory } from '@/lib/template-categories'
import { useDesignPreview } from './use-design-preview'
import { hasSource, renderPreview, sourceOf, usedVariablePaths } from '@/lib/template-syntax'

/** Lỗi của thao tác GHI gần nhất — kèm `issues` khi xuất bản bị 422. */
export type EditorError = { message: string; code: string; issues: readonly Issue[] }

/**
 * Toàn bộ state của màn soạn một template (ADR-0020) — component ở `components/templates/*` chỉ render.
 *
 * Bản đang sửa = bản NHÁP nếu có. Không có nháp thì hiện bản đang xuất bản ở chế độ chỉ đọc; bấm "Sửa"
 * là tạo nháp mới chép từ bản đó (backend không cho sửa tại chỗ bản đã xuất bản).
 *
 * `readOnly` = người xem không cấu hình được app (App Viewer, ADR-0022): mọi bản đều chỉ đọc.
 */
export function useTemplateEditor(appId: string, templateId: string, readOnly = false) {
  const [detail, setDetail] = useState<TemplateDetailDto | null>(null)
  const [loadError, setLoadError] = useState<{ message: string; code: string } | null>(null)
  const [error, setError] = useState<EditorError | null>(null)
  const [pending, startTransition] = useTransition()

  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [text, setText] = useState('')
  const [variables, setVariables] = useState<TemplateVariableDto[]>([])
  /** Kiểu soạn của bản đang hiện (ADR-0034). `blocks`: `html` / `text` ở trên là bản ĐÃ LƯU do backend sinh. */
  const [editor, setEditor] = useState<TemplateEditor>('html')
  const [design, setDesign] = useState<EmailDesign | null>(null)
  /** Thiết kế đã sửa sau lần nạp cuối — chỉ khi đó mới hỏi backend xem trước; chưa sửa thì dùng HTML đã lưu. */
  const [designEdited, setDesignEdited] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [aiBanner, setAiBanner] = useState(false)

  const draft = detail?.versions.find((v) => v.status === 'draft') ?? null
  const published = detail?.versions.find((v) => v.status === 'published') ?? null
  /** Bản đang hiện trong khung soạn. */
  const shown: TemplateVersionDto | null = draft ?? published ?? detail?.versions[0] ?? null
  const archived = detail?.status === 'archived'
  const locked = !draft || archived || readOnly

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
    setEditor(v?.editor ?? 'html')
    setDesign(v?.design ?? null)
    setDesignEdited(false)
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

  const designPreview = useDesignPreview(appId, editor === 'blocks' && designEdited ? design : null)
  /** HTML / chữ thường đang xem: kiểu blocks lấy bản backend vừa sinh (nếu đã sửa), không thì bản đã lưu. */
  const bodyHtml = editor === 'blocks' ? (designPreview.preview?.html ?? html) : html
  const bodyText = editor === 'blocks' ? (designPreview.preview?.text ?? text) : text

  const derived = useMemo(() => {
    const used = editor === 'blocks' && design ? usedVariablePaths(subject, ...designTexts(design)) : usedVariablePaths(subject, html, text)
    const declared = variables.map((v) => v.name)
    return {
      declared,
      /** Dùng trong nội dung mà chưa khai — có nguồn thì bấm "Khai báo" được. */
      undeclared: used.filter((p) => !declared.includes(p) && hasSource(p)),
      /** `{{ vm_name }}` — thiếu `payload.`, backend sẽ từ chối. */
      missingSource: used.filter((p) => !hasSource(p)),
      unused: declared.filter((d) => !used.includes(d)),
      previewSubject: renderPreview(subject, variables, { escape: false }),
      previewHtml: renderPreview(bodyHtml, variables, { escape: true }),
      /** Bắt buộc mới so với bản ĐANG XUẤT BẢN — app chưa gửi biến này thì mọi lần gửi bị MISSING_VARIABLE. */
      newRequired: published
        ? variables
            .filter((v) => v.required && !published.variables.some((p) => p.name === v.name && p.required))
            .map((v) => v.name)
        : [],
    }
  }, [subject, html, text, variables, published, editor, design, bodyHtml])

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

  /**
   * Lệnh chỉ đổi phần vỏ (tên / nhóm): nhận chi tiết mới nhưng GIỮ nội dung đang soạn — đổi tên giữa
   * chừng không được xoá những gì người soạn chưa lưu.
   */
  const runMeta = (op: () => Promise<ActionResult<TemplateDetailDto>>) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await op()
        if (result.ok) {
          setError(null)
          setDetail(result.data)
          resolve(true)
        } else {
          setError({ message: result.message, code: result.code, issues: result.issues ?? [] })
          resolve(false)
        }
      })
    })

  const content = (): TemplateContentInput =>
    editor === 'blocks' && design
      ? { editor: 'blocks', subject, design, variables }
      : { editor: 'html', subject, html, text, variables }

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
    readOnly,
    dirty,
    subject,
    setSubject: edit(setSubject),
    html,
    setHtml: edit(setHtml),
    text,
    setText: edit(setText),
    editor,
    design,
    /** Sửa thiết kế kéo-thả — mọi phép sửa cây trả bản mới (`lib/email-design.ts`). */
    setDesign: (next: EmailDesign) => {
      setDesign(next)
      setDesignEdited(true)
      setDirty(true)
    },
    /** Chữ thường đang xem — kiểu blocks là bản backend sinh, chỉ đọc. */
    bodyText,
    designPreview,
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
    rename: (name: string) => runMeta(() => updateTemplateAction(appId, templateId, { name })),
    changeCategory: (category: TemplateCategory) => runMeta(() => updateTemplateAction(appId, templateId, { category })),
    /** Nhân bản thành template mới — trả id bản sao (null = lỗi, đã hiện ở `error`). */
    duplicate: (name: string) =>
      new Promise<string | null>((resolve) => {
        startTransition(async () => {
          const result = await duplicateTemplateAction(appId, templateId, name)
          if (result.ok) {
            setError(null)
            resolve(result.data.id)
          } else {
            setError({ message: result.message, code: result.code, issues: result.issues ?? [] })
            resolve(null)
          }
        })
      }),
    archive: () => run(() => archiveTemplateAction(appId, templateId)),
    /** "Chuyển sang HTML": lưu nháp đang soạn rồi chuyển — một chiều, bản đã xuất bản không đổi. */
    convertToHtml: () => run(() => convertToHtmlAction(appId, templateId, content())),
    /**
     * Hỏi AI một đề xuất — KHÔNG đụng ô soạn. Gửi biến đã khai (tên / bắt buộc / mô tả), không gửi giá
     * trị mẫu; `revise` gửi kèm nội dung đang soạn (có thể chưa lưu).
     */
    aiCompose: (instruction: string, mode: 'new' | 'revise'): Promise<ActionResult<AiComposeResultDto>> =>
      aiComposeAction(appId, templateId, {
        instruction,
        mode,
        variables: variables.map((v) => ({
          name: v.name,
          required: v.required,
          ...(v.description ? { description: v.description } : {}),
        })),
        ...(mode === 'revise' ? { current: { subject, html, text } } : {}),
      }),
    /**
     * "Dùng bản này": điền đề xuất vào ô soạn + thêm các biến AI đề xuất mà người soạn ĐÃ TICK (bỏ qua
     * biến đã có) — chưa lưu, người soạn tự Lưu nháp / Xuất bản.
     */
    applyAi: (content: { subject: string; html: string; text: string }, addVariables: readonly AiSuggestedVariableDto[] = []) => {
      setVariables((vs) => [
        ...vs,
        ...addVariables
          .filter((a) => !vs.some((v) => v.name === a.name))
          .map((a) => ({ ...a, source: 'payload' as const })),
      ])
      setSubject(content.subject)
      setHtml(content.html)
      setText(content.text)
      setDirty(true)
      setAiBanner(true)
    },
  }
}

export type TemplateEditorState = ReturnType<typeof useTemplateEditor>
