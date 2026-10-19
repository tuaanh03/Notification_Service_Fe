'use client'
import { useEffect, useState, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, Code2, FilePlus2, LayoutTemplate, MousePointerClick, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createTemplateAction, loadTemplateEditorOptionsAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TEMPLATE_EDITORS, type TemplateEditor } from '@/lib/email-design'
import { cn } from '@/lib/utils'
import { isTemplateCategory, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/template-categories'
import { FieldHint } from './field-hint'
import { PresetGallery } from './preset-gallery'

/**
 * Các kiểu soạn, hiện thành thẻ lớn — thẻ đang chọn có viền sáng + dấu tích, không chỉ đổi màu nền. "Trực quan"
 * (ADR-0036) chỉ hiện khi Super Admin bật cờ `templates.visual_editor_enabled`.
 */
const EDITOR_CHOICES: ReadonlyArray<{
  value: TemplateEditor
  icon: LucideIcon
  label: 'editorBlocks' | 'editorHtml' | 'editorVisual'
  hint: 'editorBlocksHint' | 'editorHtmlHint' | 'editorVisualHint'
}> = [
  { value: 'visual', icon: MousePointerClick, label: 'editorVisual', hint: 'editorVisualHint' },
  { value: 'blocks', icon: LayoutTemplate, label: 'editorBlocks', hint: 'editorBlocksHint' },
  { value: 'html', icon: Code2, label: 'editorHtml', hint: 'editorHtmlHint' },
]

/**
 * Tạo template, hai bước: chọn "Bắt đầu từ trống" hoặc một mẫu dựng sẵn (ADR-0035 — `<PresetGallery>`), rồi
 * với trang trắng thì điền form dưới đây. Mẫu đi thẳng từ hộp xem trước sang màn soạn.
 *
 * Trang trắng: chỉ cần TÊN (+ nhóm, mặc định "Khác"; kiểu soạn, mặc định Kéo-thả — ADR-0034; "Trực quan"
 * khi cờ bật — ADR-0036). Backend tạo kèm bản nháp v1 rỗng, trả `id` — soạn tiếp ở màn chi tiết.
 * Không có ô "mã template (key)": app gửi bằng `templateId` do hệ thống sinh (ADR-0020).
 */
export function TemplateCreate() {
  const tt = useTranslations('templates')
  const te = useTranslations('errors')
  const tcat = useTranslations('templateCategory')
  const tp = useTranslations('templatePresets')
  const { app } = useApp()
  const router = useAppRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TemplateCategory>('other')
  const [editor, setEditor] = useState<TemplateEditor>('blocks')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [blank, setBlank] = useState(false)
  /** Cờ bộ soạn trực quan — đọc lỗi thì coi như tắt (không hiện lối tạo mà backend sẽ từ chối). */
  const [visualEnabled, setVisualEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    void loadTemplateEditorOptionsAction().then((result) => {
      if (alive && result.ok) setVisualEnabled(result.data.visualEditor)
    })
    return () => {
      alive = false
    }
  }, [])
  const choices = EDITOR_CHOICES.filter((c) => c.value !== 'visual' || visualEnabled)

  const create = () =>
    startTransition(async () => {
      const result = await createTemplateAction(app.app_id, { name: name.trim(), category, editor })
      if (result.ok) router.replace(`/templates/${result.data.id}`)
      else setError(te('withCode', { message: result.message, code: result.code }))
    })

  return (
    <>
      <PageHeader
        title={tt('newTitle')}
        breadcrumb={[{ label: tt('title'), href: '/templates' }, { label: tt('newCrumb') }]}
      />
      {!blank ? (
        <PresetGallery onBlank={() => setBlank(true)} />
      ) : (
        <Panel className="mx-auto w-full max-w-2xl space-y-5 p-6">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setBlank(false)} data-testid="back-to-presets">
            <ArrowLeft /> {tp('back')}
          </Button>
          {error && (
            <Alert variant="destructive" className="bg-[var(--supernova)]/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) create()
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="new-tpl-name" className="text-xs font-semibold">{tt('name')}</Label>
                  <FieldHint text={tt('nameHint')} label={tt('hintFor', { field: tt('name') })} />
                </div>
                <Input
                  id="new-tpl-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                  maxLength={200}
                  placeholder={tt('namePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="new-tpl-category" className="text-xs font-semibold">{tt('category')}</Label>
                <NativeSelect
                  id="new-tpl-category"
                  value={category}
                  onChange={(e) => isTemplateCategory(e.target.value) && setCategory(e.target.value)}
                  className="w-full"
                >
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <NativeSelectOption key={c} value={c}>{tcat(c)}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{tt('editorType')}</Label>
              <ToggleGroup
                variant="outline"
                value={[editor]}
                onValueChange={(v) => {
                  const next = TEMPLATE_EDITORS.find((e) => e === v[0])
                  if (next) setEditor(next)
                }}
                aria-label={tt('editorType')}
                className={cn('grid w-full grid-cols-1 gap-3', choices.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
              >
                {choices.map(({ value, icon: Icon, label, hint }) => {
                  const selected = editor === value
                  return (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      className={cn(
                        'relative h-auto flex-col items-start gap-1 rounded-xl p-4 text-left whitespace-normal aria-pressed:bg-[var(--starlight)]/10',
                        selected && 'ring-2 ring-[var(--starlight)]',
                      )}
                      data-testid={`editor-${value}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Icon className="size-4 text-[var(--starlight)]" /> {tt(label)}
                      </span>
                      <span className="text-xs font-normal text-[var(--text-secondary)]">{tt(hint)}</span>
                      {selected && (
                        <CheckCircle2 className="absolute top-3 right-3 size-4 text-[var(--starlight)]" aria-label={tt('editorChoiceSelected')} />
                      )}
                    </ToggleGroupItem>
                  )
                })}
              </ToggleGroup>
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              <FilePlus2 /> {pending ? tt('creating') : tt('createAndEdit')}
            </Button>
          </form>
        </Panel>
      )}
    </>
  )
}
