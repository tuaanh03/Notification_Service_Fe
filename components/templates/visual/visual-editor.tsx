'use client'
import { useEffect, useRef, useState } from 'react'
import type { Editor } from 'grapesjs'
import { useLocale, useTranslations } from 'next-intl'
import 'grapesjs/dist/css/grapes.min.css'
import './visual-editor.css'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { starterMjml } from '@/lib/visual-design'
import { chipifyText, chipPlugin, repaintChips, type ChipOptions, type VariableRequest } from './chip-plugin'
import { grapesMessages, mjmlBlockLabels } from './grapes-i18n'
import { InsertVariableDialog } from './insert-variable-dialog'

/** Thiết bị xem trên khung soạn — id của DeviceManager mặc định của GrapesJS. */
export type VisualDevice = 'desktop' | 'mobilePortrait'

/** Nút ở thanh trên của màn soạn điều khiển bộ soạn qua đây. */
export type VisualControls = { undo: () => void; redo: () => void }
export type VisualHistory = { canUndo: boolean; canRedo: boolean }

/** Màu chip lấy từ token console lúc chạy — khung thư là iframe, không đọc được biến CSS của console. */
function chipColors(): ChipOptions['colors'] {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string) => css.getPropertyValue(name).trim()
  return {
    background: token('--nebula-indigo'),
    text: token('--starlight'),
    problemBackground: token('--orbit'),
    problemText: token('--supernova'),
  }
}

/** Khối mở cho người soạn — bỏ hero / mạng xã hội / menu / HTML thô (ảnh ngoài, mã tự viết). */
const BLOCKS = ['mj-1-column', 'mj-2-columns', 'mj-3-columns', 'mj-text', 'mj-button', 'mj-image', 'mj-divider', 'mj-spacer']

/**
 * Bộ soạn trực quan (GrapesJS + grapesjs-mjml, ADR-0036 của backend). Nạp ĐỘNG, chỉ ở trình duyệt
 * (`visual-editor-loader.tsx` dùng `next/dynamic` + `ssr: false`) — gói ~650 KB không vào trang khác.
 *
 * Khung giữa là thư thật: gõ chữ trực tiếp, thanh định dạng nổi (+ nút "Chèn biến"), hoàn tác / làm lại.
 * Bảng trái (khối) và bảng phải (thuộc tính) là bảng tối thiểu của GrapesJS đã Việt hoá, CSS đè bằng token
 * Cosmic (`visual-editor.css`) — bảng tự dựng đầy đủ là UX-3. Không có nút xem / nhập mã, không tải ảnh lên.
 *
 * Lúc lưu, hook đọc `snapshot()`: HTML do grapesjs-mjml sinh + MJML + JSON dự án. Backend kiểm HTML rồi mới lưu.
 */
