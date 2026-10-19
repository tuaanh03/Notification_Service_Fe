'use client'
import type { ReactNode } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import {
  DESIGN_ALIGNS,
  DESIGN_FONTS,
  duplicateBlock,
  duplicateRow,
  findBlock,
  removeBlock,
  removeRow,
  setColumnCount,
  updateBlock,
  updateRow,
  type DesignAlign,
  type DesignBlock,
  type DesignSettings,
  type EmailDesign,
} from '@/lib/email-design'
import type { Selection } from './block-editor'
import { FieldHint } from '../field-hint'
import { VariableField } from './variable-field'

type Props = {
  ed: TemplateEditorState
  design: EmailDesign
  locked: boolean
  selection: Selection
  onSelect: (s: Selection) => void
  onChange: (d: EmailDesign) => void
}

/** Link chỉ https / mailto / biến — luật thật kiểm lúc xuất bản ở backend; đây chỉ để nhắc sớm. */
const linkLooksWrong = (v: string) => v.trim() !== '' && !/^(https:\/\/|mailto:|\{\{)/i.test(v.trim())
const imageLooksWrong = (v: string) => v.trim() !== '' && !/^https:\/\/[^\s{}]+$/i.test(v.trim())

/** Bảng thuộc tính phải: cài đặt thư (không chọn gì) · hàng · khối đang chọn. */
export function BlockInspector({ ed, design, locked, selection, onSelect, onChange }: Props) {
  const t = useTranslations('blockEditor')
  const vars = ed.variables.map((v) => v.name)

  let body: ReactNode
  let title: string
  if (selection.kind === 'block') {
    const found = findBlock(design, selection.blockId)
    if (!found) {
      title = t('settingsTitle')
      body = <SettingsForm settings={design.settings} locked={locked} onChange={(s) => onChange({ ...design, settings: s })} />
    } else {
      const block = found.block
      title = t(block.type)
      body = (
        <>
          <BlockForm block={block} vars={vars} locked={locked} textColor={design.settings.textColor} onPatch={(p) => onChange(updateBlock(design, block.id, p))} />
          {!locked && (
            <div className="flex gap-2 border-t border-[var(--orbit)] pt-3">
              <Button variant="outline" size="sm" onClick={() => onChange(duplicateBlock(design, block.id))}>
                <Copy /> {t('duplicateBlock')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[var(--supernova)]"
                onClick={() => {
                  onChange(removeBlock(design, block.id))
                  onSelect({ kind: 'settings' })
                }}
              >
                <Trash2 /> {t('deleteBlock')}
              </Button>
            </div>
          )}
        </>
      )
    }
  } else if (selection.kind === 'row' && design.rows.some((r) => r.id === selection.rowId)) {
    const row = design.rows.find((r) => r.id === selection.rowId)!
    title = t('rowTitle')
    body = (
      <>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label className="text-[11px] font-semibold">{t('columnsLabel')}</Label>
            <FieldHint text={t('columnsHint')} label={t('hintFor', { field: t('columnsLabel') })} />
          </div>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[String(row.columns.length)]}
            disabled={locked}
            onValueChange={(v) => v[0] && onChange(setColumnCount(design, row.id, Number(v[0])))}
          >
            {[1, 2, 3].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="font-mono text-xs">{n}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <ColorField
          id="row-bg"
          label={t('rowBackground')}
          value={row.backgroundColor ?? design.settings.contentBackgroundColor}
          disabled={locked}
          onChange={(c) => onChange(updateRow(design, row.id, { backgroundColor: c }))}
          onReset={row.backgroundColor ? () => onChange(updateRow(design, row.id, { backgroundColor: undefined })) : undefined}
        />
        {!locked && (
          <div className="flex gap-2 border-t border-[var(--orbit)] pt-3">
            <Button variant="outline" size="sm" onClick={() => onChange(duplicateRow(design, row.id))}>
              <Copy /> {t('duplicateRow')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--supernova)]"
              onClick={() => {
                onChange(removeRow(design, row.id))
                onSelect({ kind: 'settings' })
              }}
            >
              <Trash2 /> {t('deleteRow')}
            </Button>
          </div>
        )}
      </>
    )
  } else {
    title = t('settingsTitle')
    body = <SettingsForm settings={design.settings} locked={locked} onChange={(s) => onChange({ ...design, settings: s })} />
  }

  return (
    <aside className="min-h-0 space-y-3 overflow-y-auto border-t border-[var(--orbit)] p-3 lg:border-t-0 lg:border-l" data-testid="block-inspector">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">{title}</h3>
        {selection.kind !== 'settings' && (
          <Button variant="link" size="xs" className="h-5 px-0 text-[11px]" onClick={() => onSelect({ kind: 'settings' })}>
            {t('settingsTitle')}
          </Button>
        )}
      </div>
      {body}
    </aside>
  )
}

function SettingsForm({ settings, locked, onChange }: { settings: DesignSettings; locked: boolean; onChange: (s: DesignSettings) => void }) {
  const t = useTranslations('blockEditor')
  const set = (patch: Partial<DesignSettings>) => onChange({ ...settings, ...patch })
  return (
    <>
      <NumberField id="set-width" label={t('width')} value={settings.width} min={480} max={600} disabled={locked} onChange={(width) => set({ width })} />
      <ColorField id="set-bg" label={t('background')} value={settings.backgroundColor} disabled={locked} onChange={(c) => set({ backgroundColor: c })} />
      <ColorField id="set-content-bg" label={t('contentBackground')} value={settings.contentBackgroundColor} disabled={locked} onChange={(c) => set({ contentBackgroundColor: c })} />
      <ColorField id="set-text" label={t('textColor')} value={settings.textColor} disabled={locked} onChange={(c) => set({ textColor: c })} />
      <ColorField id="set-link" label={t('linkColor')} value={settings.linkColor} disabled={locked} onChange={(c) => set({ linkColor: c })} />
      <div className="space-y-1">
        <Label htmlFor="set-font" className="text-[11px] font-semibold">{t('font')}</Label>
        <NativeSelect id="set-font" value={settings.fontFamily} disabled={locked} className="w-full" onChange={(e) => set({ fontFamily: DESIGN_FONTS.find((f) => f === e.target.value) ?? 'sans' })}>
          {DESIGN_FONTS.map((f) => (
            <NativeSelectOption key={f} value={f}>{t(`font_${f}`)}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </>
  )
}

function BlockForm({ block, vars, locked, textColor, onPatch }: { block: DesignBlock; vars: string[]; locked: boolean; textColor: string; onPatch: (p: Partial<DesignBlock>) => void }) {
  const t = useTranslations('blockEditor')
  const align = 'align' in block ? <AlignField value={block.align} disabled={locked} onChange={(a) => onPatch({ align: a })} /> : null
  switch (block.type) {
    case 'heading':
      return (
        <>
          <VariableField id="blk-text" label={t('content')} value={block.text} variables={vars} disabled={locked} multiline onChange={(text) => onPatch({ text })} />
          <div className="space-y-1">
            <Label htmlFor="blk-level" className="text-[11px] font-semibold">{t('level')}</Label>
            <NativeSelect id="blk-level" value={String(block.level)} disabled={locked} className="w-full" onChange={(e) => onPatch({ level: Number(e.target.value) as 1 | 2 | 3 })}>
              {[1, 2, 3].map((n) => (
                <NativeSelectOption key={n} value={String(n)}>{t('levelN', { n })}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {align}
          <ColorField id="blk-color" label={t('color')} value={block.color ?? textColor} disabled={locked} onChange={(c) => onPatch({ color: c })} onReset={block.color ? () => onPatch({ color: undefined }) : undefined} />
        </>
      )
    case 'text':
      return (
        <>
          <VariableField id="blk-text" label={t('content')} value={block.text} variables={vars} disabled={locked} multiline hint={t('textHint')} onChange={(text) => onPatch({ text })} />
          {align}
          <ColorField id="blk-color" label={t('color')} value={block.color ?? textColor} disabled={locked} onChange={(c) => onPatch({ color: c })} onReset={block.color ? () => onPatch({ color: undefined }) : undefined} />
        </>
      )
    case 'button':
      return (
        <>
          <VariableField id="blk-label" label={t('buttonLabel')} value={block.label} variables={vars} disabled={locked} onChange={(label) => onPatch({ label })} />
          <VariableField id="blk-url" label={t('link')} value={block.url} variables={vars} disabled={locked} invalid={linkLooksWrong(block.url)} hint={t('linkHint')} onChange={(url) => onPatch({ url })} />
          {align}
          <ColorField id="blk-bg" label={t('buttonColor')} value={block.backgroundColor} disabled={locked} onChange={(c) => onPatch({ backgroundColor: c })} />
          <ColorField id="blk-fg" label={t('buttonTextColor')} value={block.textColor} disabled={locked} onChange={(c) => onPatch({ textColor: c })} />
          <NumberField id="blk-radius" label={t('radius')} value={block.borderRadius} min={0} max={24} disabled={locked} onChange={(borderRadius) => onPatch({ borderRadius })} />
        </>
      )
    case 'image':
      return (
        <>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label htmlFor="blk-src" className="text-[11px] font-semibold">{t('imageUrl')}</Label>
              <FieldHint text={t('imageUrlHint')} label={t('hintFor', { field: t('imageUrl') })} />
            </div>
            <Input id="blk-src" value={block.src} disabled={locked} placeholder="https://" aria-invalid={imageLooksWrong(block.src) || undefined} className="text-xs" onChange={(e) => onPatch({ src: e.target.value })} />
            {imageLooksWrong(block.src) && <p className="text-[11px] text-[var(--supernova)]">{t('imageUrlHint')}</p>}
          </div>
          <VariableField id="blk-alt" label={t('alt')} value={block.alt} variables={vars} disabled={locked} hint={t('altHint')} onChange={(alt) => onPatch({ alt })} />
          <NumberField id="blk-width" label={t('imageWidth')} value={block.width} min={10} max={100} disabled={locked} onChange={(width) => onPatch({ width })} />
          <VariableField id="blk-link" label={t('imageLink')} value={block.link} variables={vars} disabled={locked} invalid={linkLooksWrong(block.link)} hint={t('linkHint')} onChange={(link) => onPatch({ link })} />
          {align}
        </>
      )
    case 'divider':
      return (
        <>
          <ColorField id="blk-color" label={t('color')} value={block.color} disabled={locked} onChange={(c) => onPatch({ color: c })} />
          <NumberField id="blk-thick" label={t('thickness')} value={block.thickness} min={1} max={8} disabled={locked} onChange={(thickness) => onPatch({ thickness })} />
        </>
      )
    case 'spacer':
      return <NumberField id="blk-height" label={t('height')} value={block.height} min={4} max={120} disabled={locked} onChange={(height) => onPatch({ height })} />
    case 'html':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label htmlFor="blk-html" className="text-[11px] font-semibold">{t('htmlCode')}</Label>
            <FieldHint text={t('htmlHint')} label={t('hintFor', { field: t('htmlCode') })} />
          </div>
          <Textarea id="blk-html" value={block.html} disabled={locked} rows={10} className="font-mono text-[11px]" onChange={(e) => onPatch({ html: e.target.value })} />
        </div>
      )
  }
}

function AlignField({ value, disabled, onChange }: { value: DesignAlign; disabled: boolean; onChange: (a: DesignAlign) => void }) {
  const t = useTranslations('blockEditor')
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold">{t('align')}</Label>
      <ToggleGroup variant="outline" size="sm" value={[value]} disabled={disabled} onValueChange={(v) => {
        const next = DESIGN_ALIGNS.find((a) => a === v[0])
        if (next) onChange(next)
      }}>
        {DESIGN_ALIGNS.map((a) => (
          <ToggleGroupItem key={a} value={a} className="text-xs">{t(`align_${a}`)}</ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

/** Màu của THƯ: `#rrggbb` (backend chỉ nhận dạng này). */
function ColorField({ id, label, value, disabled, onChange, onReset }: { id: string; label: string; value: string; disabled: boolean; onChange: (c: string) => void; onReset?: (() => void) | undefined }) {
  const t = useTranslations('blockEditor')
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="color" value={value} disabled={disabled} className="h-8 w-12 cursor-pointer p-1" onChange={(e) => onChange(e.target.value)} />
        <span className="font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">{value}</span>
        {onReset && !disabled && (
          <Button variant="link" size="xs" className="h-5 px-0 text-[11px]" onClick={onReset}>{t('resetColor')}</Button>
        )}
      </div>
    </div>
  )
}

function NumberField({ id, label, value, min, max, disabled, onChange }: { id: string; label: string; value: number; min: number; max: number; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-semibold">{label} <span className="font-mono font-normal text-[var(--text-muted)]">({min}–{max})</span></Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        className="font-mono text-xs tabular-nums"
        onChange={(e) => {
          const n = Math.round(Number(e.target.value))
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
      />
    </div>
  )
}
