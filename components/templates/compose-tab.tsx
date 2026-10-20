'use client'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { isTemplateCategory, TEMPLATE_CATEGORIES } from '@/lib/template-categories'
import { EditorPane, Highlight } from './editor-pane'
import { FieldHint } from './field-hint'
import { PreviewPane } from './preview-pane'
import type { VisualControls, VisualDevice, VisualHistory } from './visual/visual-editor'
import { SubjectField } from './visual/subject-field'
import { VisualEditorLoader } from './visual/visual-editor-loader'

/** Điều khiển bộ soạn trực quan — thiết bị / hoàn tác nằm ở thanh trên của màn soạn (`template-editor.tsx`). */
export type VisualBinding = {
  device: VisualDevice
  onControls: (controls: VisualControls | null) => void
  onHistory: (history: VisualHistory) => void
}

/**
 * Tab "Soạn thư" (mặc định): tiêu đề trên cùng → khung soạn + xem thử → "Nâng cao" thu gọn (tên, nhóm,
 * bản chữ thường). Không có thuật ngữ lập trình viên ở đây — mã template / lời gọi API ở tab Tích hợp.
 * Biến chưa khai / viết sai vẫn báo ở đầu tab, kèm nút sang tab Biến.
 */
export function ComposeTab({
  ed,
  writable,
  name,
  onNameChange,
  savedName,
  onAi,
  onShowVariables,
  visual,
}: {
  ed: TemplateEditorState
  visual: VisualBinding
  writable: boolean
  name: string
  onNameChange: (name: string) => void
  savedName: string
  onAi: () => void
  onShowVariables: () => void
}) {
  const t = useTranslations('templateEditor')
  const tcat = useTranslations('templateCategory')
  const detail = ed.detail
  if (!detail) return null
  const visualKind = ed.editor === 'visual'
  /** Bản chữ thường do backend sinh (trực quan) — chỉ đọc. */
  const autoText = visualKind
  const varProblems = ed.undeclared.length + ed.missingSource.length

  return (
    <div className="space-y-5" data-testid="compose-tab">
      {varProblems > 0 && (
        <Alert className="bg-[var(--supernova)]/5" data-testid="variables-notice">
          <AlertTriangle className="text-[var(--supernova)]" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{t('variablesNotice', { count: varProblems })}</span>
            <Button variant="outline" size="xs" onClick={onShowVariables}>
              {t('openVariables')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {visualKind ? (
        <VisualFrame ed={ed} visual={visual} />
      ) : (
      <>
      <Panel className="min-w-0 space-y-2 p-5">
        <Label htmlFor="tpl-subject" className="text-xs font-semibold">{t('subject')}</Label>
        <Input
          id="tpl-subject"
          value={ed.subject}
          onChange={(e) => ed.setSubject(e.target.value)}
          className="text-sm"
          disabled={ed.locked}
          placeholder={t('subjectPlaceholder')}
        />
        {/* Chỉ hiện dòng tô màu khi tiêu đề có biến — tiêu đề chữ thường thì không lặp lại lần hai. */}
        {ed.subject.includes('{{') && (
          <p className="font-mono text-xs" data-testid="subject-highlight">
            <Highlight text={ed.subject} declared={ed.declared} />
          </p>
        )}
      </Panel>

      <ResizablePanelGroup
        orientation="horizontal"
        style={{ height: '650px', maxHeight: '650px' }}
        className="cosmic-surface overflow-hidden rounded-2xl border border-[var(--orbit)] shadow-xs"
      >
        <ResizablePanel defaultSize={50} minSize={30} className="h-full min-w-0 overflow-hidden">
          <div className="flex h-full min-w-0 flex-col overflow-hidden p-5">
            <EditorPane ed={ed} locked={ed.locked} onAi={onAi} />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="h-full min-w-0 overflow-hidden bg-white">
          <PreviewPane ed={ed} />
        </ResizablePanel>
      </ResizablePanelGroup>
      </>
      )}

      <Collapsible className="cosmic-surface rounded-2xl border border-[var(--orbit)] shadow-xs">
        <CollapsibleTrigger
          className="group/adv flex w-full items-center gap-2 px-5 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]"
          data-testid="advanced-toggle"
        >
          <ChevronRight className="size-4 text-[var(--text-muted)] transition-transform group-data-[panel-open]/adv:rotate-90" />
          {t('advanced')}
          <span className="font-normal text-xs text-[var(--text-muted)]">{t('advancedSummary')}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-[var(--orbit)] p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="tpl-name" className="text-xs font-semibold">{t('name')}</Label>
                  <FieldHint text={t('nameHint')} label={t('hintFor', { field: t('name') })} />
                </div>
                <div className="flex gap-2">
                  <Input id="tpl-name" value={name} onChange={(e) => onNameChange(e.target.value)} disabled={ed.archived || !writable} className="text-sm" />
                  <Button
                    variant="outline"
                    disabled={!writable || ed.archived || ed.pending || !name.trim() || name.trim() === savedName}
                    onClick={() => void ed.rename(name.trim()).then((ok) => ok && toast.success(t('renamed')))}
                  >
                    {t('rename')}
                  </Button>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="tpl-category" className="text-xs font-semibold">{t('category')}</Label>
                  <FieldHint text={t('categoryHint')} label={t('hintFor', { field: t('category') })} />
                </div>
                <NativeSelect
                  id="tpl-category"
                  value={detail.category}
                  disabled={ed.archived || !writable || ed.pending}
                  onChange={(e) => {
                    const next = e.target.value
                    if (isTemplateCategory(next)) void ed.changeCategory(next).then((ok) => ok && toast.success(t('categoryChanged')))
                  }}
                  className="w-full"
                >
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <NativeSelectOption key={c} value={c}>{tcat(c)}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="tpl-text" className="text-xs font-semibold">{t('text')}</Label>
                <FieldHint text={autoText ? t('textAutoVisual') : t('textHint')} label={t('hintFor', { field: t('text') })} />
              </div>
              {/* Trực quan: bản chữ thường do backend sinh — chỉ đọc, là bản của lần lưu gần nhất. */}
              <Textarea
                id="tpl-text"
                value={ed.text}
                onChange={(e) => ed.setText(e.target.value)}
                className="min-h-20 font-mono text-xs"
                disabled={ed.locked}
                readOnly={autoText}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/**
 * Kiểu trực quan (ADR-0036): một khung trọn chiều cao — tiêu đề thư ngay trên đầu, giữa là thư thật (GrapesJS).
 * Không có khung xem trước riêng. Bản chỉ đọc (không có nháp / App Viewer) hiện HTML đã lưu, không mở bộ soạn.
 */
function VisualFrame({ ed, visual }: { ed: TemplateEditorState; visual: VisualBinding }) {
  const t = useTranslations('templateEditor')
  const tv = useTranslations('visualEditor')
  return (
    <Panel className="flex h-[calc(100dvh-12rem)] min-h-[560px] min-w-0 flex-col overflow-hidden p-0" data-testid="visual-frame">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--orbit)] px-4 py-3">
        <Label htmlFor="tpl-subject" className="shrink-0 text-xs font-semibold">{t('subject')}</Label>
        {/* Biến trong tiêu đề hiện thành chip có nhãn như trong thư (UX-3), không lộ `{{ }}`. */}
        <SubjectField ed={ed} label={t('subject')} placeholder={t('subjectPlaceholder')} />
      </div>
      <div className="min-h-0 flex-1">
        {ed.locked ? (
          <PreviewPane ed={ed} />
        ) : (
          // Dựng lại bộ soạn khi đổi sang bản khác (vd "Sửa" tạo nháp mới) — cùng bản thì giữ nguyên lúc lưu.
          <VisualEditorLoader key={ed.draft?.id ?? 'none'} ed={ed} device={visual.device} onControls={visual.onControls} onHistory={visual.onHistory} />
        )}
      </div>
      <p className="border-t border-[var(--orbit)] px-4 py-2 text-[11px] text-[var(--text-muted)]">{tv('footerNote')}</p>
    </Panel>
  )
}