export default function VisualEditor({
  ed,
  device,
  onControls,
  onHistory,
}: {
  ed: TemplateEditorState
  device: VisualDevice
  onControls: (controls: VisualControls | null) => void
  onHistory: (history: VisualHistory) => void
}) {
  const t = useTranslations('visualEditor')
  const locale = useLocale()
  const canvasRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /** Hộp "Chèn biến" đang mở — giữ lời yêu cầu của lần bấm nút {x} này. */
  const [request, setRequest] = useState<VariableRequest | null>(null)
  /** Việc làm khi hộp đã đóng hẳn: chèn chip hoặc trả con trỏ (hộp còn mở thì nó giữ focus, chèn sớm là mất con trỏ). */
  const afterClose = useRef<(() => void) | null>(null)

  // Hàm đọc nhãn / màu dùng giá trị MỚI NHẤT mà không dựng lại bộ soạn mỗi lần bảng biến đổi.
  const labelOfRef = useRef<(path: string) => string | null>(() => null)
  labelOfRef.current = (path: string) => {
    const v = ed.variables.find((x) => x.name === path)
    if (!v) return null
    return v.description?.trim() || path.replace(/^(payload|user)\./, '')
  }
  const latest = useRef({ ed, onControls, onHistory })
  latest.current = { ed, onControls, onHistory }

  // Dựng bộ soạn MỘT lần cho mỗi bản đang soạn (component được key theo id version ở chỗ gọi).
  useEffect(() => {
    let cancelled = false
    let editor: Editor | null = null
    const start = async () => {
      const [{ default: grapesjs }, { default: mjmlPlugin }, viModule] = await Promise.all([
        import('grapesjs'),
        import('grapesjs-mjml'),
        import('grapesjs/locale/vi.mjs'),
      ])
      if (cancelled || !canvasRef.current) return
      const chipOptions: ChipOptions = {
        labelOf: (path) => labelOfRef.current(path),
        colors: chipColors(),
        insertTitle: t('insertVariable'),
        onRequestVariable: (next) => setRequest(next),
      }
      const project = latest.current.ed.visualDesign?.project
      const hasProject = project !== undefined && Object.keys(project).length > 0
      editor = grapesjs.init({
        container: canvasRef.current,
        height: '100%',
        width: 'auto',
        fromElement: false,
        storageManager: false,
        // Tắt gửi thống kê về app.grapesjs.com (mặc định bật: domain + phiên bản) — console không gọi dịch vụ ngoài.
        telemetry: false,
        // Không tải Font Awesome từ cdnjs — biểu tượng cần dùng vẽ bằng SVG tại chỗ (`visual-editor.css`).
        cssIcons: '',
        // Không dùng thanh nút mặc định (có "xem mã", "nhập mã") — nút của mình nằm ở thanh trên màn soạn.
        panels: { defaults: [] },
        blockManager: { appendTo: blocksRef.current ?? undefined },
        traitManager: { appendTo: traitsRef.current ?? undefined },
        styleManager: { appendTo: stylesRef.current ?? undefined },
        selectorManager: { componentFirst: true, custom: true },
        // Ảnh chỉ dán link https:// — tắt hẳn tải lên / kéo file vào (người dùng đã bỏ tải ảnh).
        assetManager: { upload: false, dropzone: false, embedAsBase64: false },
        canvas: { allowExternalDrop: false },
        i18n: {
          locale: locale === 'vi' ? 'vi' : 'en',
          localeFallback: 'en',
          detectLocale: false,
          messages: grapesMessages(viModule.default),
        },
        plugins: [
          (ed: Editor) =>
            mjmlPlugin(ed, {
              blocks: BLOCKS,
              // Không nạp font Google: backend chặn <link> / @import ngoài.
              fonts: {},
              block: (id: string) => ({ label: mjmlBlockLabels(locale)[id] ?? id }),
            }),
          chipPlugin(chipOptions),
        ],
        ...(hasProject
          ? { projectData: project }
          : { components: starterMjml({ heading: t('starterHeading'), body: t('starterBody') }) }),
      })
      editorRef.current = editor

      editor.onReady(() => {
        if (cancelled || !editor) return
        const e = editor
        // grapesjs-mjml tự thêm thanh nút (thiết bị, xem / nhập MJML…) — gỡ hết, nút của mình ở thanh trên màn soạn.
        e.Panels.getPanels().reset([])
        // Thư cũ / MJML chuyển sang còn `{{ … }}` thô -> chip.
        for (const type of ['mj-text', 'mj-button']) for (const c of e.getWrapper()?.findType(type) ?? []) chipifyText(c)
        e.setDevice(device)
        setLoading(false)
        const history = () =>
          latest.current.onHistory({ canUndo: e.UndoManager.hasUndo(), canRedo: e.UndoManager.hasRedo() })
        latest.current.onControls({ undo: () => e.UndoManager.undo(), redo: () => e.UndoManager.redo() })
        latest.current.ed.attachVisual({
          snapshot: () => {
            const mjml = e.getHtml()
            const out = e.runCommand('mjml-code-to-html', { fonts: {} }) as { html?: string } | undefined
            return { html: out?.html ?? '', mjml, project: e.getProjectData() as unknown as Record<string, unknown> }
          },
          markSaved: () => e.clearDirtyCount(),
        })
        // Bỏ các thay đổi do chính lúc nạp sinh ra; từ đây mỗi thay đổi thật báo "chưa lưu".
        setTimeout(() => {
          if (cancelled) return
          e.clearDirtyCount()
          e.UndoManager.clear()
          history()
          let timer: ReturnType<typeof setTimeout> | undefined
          e.on('update', () => {
            history()
            if (e.getDirtyCount() === 0) return
            clearTimeout(timer)
            timer = setTimeout(() => latest.current.ed.onVisualChange(e.getHtml()), 300)
          })
          e.on('undo redo', history)
        }, 300)
      })
    }
    start().catch((err: unknown) => {
      if (!cancelled) setFailed(err instanceof Error ? err.message : String(err))
    })
    return () => {
      cancelled = true
      latest.current.ed.attachVisual(null)
      latest.current.onControls(null)
      editor?.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dựng một lần; thiết bị / nhãn đổi được xử lý riêng ở dưới
  }, [])

  useEffect(() => {
    editorRef.current?.setDevice(device)
  }, [device])

  // Bảng biến đổi (thêm mô tả, khai biến mới) -> vẽ lại nhãn chip.
  const labelKey = ed.variables.map((v) => `${v.name}:${v.description ?? ''}`).join('|')
  useEffect(() => {
    const e = editorRef.current
    if (!e) return
    repaintChips(e, (path) => labelOfRef.current(path), chipColors())
  }, [labelKey])

  if (failed) {
    return (
      <p className="p-6 text-sm text-[var(--supernova)]" data-testid="visual-editor-failed">
        {t('loadFailed', { message: failed })}
      </p>
    )
  }

  return (
    <div className="visual-editor grid h-full min-h-0 grid-cols-1 md:grid-cols-[13rem_minmax(0,1fr)_16rem]" data-testid="visual-editor">
      <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--orbit)] md:block">
        <p className="px-3 pt-3 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">{t('blocks')}</p>
        <p className="px-3 pb-2 text-[11px] text-[var(--text-muted)]">{t('blocksHint')}</p>
        <div ref={blocksRef} data-testid="visual-blocks" />
      </aside>
      <div className="relative min-h-0 bg-[var(--void)]">
        {loading && <p className="absolute inset-0 grid place-items-center text-sm text-[var(--text-muted)]">{t('loading')}</p>}
        <div ref={canvasRef} className="h-full" />
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--orbit)] md:block">
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">{t('properties')}</p>
        <div ref={traitsRef} data-testid="visual-traits" />
        <div ref={stylesRef} data-testid="visual-styles" />
      </aside>
      <InsertVariableDialog
        open={request !== null}
        ed={ed}
        onInsert={(path, fallback) => {
          const current = request
          afterClose.current = () => current?.insert(path, fallback)
          setRequest(null)
        }}
        onClose={() => {
          const current = request
          afterClose.current = () => current?.cancel()
          setRequest(null)
        }}
        onClosed={() => {
          const run = afterClose.current
          afterClose.current = null
          run?.()
        }}
      />
    </div>
  )
}
