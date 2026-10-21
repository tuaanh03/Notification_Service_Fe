'use client'
import { useMemo, useState } from 'react'
import { FilePlus2, RotateCcw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { presetErrorOf, presetsOf, useTemplatePresets } from '@/hooks/use-template-presets'
import { toLocale } from '@/i18n/locales'
import type { TemplatePresetDto } from '@/lib/api/types'
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/template-categories'
import { renderPreview } from '@/lib/template-syntax'
import { PresetDialog } from './preset-dialog'
import { emailDocument } from './preview-pane'

const ALL = 'all'

/**
 * Bước chọn trước của màn Tạo template (ADR-0035 của backend): ô "Bắt đầu từ trống" + lưới mẫu dựng sẵn lọc
 * theo nhóm. Thẻ mẫu theo ngôn ngữ màn hình; bấm thẻ mở hộp xem trước để chọn ngôn ngữ thư + tên rồi "Dùng mẫu".
 * Chỉ hiện nút lọc của nhóm có mẫu — nhóm rỗng chỉ làm người dùng bấm vào chỗ trống.
 */
export function PresetGallery({ onBlank }: { onBlank: () => void }) {
  const t = useTranslations('templatePresets')
  const te = useTranslations('errors')
  const tcat = useTranslations('templateCategory')
  const locale = toLocale(useLocale())
  const library = useTemplatePresets(locale)
  const presets = presetsOf(library.state[locale])
  const error = presetErrorOf(library.state[locale])
  const [category, setCategory] = useState<TemplateCategory | typeof ALL>(ALL)
  const [open, setOpen] = useState<TemplatePresetDto | null>(null)

  const categories = useMemo(
    () => TEMPLATE_CATEGORIES.filter((c) => presets?.some((p) => p.category === c)),
    [presets],
  )
  const shown = presets?.filter((p) => category === ALL || p.category === category) ?? []

  return (
    <div className="space-y-4" data-testid="preset-gallery">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--text-primary)]">{t('chooseTitle')}</h2>
          <p className="text-xs text-[var(--text-muted)]">{t('chooseHint')}</p>
        </div>
        {categories.length > 0 && (
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[category]}
            onValueChange={(v) => {
              const next = v[0]
              if (next === ALL) setCategory(ALL)
              else {
                const c = TEMPLATE_CATEGORIES.find((x) => x === next)
                if (c) setCategory(c)
              }
            }}
            className="h-auto flex-wrap"
            aria-label={t('filter')}
          >
            <ToggleGroupItem value={ALL} className="text-xs">{t('all')}</ToggleGroupItem>
            {categories.map((c) => (
              <ToggleGroupItem key={c} value={c} className="text-xs" data-testid={`preset-filter-${c}`}>{tcat(c)}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-[var(--supernova)]/10">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {t('loadFailed')} — {te('withCode', { message: error.message, code: error.code })}
            <Button size="xs" variant="outline" onClick={() => library.load(locale, true)}>
              <RotateCcw /> {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={onBlank}
          className="cosmic-surface flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center transition-colors hover:bg-[var(--starlight)]/5 focus-visible:outline-2 focus-visible:outline-[var(--starlight)]"
          data-testid="preset-blank"
        >
          <FilePlus2 className="size-7 text-[var(--starlight)]" aria-hidden="true" />
          <span className="font-heading text-sm font-semibold text-[var(--text-primary)]">{t('blankTitle')}</span>
          <span className="text-xs text-[var(--text-muted)]">{t('blankBody')}</span>
        </button>

        {presets === null && !error && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="min-h-[280px] rounded-2xl" />)}

        {shown.map((p) => (
          <PresetCard key={p.id} preset={p} categoryLabel={tcat(p.category)} onOpen={() => setOpen(p)} />
        ))}
      </div>
      {presets !== null && shown.length === 0 && <p className="text-xs text-[var(--text-muted)]">{t('emptyCategory')}</p>}

      <PresetDialog
        key={open?.id ?? 'none'}
        preset={open}
        library={library}
        screenLocale={locale}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}

/** Thẻ mẫu: ảnh thu nhỏ (thư thật, thu nhỏ — iframe không chạy script) + tên + mô tả + nhóm. */
function PresetCard({ preset, categoryLabel, onOpen }: { preset: TemplatePresetDto; categoryLabel: string; onOpen: () => void }) {
  return (
    <Panel className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col text-left transition-colors hover:bg-[var(--starlight)]/5 focus-visible:outline-2 focus-visible:outline-[var(--starlight)]"
        data-testid={`preset-card-${preset.id}`}
      >
        <PresetThumbnail preset={preset} />
        <div className="space-y-1.5 border-t border-[var(--orbit)] p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="font-heading text-sm font-semibold text-[var(--text-primary)]">{preset.name}</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">{categoryLabel}</Badge>
          </div>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">{preset.description}</p>
        </div>
      </button>
    </Panel>
  )
}

/** Khung 640px (thư 600px + lề, đủ để hàng 2 cột không xếp chồng) thu còn ~45%; `pointer-events-none` để cả thẻ là một nút bấm. */
function PresetThumbnail({ preset }: { preset: TemplatePresetDto }) {
  const t = useTranslations('templatePresets')
  return (
    <div className="relative h-[180px] w-full overflow-hidden bg-[var(--void)]" aria-hidden="true">
      <iframe
        srcDoc={emailDocument(renderPreview(preset.html, preset.variables, { escape: true }), '')}
        title={t('thumbnail', { name: preset.name })}
        sandbox=""
        tabIndex={-1}
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[640px] origin-top -translate-x-1/2 scale-[0.45] border-0"
      />
    </div>
  )
}
