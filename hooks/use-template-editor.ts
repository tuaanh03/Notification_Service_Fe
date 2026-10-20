'use client'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  aiComposeAction,
  archiveTemplateAction,
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
import type { TemplateEditor } from '@/lib/template-editors'
import { isVisualDesign, type VisualDesign } from '@/lib/visual-design'
import type { TemplateCategory } from '@/lib/template-categories'
import { hasSource, renderPreview, sourceOf, usedVariablePaths } from '@/lib/template-syntax'

/**
 * Bộ soạn trực quan đang mở (ADR-0036) tự đăng ký vào hook bằng `attachVisual` — lúc lưu, hook hỏi nó HTML +
 * MJML + dự án hiện tại (grapesjs-mjml sinh ngay ở trình duyệt, đồng bộ).
 */
export type VisualEditorHandle = {
  snapshot: () => { html: string; mjml: string; project: Record<string, unknown> }
  /** Lưu xong: đếm lại thay đổi từ đầu (thay đổi sau đó mới là "chưa lưu"). */
  markSaved: () => void
}

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
  /** Kiểu soạn của bản đang hiện. */
  const [editor, setEditor] = useState<TemplateEditor>('html')
  /** Kiểu `visual`: dự án ĐÃ LƯU (để mở bộ soạn); nội dung đang soạn nằm trong GrapesJS, đọc qua `visualRef`. */
  const [visualDesign, setVisualDesign] = useState<VisualDesign | null>(null)
  /** MJML đang soạn (bộ soạn báo sau mỗi lần sửa) — chỉ để tìm biến chưa khai, không gửi đi. */
  const [visualMjml, setVisualMjml] = useState<string | null>(null)
  const visualRef = useRef<VisualEditorHandle | null>(null)
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
    const saved = v?.design ?? null
    setVisualDesign(isVisualDesign(saved) ? saved : null)
    setVisualMjml(null)
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
    const used =
      editor === 'visual'
        ? usedVariablePaths(subject, visualMjml ?? visualDesign?.mjml ?? html)
        : usedVariablePaths(subject, html, text)
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
  }, [subject, html, text, variables, published, editor, visualMjml, visualDesign])

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
  /** Khai biến đủ thông tin (hộp "Chèn biến" của bộ soạn trực quan): nhãn = mô tả, ví dụ = giá trị mẫu. Đã có thì thôi. */
  const addVariable = (variable: TemplateVariableDto) => {
    setVariables((vs) => (vs.some((v) => v.name === variable.name) ? vs : [...vs, variable]))
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
          visualRef.current?.markSaved()
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

  const content = (): TemplateContentInput => {
    if (editor === 'visual') {
      // Bộ soạn chưa nạp xong (hiếm) thì gửi lại đúng bản đã lưu — không bao giờ gửi thư rỗng thay cho thư thật.
      const snap = visualRef.current?.snapshot()
      const saved = visualDesign ?? { format: 'grapesjs-mjml' as const, version: 1 as const, project: {}, mjml: '' }
      return snap
        ? { editor: 'visual', subject, html: snap.html, design: { ...saved, project: snap.project, mjml: snap.mjml }, variables }
        : { editor: 'visual', subject, html, design: saved, variables }
    }
    return { editor: 'html', subject, html, text, variables }
  }

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
    /** Kiểu `visual`: dự án đã lưu để mở bộ soạn (null = thư mới, bộ soạn dựng thư mở đầu). */
    visualDesign,
    /** Bộ soạn trực quan gắn / gỡ mình (unmount truyền null). */
    attachVisual: (handle: VisualEditorHandle | null) => {
      visualRef.current = handle
    },
    /** Bộ soạn trực quan báo vừa có thay đổi — `mjml` để tìm biến chưa khai. */
    onVisualChange: (mjml: string) => {
      setVisualMjml(mjml)
      setDirty(true)
    },
    variables,
    updateVar,
    declareVar,
    addVariable,
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
