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
import { BlockEditor } from './blocks/block-editor'
import { EditorPane, Highlight } from './editor-pane'
import { FieldHint } from './field-hint'
import { PreviewPane } from './preview-pane'

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
}: {
  ed: TemplateEditorState
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
  const blocks = ed.editor === 'blocks'
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

      {blocks ? (
        <>
          <Panel className="h-[720px] min-w-0 overflow-hidden p-0">
            <BlockEditor ed={ed} locked={ed.locked} />
          </Panel>
          <div className="cosmic-surface h-[640px] overflow-hidden rounded-2xl border border-[var(--orbit)] shadow-xs">
            <PreviewPane ed={ed} />
          </div>
        </>
      ) : (
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
                <FieldHint text={blocks ? t('textAuto') : t('textHint')} label={t('hintFor', { field: t('text') })} />
              </div>
              {/* Kiểu kéo-thả: bản chữ thường do backend sinh từ các khối — chỉ đọc. */}
              <Textarea
                id="tpl-text"
                value={blocks ? ed.bodyText : ed.text}
                onChange={(e) => ed.setText(e.target.value)}
                className="min-h-20 font-mono text-xs"
                disabled={ed.locked}
                readOnly={blocks}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
