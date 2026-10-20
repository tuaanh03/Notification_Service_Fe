'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Component, Editor } from 'grapesjs'
import { AlertTriangle, Braces, ChevronDown, Plus, SlidersHorizontal, Undo2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import 'grapesjs/dist/css/grapes.min.css'
import './visual-editor.css'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { variableLabel } from '@/lib/variable-labels'
import { starterMjml } from '@/lib/visual-design'
import { lintBlocks, markBlocks, type BlockIssue } from './block-lint'
import { appendBlock, imageDefaultsPlugin, registerBlocks, type BlockKind, type BlockTexts } from './blocks'
import { chipifyText, chipPlugin, repaintChips, requestChipInsert, type ChipOptions, type VariableRequest } from './chip-plugin'
import { applySettings, applySettingsTo, readSettings, SETTINGS_KEY, type EmailSettings } from './email-settings'
import { grapesMessages } from './grapes-i18n'
import { InsertVariableDialog } from './insert-variable-dialog'
import { insertTarget } from './insert-target'
import { LeftPanel } from './left-panel'
import { PropertiesPanel } from './properties-panel'

/** Thiết bị xem trên khung soạn — id của DeviceManager mặc định của GrapesJS. */
export type VisualDevice = 'desktop' | 'mobilePortrait'

/** Nút ở thanh trên của màn soạn điều khiển bộ soạn qua đây. */
export type VisualControls = { undo: () => void; redo: () => void }
export type VisualHistory = { canUndo: boolean; canRedo: boolean }

/** Màu chip / viền lỗi lấy từ token console lúc chạy — khung thư là iframe, không đọc được biến CSS của console. */
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

/** Bàn phím ảo đang mở (điện thoại): vùng nhìn thấy thấp hơn cửa sổ đáng kể. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const check = () => setOpen(window.innerHeight - vv.height > 150)
    vv.addEventListener('resize', check)
    return () => vv.removeEventListener('resize', check)
  }, [])
  return open
}

/** Yêu cầu đang mở hộp "Chèn biến": từ thanh định dạng (chèn chip) hoặc từ ô link ở bảng phải. */
type OpenRequest = { kind: 'chip'; request: VariableRequest } | { kind: 'link'; apply: (path: string, fallback: string | null) => void }

/**
 * Bộ soạn trực quan (GrapesJS + grapesjs-mjml, ADR-0036 của backend). Nạp ĐỘNG, chỉ ở trình duyệt
 * (`visual-editor-loader.tsx` dùng `next/dynamic` + `ssr: false`) — gói ~650 KB không vào trang khác.
 *
 * Khung giữa là thư thật: gõ chữ trực tiếp, thanh định dạng nổi (+ nút "Chèn biến"), hoàn tác / làm lại.
 * Bảng trái (Khối / Bố cục / Cài đặt thư) và bảng phải (thuộc tính theo loại khối) là của console, dựng bằng
 * component Cosmic, đọc / ghi qua API của GrapesJS — bảng mặc định của GrapesJS không dùng (`custom: true`).
 * Lỗi từng khối (biến chưa khai, link sai, ảnh không https) tô viền đỏ trên khung + danh sách bấm được.
 *
 * Lúc lưu, hook đọc `snapshot()`: HTML do grapesjs-mjml sinh + MJML + JSON dự án (kèm "Cài đặt thư"). Backend
 * kiểm HTML rồi mới lưu.
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
  const [editor, setEditor] = useState<Editor | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [selected, setSelected] = useState<Component | null>(null)
  /** Tăng mỗi lần thư đổi — bảng phải / danh sách lỗi vẽ lại theo. */
  const [tick, setTick] = useState(0)
  const [settings, setSettings] = useState<EmailSettings>(() => readSettings(ed.visualDesign?.project))
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const [open, setOpen] = useState<OpenRequest | null>(null)
  /** Việc làm khi hộp "Chèn biến" đã đóng hẳn (hộp còn mở thì giữ focus — chèn sớm là mất con trỏ). */
  const afterClose = useRef<(() => void) | null>(null)
  const chipOptionsRef = useRef<ChipOptions | null>(null)
  /** Điện thoại (< md): bảng trái / phải mở thành tấm trượt từ dưới lên. */
  const [sheet, setSheet] = useState<'blocks' | 'props' | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const keyboardOpen = useKeyboardOpen()

  const texts: BlockTexts = useMemo(
    () => ({ heading: t('sampleHeading'), text: t('sampleText'), button: t('sampleButton'), imageAlt: t('sampleImageAlt'), column: t('sampleColumn') }),
    [t],
  )
  const labels: Record<BlockKind, string> = useMemo(
    () => ({
      heading: t('blockHeading'),
      text: t('blockText'),
      button: t('blockButton'),
      image: t('blockImage'),
      divider: t('blockDivider'),
      spacer: t('blockSpacer'),
      col1: t('blockCol1'),
      col2: t('blockCol2'),
      col3: t('blockCol3'),
      col12: t('blockCol12'),
      col21: t('blockCol21'),
    }),
    [t],
  )

  // Hàm đọc nhãn dùng giá trị MỚI NHẤT mà không dựng lại bộ soạn mỗi lần bảng biến đổi.
  const labelOfRef = useRef<(path: string) => string | null>(() => null)
  labelOfRef.current = (path: string) => {
    const v = ed.variables.find((x) => x.name === path)
    return v ? variableLabel(v) : null
  }
  const latest = useRef({ ed, onControls, onHistory, texts })
  latest.current = { ed, onControls, onHistory, texts }

  // Dựng bộ soạn MỘT lần cho mỗi bản đang soạn (component được key theo id bản nháp ở chỗ gọi).
  useEffect(() => {
    let cancelled = false
    let instance: Editor | null = null
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
        onRequestVariable: (request) => setOpen({ kind: 'chip', request }),
        onCaret: () => insertTarget.mark('body'),
      }
      chipOptionsRef.current = chipOptions
      const project = latest.current.ed.visualDesign?.project
      const hasProject = project !== undefined && Object.keys(project).length > 0
      // Không có dự án mà có MJML (dữ liệu dựng ngoài bộ soạn) thì nạp MJML; không có gì thì thư mở đầu.
      const savedMjml = latest.current.ed.visualDesign?.mjml.trim() ?? ''
      instance = grapesjs.init({
        container: canvasRef.current,
        height: '100%',
        width: 'auto',
        fromElement: false,
        storageManager: false,
        // Tắt gửi thống kê về app.grapesjs.com (mặc định bật: domain + phiên bản) — console không gọi dịch vụ ngoài.
        telemetry: false,
        // Không tải Font Awesome từ cdnjs — biểu tượng cần dùng vẽ bằng SVG tại chỗ (`visual-editor.css`).
        cssIcons: '',
        // Không dùng thanh nút / bảng mặc định của GrapesJS — bảng của console tự dựng (custom: true).
        panels: { defaults: [] },
        blockManager: { custom: true },
        traitManager: { custom: true },
        styleManager: { custom: true },
        layerManager: { custom: true },
        selectorManager: { componentFirst: true, custom: true },
        // Ảnh chỉ dán link https:// ở bảng phải — tắt hẳn tải lên / kéo file vào (người dùng đã bỏ tải ảnh).
        assetManager: { upload: false, dropzone: false, embedAsBase64: false },
        canvas: { allowExternalDrop: false },
        i18n: {
          locale: locale === 'vi' ? 'vi' : 'en',
          localeFallback: 'en',
          detectLocale: false,
          messages: grapesMessages(viModule.default),
        },
        plugins: [
          // Bộ khối mặc định của grapesjs-mjml tắt hết — khối của mình ở `blocks.ts` (chữ mẫu tiếng Việt).
          (e: Editor) => mjmlPlugin(e, { blocks: [], fonts: {} }),
          imageDefaultsPlugin,
          chipPlugin(chipOptions),
        ],
        ...(hasProject
          ? { projectData: project }
          : { components: savedMjml || starterMjml({ heading: t('starterHeading'), body: t('starterBody') }) }),
      })

      instance.onReady(() => {
        if (cancelled || !instance) return
        const e = instance
        // grapesjs-mjml tự thêm thanh nút (thiết bị, xem / nhập MJML…) — gỡ hết, nút của mình ở thanh trên màn soạn.
        e.Panels.getPanels().reset([])
        // Bấm đúp vào ảnh mặc định mở hộp chọn ảnh của GrapesJS — tắt: link ảnh dán ở bảng phải.
        e.Commands.add('core:open-assets', { run: () => undefined } as unknown as Parameters<typeof e.Commands.add>[1])
        registerBlocks(e, latest.current.texts, labels)
        // Thư cũ / MJML chuyển sang còn `{{ … }}` thô -> chip.
        for (const type of ['mj-text', 'mj-button']) for (const c of e.getWrapper()?.findType(type) ?? []) chipifyText(c)
        e.setDevice(device)
        const history = () => {
          latest.current.onHistory({ canUndo: e.UndoManager.hasUndo(), canRedo: e.UndoManager.hasRedo() })
          setCanUndo(e.UndoManager.hasUndo())
        }
        // Màn cảm ứng: chạm một lần chọn khối, chạm LẦN NỮA vào khối chữ đang chọn thì vào sửa chữ — điện thoại
        // không phải lúc nào cũng phát "bấm đúp".
        // Nhớ ngoài model (gắn vào model là lọt vào JSON dự án + báo "chưa lưu").
        const tapped = new WeakSet<Component>()
        e.Canvas.getDocument()?.addEventListener('click', (ev) => {
          if (!window.matchMedia('(pointer: coarse)').matches) return
          const target = e.getSelected()
          const type = target?.get('type')
          if (!target || (type !== 'mj-text' && type !== 'mj-button') || e.getEditing() === target) return
          if (!target.getEl()?.contains(ev.target as Node)) return
          const view = target.getView() as unknown as { onActive?: (ev?: unknown) => Promise<void> } | undefined
          if (tapped.has(target)) void view?.onActive?.(ev)
          tapped.add(target)
        })
        e.on('component:deselected', (c: Component) => tapped.delete(c))
        latest.current.onControls({ undo: () => e.UndoManager.undo(), redo: () => e.UndoManager.redo() })
        latest.current.ed.attachVisual({
          snapshot: () => {
            const mjml = e.getHtml()
            const out = e.runCommand('mjml-code-to-html', { fonts: {} }) as { html?: string } | undefined
            const projectData = e.getProjectData() as unknown as Record<string, unknown>
            return { html: out?.html ?? '', mjml, project: { ...projectData, [SETTINGS_KEY]: settingsRef.current } }
          },
          markSaved: () => e.clearDirtyCount(),
        })
        e.on('component:toggled', () => setSelected(e.getSelected() ?? null))
        // Khối kéo từ bảng trái vào nhận "Cài đặt thư" hiện tại (font, màu chữ, màu nút).
        e.on('block:drag:stop', (added: Component | Component[] | undefined) => {
          for (const c of [added].flat()) if (c) applySettingsTo(c, settingsRef.current)
        })
        // Bỏ các thay đổi do chính lúc nạp sinh ra; từ đây mỗi thay đổi thật báo "chưa lưu".
        setTimeout(() => {
          if (cancelled) return
          e.clearDirtyCount()
          e.UndoManager.clear()
          history()
          let timer: ReturnType<typeof setTimeout> | undefined
          let frame = 0
          e.on('update', () => {
            history()
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => setTick((n) => n + 1))
            if (e.getDirtyCount() === 0) return
            clearTimeout(timer)
            timer = setTimeout(() => latest.current.ed.onVisualChange(e.getHtml()), 300)
          })
          e.on('undo redo', history)
          setEditor(e)
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
      instance?.destroy()
      setEditor(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dựng một lần; thiết bị / nhãn đổi được xử lý riêng ở dưới
  }, [])

  useEffect(() => {
    editor?.setDevice(device)
  }, [editor, device])

  // Bảng biến đổi (thêm mô tả, khai biến mới) -> vẽ lại nhãn chip.
  const labelKey = ed.variables.map((v) => `${v.name}:${v.description ?? ''}:${v.required}`).join('|')
  useEffect(() => {
    if (editor) repaintChips(editor, (path) => labelOfRef.current(path), chipColors())
  }, [editor, labelKey])

  // Lỗi từng khối: chạy lại khi thư đổi / bảng biến đổi; tô viền đỏ trên khung.
  const issues: BlockIssue[] = useMemo(
    () => (editor ? lintBlocks(editor, ed.variables) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` là tín hiệu "thư đã đổi"
    [editor, tick, labelKey],
  )
  useEffect(() => markBlocks(issues, chipColors().problemText), [issues])

  const changeSettings = useCallback(
    (patch: Partial<EmailSettings>) => {
      if (!editor) return
      const next = { ...settingsRef.current, ...patch }
      setSettings(next)
      settingsRef.current = next
      applySettings(editor, next, Object.keys(patch) as (keyof EmailSettings)[])
    },
    [editor],
  )

  /** "Chèn biến" của thanh dưới: vào ô tiêu đề hoặc khối chữ người soạn vừa đặt con trỏ; không có chỗ thì báo nhẹ. */
  const insertVariableMobile = () => {
    if (insertTarget.last() === 'subject' && insertTarget.openSubject()) return
    if (editor && chipOptionsRef.current && requestChipInsert(editor, chipOptionsRef.current)) return
    toast(t('mobileInsertHint'))
  }

  if (failed) {
    return (
      <p className="p-6 text-sm text-[var(--supernova)]" data-testid="visual-editor-failed">
        {t('loadFailed', { message: failed })}
      </p>
    )
  }

  return (
    <div className="visual-editor grid h-full min-h-0 grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)_17rem]" data-testid="visual-editor">
      <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--orbit)] bg-[var(--deep)] md:block">
        {editor && (
          <LeftPanel
            editor={editor}
            labels={labels}
            settings={settings}
            onAdd={(kind) => appendBlock(editor, kind, texts, settingsRef.current)}
            onSettings={changeSettings}
          />
        )}
      </aside>
      <div className="relative flex min-h-0 flex-col bg-[var(--void)]">
        {issues.length > 0 && editor && <IssuesBar issues={issues} editor={editor} variables={ed.variables} />}
        {!editor && <p className="absolute inset-0 z-10 grid place-items-center text-sm text-[var(--text-muted)]">{t('loading')}</p>}
        <div ref={canvasRef} className="min-h-0 flex-1" />
        {editor && (
          // Điện thoại: thanh dưới 4 nút thay cho hai bảng (bản phác DienThoai).
          // DÍNH ĐÁY khung nhìn (fixed), chừa vùng an toàn của iPhone; z thấp hơn Sheet / Dialog (z-[100]). Bàn phím ảo mở
          // thì ẩn — khỏi đè lên chỗ đang gõ. Khoảng chừa bên dưới (`h-[…]`) để thanh không che phần cuối thư.
          <>
          <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] flex-none md:hidden" />
          {/* Qua portal vào <body>: tổ tiên trong console (Panel có backdrop-filter, motion có transform) làm `fixed`
              bám theo nó thay vì khung nhìn (CLAUDE.md: overlay -> createPortal(document.body)). */}
          {createPortal(
            <nav
              className={cn(
                'fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[var(--orbit)] bg-[var(--deep)] pb-[env(safe-area-inset-bottom)] shadow-[var(--glow-panel)] md:hidden',
                keyboardOpen && 'hidden',
              )}
              aria-label={t('mobileToolbar')}
              data-testid="visual-mobile-bar"
            >
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-none text-[11px]" onClick={() => setSheet('blocks')} data-testid="mobile-add">
                <Plus className="text-[var(--starlight)]" /> {t('mobileAdd')}
              </Button>
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-none text-[11px]" onClick={insertVariableMobile} data-testid="mobile-insert">
                <Braces className="text-[var(--starlight)]" /> {t('insertVariable')}
              </Button>
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-none text-[11px]" onClick={() => setSheet('props')} data-testid="mobile-props">
                <SlidersHorizontal className="text-[var(--starlight)]" /> {t('mobileProps')}
              </Button>
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-none text-[11px]" disabled={!canUndo} onClick={() => editor.UndoManager.undo()} data-testid="mobile-undo">
                <Undo2 /> {t('mobileUndo')}
              </Button>
            </nav>,
            document.body,
          )}
          </>
        )}
      </div>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--orbit)] bg-[var(--deep)] md:block">
        {editor && (
          <PropertiesPanel
            // Đổi khối thì dựng lại bảng; cùng khối thì chỉ vẽ lại (giữ hộp chọn màu đang mở).
            key={selected?.getId() ?? 'none'}
            editor={editor}
            selected={selected}
            variables={ed.variables}
            settings={settings}
            onRequestLinkVariable={(apply) => setOpen({ kind: 'link', apply })}
          />
        )}
      </aside>
      {editor && (
        <Sheet open={sheet !== null} onOpenChange={(next) => !next && setSheet(null)}>
          <SheetContent side="bottom" showCloseButton={false} className="z-[100] max-h-[80dvh] gap-0 overflow-y-auto rounded-t-2xl p-0 md:hidden" data-testid="visual-sheet">
            <SheetHeader className="flex-row items-center border-b border-[var(--orbit)] px-4 py-2">
              <SheetTitle className="flex-1 text-sm">{sheet === 'blocks' ? t('mobileAdd') : t('mobileProps')}</SheetTitle>
              <Button variant="ghost" size="icon-sm" aria-label={t('mobileClose')} onClick={() => setSheet(null)}>
                <X />
              </Button>
            </SheetHeader>
            {sheet === 'blocks' && (
              <LeftPanel
                editor={editor}
                labels={labels}
                settings={settings}
                onAdd={(kind) => {
                  appendBlock(editor, kind, texts, settingsRef.current)
                  setSheet(null)
                }}
                onSettings={changeSettings}
              />
            )}
            {sheet === 'props' && (
              <PropertiesPanel
                key={selected?.getId() ?? 'none'}
                editor={editor}
                selected={selected}
                variables={ed.variables}
                settings={settings}
                onRequestLinkVariable={(apply) => setOpen({ kind: 'link', apply })}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
      <InsertVariableDialog
        open={open !== null}
        ed={ed}
        onInsert={(path, fallback) => {
          const current = open
          afterClose.current = () => (current?.kind === 'chip' ? current.request.insert(path, fallback) : current?.apply(path, fallback))
          setOpen(null)
        }}
        onClose={() => {
          const current = open
          afterClose.current = () => current?.kind === 'chip' && current.request.cancel()
          setOpen(null)
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

function issueText(t: ReturnType<typeof useTranslations<'visualEditor'>>, issue: BlockIssue, name: string): string {
  switch (issue.code) {
    case 'VARIABLE_NOT_DECLARED':
      return t('issueVariableNotDeclared', { name })
    case 'VARIABLE_MISSING_SOURCE':
      return t('issueVariableMissingSource', { name })
    case 'USER_VARIABLE_NOT_SUPPORTED':
      return t('issueUserVariable', { name })
    case 'OPTIONAL_VARIABLE_WITHOUT_DEFAULT':
      return t('issueOptionalWithoutDefault', { name })
    case 'LINK_EMPTY':
      return t('issueLinkEmpty')
    case 'LINK_SCHEME_NOT_ALLOWED':
      return t('issueLinkScheme', { value: issue.detail })
    case 'IMAGE_EMPTY':
      return t('issueImageEmpty')
    case 'IMAGE_URL_NOT_ALLOWED':
      return t('issueImageUrl')
  }
}

/** Danh sách lỗi từng khối, thu gọn được; bấm một dòng thì chọn đúng khối đó trên khung. */
function IssuesBar({ issues, editor, variables }: { issues: readonly BlockIssue[]; editor: Editor; variables: TemplateEditorState['variables'] }) {
  const t = useTranslations('visualEditor')
  const label = (path: string) => {
    const v = variables.find((x) => x.name === path)
    return v ? variableLabel(v) : path
  }
  return (
    <Collapsible className="border-b border-[var(--supernova)]/30 bg-[var(--supernova)]/5 px-3 py-2" data-testid="visual-issues">
      <CollapsibleTrigger className="group/iss flex w-full items-center gap-2 text-left text-xs font-semibold text-[var(--supernova)]">
        <AlertTriangle className="size-4" aria-hidden />
        <span className="flex-1">{t('issuesTitle', { count: issues.length })}</span>
        <ChevronDown className="size-4 transition-transform group-data-[panel-open]/iss:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {issues.map((issue, i) => (
            <li key={`${issue.component.getId()}:${issue.code}:${i}`}>
              <Button
                variant="ghost"
                size="xs"
                className="h-auto w-full justify-start px-2 py-1 text-left text-xs font-normal whitespace-normal text-[var(--text-primary)]"
                onClick={() => {
                  editor.select(issue.component)
                  editor.Canvas.scrollTo(issue.component, { behavior: 'smooth' })
                }}
                data-testid="visual-issue"
              >
                {issueText(t, issue, label(issue.detail))}
              </Button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
