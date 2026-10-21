'use client'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { cn } from '@/lib/utils'
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
 * Tab "Soạn thư" (mặc định): tiêu đề trên cùng → khung soạn (+ xem thử, kiểu HTML) → kiểu HTML có "Nâng cao" thu gọn
 * (bản chữ thường). Tên / nhóm đổi ở bút chì cạnh tên trên thanh trên. Không có thuật ngữ lập trình viên ở đây — mã template / lời gọi API ở tab Tích hợp.
 * Biến chưa khai / viết sai vẫn báo ở đầu tab, kèm nút sang tab Biến.
 */
export function ComposeTab({
  ed,
  onAi,
  onShowVariables,
  visual,
}: {
  ed: TemplateEditorState
  visual: VisualBinding
  onAi: () => void
  onShowVariables: () => void
}) {
  const t = useTranslations('templateEditor')
  if (!ed.detail) return null
  const visualKind = ed.editor === 'visual'
  const varProblems = ed.undeclared.length + ed.missingSource.length


  return (
    <div className={cn(!visualKind && 'space-y-5')} data-testid="compose-tab">
      {varProblems > 0 && (
        <Alert className={cn('bg-[var(--supernova)]/5', visualKind && 'mx-4 my-3 w-auto lg:mx-6')} data-testid="variables-notice">
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

      {/* Kiểu HTML: bản chữ thường do người soạn tự viết. Kiểu trực quan không có khối này — bản chữ thường do backend
          sinh, tên / nhóm đổi ở bút chì cạnh tên (thanh trên) — bàn làm việc cao đúng một màn, không cuộn (UX-5C). */}
      {!visualKind && (
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
            <div className="space-y-1.5 border-t border-[var(--orbit)] p-5">
              <div className="flex items-center gap-1">
                <Label htmlFor="tpl-text" className="text-xs font-semibold">{t('text')}</Label>
                <FieldHint text={t('textHint')} label={t('hintFor', { field: t('text') })} />
              </div>
              <Textarea
                id="tpl-text"
                value={ed.text}
                onChange={(e) => ed.setText(e.target.value)}
                className="min-h-20 font-mono text-xs"
                disabled={ed.locked}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

/**
 * Kiểu trực quan (ADR-0036): một khung trọn chiều cao — tiêu đề thư ngay trên đầu, giữa là thư thật (GrapesJS).
 * Không có khung xem trước riêng. Bản chỉ đọc (không có nháp / App Viewer) hiện HTML đã lưu, không mở bộ soạn.
 *
 * Bàn làm việc (UX-5A / UX-5C): khung TRÀN MÉP, cao đúng phần khung nhìn còn lại dưới thanh dính của màn soạn (thanh trên
 * 56px điện thoại / 64px máy tính + hàng tab 44px + 1px viền dưới). Không dùng `<Panel>`: viền / bóng của `.cosmic-surface` nằm ngoài
 * layer, utility không gỡ được — khung tràn mép mà còn viền bo góc thì trông như hộp lơ lửng.
 */
function VisualFrame({ ed, visual }: { ed: TemplateEditorState; visual: VisualBinding }) {
  const t = useTranslations('templateEditor')
  // Biến trong tiêu đề hiện thành chip có nhãn như trong thư (UX-3), không lộ `{{ }}`.
  /** `card` = thẻ trên tờ thư (đang soạn); không thì dòng phía trên bản xem (chỉ đọc). */
  const subject = (card: boolean) => (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3',
        card ? 'rounded-xl border border-[var(--orbit)] bg-[var(--deep)] py-1.5 pr-1.5 pl-3 shadow-xs' : 'border-b border-[var(--orbit)] px-4 py-3',
      )}
      data-testid="subject-card"
    >
      <Label htmlFor="tpl-subject" className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">{t('subject')}</Label>
      <SubjectField ed={ed} label={t('subject')} placeholder={t('subjectPlaceholder')} bare={card} />
    </div>
  )
  return (
    <section
      className="flex h-[calc(100dvh-6.25rem-1px)] min-h-[520px] min-w-0 flex-col overflow-hidden bg-[var(--deep)] md:h-[calc(100dvh-6.75rem-1px)]"
      data-testid="visual-frame"
    >
      {ed.locked ? (
        <>
          {subject(false)}
          <div className="min-h-0 flex-1">
            <PreviewPane ed={ed} />
          </div>
        </>
      ) : (
        // Dựng lại bộ soạn khi đổi sang bản khác (vd "Sửa" tạo nháp mới) — cùng bản thì giữ nguyên lúc lưu.
        // Tiêu đề thư là thẻ ngay trên tờ thư; dòng "chân thư do hệ thống thêm" nằm dưới tờ thư, trong khung soạn.
        <VisualEditorLoader
          key={ed.draft?.id ?? 'none'}
          ed={ed}
          device={visual.device}
          onControls={visual.onControls}
          onHistory={visual.onHistory}
          subject={subject(true)}
        />
      )}
    </section>
  )
}
