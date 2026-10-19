'use client'
import { useState, useTransition } from 'react'
import { ArrowLeft, Code2, FilePlus2, LayoutTemplate } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createTemplateAction } from '@/app/templates/actions'
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
import { isTemplateCategory, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/template-categories'
import { PresetGallery } from './preset-gallery'

/**
 * Tạo template, hai bước: chọn "Bắt đầu từ trống" hoặc một mẫu dựng sẵn (ADR-0035 — `<PresetGallery>`), rồi
 * với trang trắng thì điền form dưới đây. Mẫu đi thẳng từ hộp xem trước sang màn soạn.
 *
 * Trang trắng: chỉ cần TÊN (+ nhóm, mặc định "Khác"; kiểu soạn, mặc định Kéo-thả — ADR-0034). Backend tạo kèm bản nháp v1 rỗng, trả `id` — soạn tiếp ở màn chi tiết.
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
        <Panel className="max-w-xl space-y-4 p-5">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setBlank(false)} data-testid="back-to-presets">
            <ArrowLeft /> {tp('back')}
          </Button>
          {error && (
            <Alert variant="destructive" className="bg-[var(--supernova)]/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) create()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-tpl-name" className="text-xs font-semibold">{tt('name')}</Label>
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
              <p className="text-[11px] text-[var(--text-muted)]">{tt('nameHint')}</p>
            </div>
            <div className="space-y-1.5">
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
              >
                <ToggleGroupItem value="blocks" className="gap-1.5 text-xs" data-testid="editor-blocks">
                  <LayoutTemplate className="size-3.5" /> {tt('editorBlocks')}
                </ToggleGroupItem>
                <ToggleGroupItem value="html" className="gap-1.5 text-xs" data-testid="editor-html">
                  <Code2 className="size-3.5" /> {tt('editorHtml')}
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-[11px] text-[var(--text-muted)]">{editor === 'blocks' ? tt('editorBlocksHint') : tt('editorHtmlHint')}</p>
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
