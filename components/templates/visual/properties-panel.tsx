'use client'
import type { ReactNode } from 'react'
import type { Component, Editor } from 'grapesjs'
import { AlignCenter, AlignLeft, AlignRight, Braces, ChevronRight, Copy, Rows3, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateVariableDto } from '@/lib/api/types'
import { parseVariables } from '@/lib/template-syntax'
import { variableLabel } from '@/lib/variable-labels'
import { CHIP_TYPE } from './chip-plugin'
import { ColorField, PALETTES } from './color-field'
import type { EmailSettings } from './email-settings'

/** Yêu cầu chọn biến cho ô link (nút / ảnh) — bộ soạn mở hộp "Chèn biến", chọn xong gọi `apply`. */
export type LinkVariableRequest = (apply: (path: string, fallback: string | null) => void) => void

type Option = { value: string; label: ReactNode; aria?: string }

/** Nhóm nút chọn một (Nhỏ / Vừa / Lớn…) — ToggleGroup của shadcn. */
function Choice({ label, value, options, onChange, testId }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; testId?: string }) {
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
      <ToggleGroup
        variant="outline"
        size="sm"
        value={[value]}
        onValueChange={(v) => v[0] !== undefined && onChange(v[0])}
        aria-label={label}
        className="grid w-full grid-cols-3 gap-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} aria-label={o.aria} className="text-xs aria-pressed:bg-[var(--starlight)]/10 aria-pressed:text-[var(--starlight)]">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

/** Ô chữ chỉ ghi khi rời ô / Enter — gõ từng phím không làm khung thư vẽ lại liên tục. */
function TextField({ id, label, value, onCommit, placeholder, error, mono }: { id: string; label: string; value: string; onCommit: (v: string) => void; placeholder?: string; error?: string | null; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">{label}</Label>
      <Input
        id={id}
        key={value}
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== value && onCommit(e.target.value.trim())}
        onKeyDown={(e) => e.key === 'Enter' && onCommit(e.currentTarget.value.trim())}
        aria-invalid={!!error}
        className={mono ? 'font-mono text-xs' : 'text-sm'}
      />
      {error && <p className="text-[11px] text-[var(--supernova)]">{error}</p>}
    </div>
  )
}

const px = (value: unknown, fallback: number) => {
  const n = parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}
const nearest = (n: number, options: readonly number[]) => options.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a))
const HTTPS_IMAGE_RE = /^https:\/\/[^\s"'<>{}]+$/i

/**
 * Bảng phải: thuộc tính THEO LOẠI KHỐI, chỉ thứ người soạn cần (ADR-0036, UX-3). Không hiện mã màu / px ở mặc
 * định — "Nâng cao" thu gọn mới có khoảng cách và mã màu. Ghi thẳng vào thuộc tính MJML của khối
 * (`addAttributes`), khung soạn tự vẽ lại; hoàn tác của GrapesJS nhận luôn.
 */
export function PropertiesPanel({
  editor,
  selected,
  variables,
  settings,
  onRequestLinkVariable,
}: {
  editor: Editor
  selected: Component | null
  variables: readonly TemplateVariableDto[]
  settings: EmailSettings
  onRequestLinkVariable: LinkVariableRequest
}) {
  const t = useTranslations('visualEditor')
  if (!selected || ['wrapper', 'mj-body', 'mjml'].includes(String(selected.get('type')))) {
    return (
      <div className="p-4 text-sm text-[var(--text-secondary)]" data-testid="visual-props-empty">
        <p className="font-semibold text-[var(--text-primary)]">{t('propsEmptyTitle')}</p>
        <p className="mt-1 text-xs">{t('propsEmptyBody')}</p>
      </div>
    )
  }
  const type = String(selected.get('type'))
  const attrs = selected.getAttributes() as Record<string, string | undefined>
  const set = (next: Record<string, string>) => selected.addAttributes(next)
  const align: Option[] = [
    { value: 'left', label: <AlignLeft className="size-4" />, aria: t('alignLeft') },
    { value: 'center', label: <AlignCenter className="size-4" />, aria: t('alignCenter') },
    { value: 'right', label: <AlignRight className="size-4" />, aria: t('alignRight') },
  ]
  const isText = type === 'mj-text'
  const isSection = type === 'mj-section'
  const isColumn = type === 'mj-column'
  const title =
    type === 'mj-text' ? t('kindText')
    : type === 'mj-button' ? t('kindButton')
    : type === 'mj-image' ? t('kindImage')
    : type === 'mj-divider' ? t('kindDivider')
    : type === 'mj-spacer' ? t('kindSpacer')
    : isSection ? t('kindSection')
    : isColumn ? t('kindColumn')
    : type === CHIP_TYPE ? t('kindVariable')
    : t('kindOther')

  const duplicate = () => {
    const parent = selected.parent()
    if (!parent) return
    // `add` trả một khối (thêm một) hoặc mảng (thêm nhiều) — chuẩn hoá về mảng.
    const [copy] = [parent.components().add(selected.clone(), { at: selected.index() + 1 })].flat() as Component[]
    if (copy) editor.select(copy)
  }
  const remove = () => {
    const parent = selected.parent()
    selected.remove()
    editor.select(parent && parent.get('type') !== 'mj-body' ? parent : undefined)
  }

  return (
    <div className="flex min-h-0 flex-col" data-testid="visual-props">
      <div className="flex items-center gap-1 border-b border-[var(--orbit)] px-4 py-3">
        <h3 className="flex-1 font-heading text-sm font-semibold text-[var(--text-primary)]" data-testid="visual-props-title">{title}</h3>
        {isColumn && (
          <Button variant="ghost" size="icon-sm" aria-label={t('selectRow')} title={t('selectRow')} onClick={() => selected.parent() && editor.select(selected.parent()!)}>
            <Rows3 />
          </Button>
        )}
        {!isColumn && type !== CHIP_TYPE && (
          <Button variant="ghost" size="icon-sm" aria-label={t('duplicateBlock')} title={t('duplicateBlock')} onClick={duplicate} data-testid="visual-duplicate">
            <Copy />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={t('deleteBlock')} title={t('deleteBlock')} onClick={remove} className="text-[var(--supernova)]" data-testid="visual-delete">
          <Trash2 />
        </Button>
      </div>

      <div className="space-y-5 p-4">
        {isText && (
          <>
            <Choice
              label={t('fontSize')}
              value={String(nearest(px(attrs['font-size'], 15), [13, 15, 22]))}
              options={[
                { value: '13', label: t('sizeSmall') },
                { value: '15', label: t('sizeMedium') },
                { value: '22', label: t('sizeLarge') },
              ]}
              onChange={(v) => set({ 'font-size': `${v}px`, 'line-height': v === '22' ? '1.3' : '1.6' })}
              testId="prop-font-size"
            />
            <Choice
              label={t('fontWeight')}
              value={px(attrs['font-weight'], 400) >= 600 ? 'bold' : 'normal'}
              options={[
                { value: 'normal', label: t('weightNormal') },
                { value: 'bold', label: t('weightBold') },
              ]}
              onChange={(v) => set({ 'font-weight': v === 'bold' ? '700' : '400' })}
            />
            <ColorField label={t('textColor')} value={attrs.color ?? settings.textColor} palette={PALETTES.text} onChange={(c) => set({ color: c })} testId="prop-text-color" />
            <Choice label={t('align')} value={attrs.align ?? 'left'} options={align} onChange={(v) => set({ align: v })} />
            <VariablesInBlock component={selected} variables={variables} />
          </>
        )}

        {type === 'mj-button' && (
          <>
            <ButtonLabel component={selected} />
            <LinkField
              id="prop-button-link"
              label={t('buttonLink')}
              value={attrs.href ?? ''}
              variables={variables}
              onChange={(href) => set({ href })}
              onRequestVariable={onRequestLinkVariable}
            />
            <ColorField label={t('buttonColor')} value={attrs['background-color'] ?? settings.linkColor} palette={PALETTES.accent} onChange={(c) => set({ 'background-color': c })} testId="prop-button-color" />
            <ColorField label={t('buttonTextColor')} value={attrs.color ?? '#ffffff'} palette={['#ffffff', ...PALETTES.text.slice(0, 5)]} onChange={(c) => set({ color: c })} />
            <Choice
              label={t('buttonShape')}
              value={String(nearest(px(attrs['border-radius'], 3), [0, 6, 24]))}
              options={[
                { value: '0', label: t('shapeSquare') },
                { value: '6', label: t('shapeRounded') },
                { value: '24', label: t('shapePill') },
              ]}
              onChange={(v) => set({ 'border-radius': `${v}px` })}
            />
            <Choice label={t('align')} value={attrs.align ?? 'center'} options={align} onChange={(v) => set({ align: v })} />
          </>
        )}

        {type === 'mj-image' && (
          <ImageProps component={selected} attrs={attrs} settings={settings} variables={variables} align={align} onRequestLinkVariable={onRequestLinkVariable} />
        )}

        {type === 'mj-divider' && (
          <>
            <ColorField label={t('lineColor')} value={attrs['border-color'] ?? '#000000'} palette={PALETTES.line} onChange={(c) => set({ 'border-color': c })} />
            <Choice
              label={t('lineThickness')}
              value={String(nearest(px(attrs['border-width'], 4), [1, 2, 4]))}
              options={[
                { value: '1', label: t('thin') },
                { value: '2', label: t('medium') },
                { value: '4', label: t('thick') },
              ]}
              onChange={(v) => set({ 'border-width': `${v}px` })}
            />
          </>
        )}

        {type === 'mj-spacer' && (
          <Choice
            label={t('spacerHeight')}
            value={String(nearest(px(attrs.height, 20), [12, 24, 48]))}
            options={[
              { value: '12', label: t('sizeSmall') },
              { value: '24', label: t('sizeMedium') },
              { value: '48', label: t('sizeLarge') },
            ]}
            onChange={(v) => set({ height: `${v}px` })}
          />
        )}

        {(isSection || isColumn) && (
          <>
            <ColorField label={t('background')} value={attrs['background-color'] ?? settings.contentBackgroundColor} palette={PALETTES.background} onChange={(c) => set({ 'background-color': c })} />
            {isSection && (
              <Choice
                label={t('columns')}
                value={String(selected.components().filter((c: Component) => c.get('type') === 'mj-column').length)}
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                ]}
                onChange={(v) => setColumnCount(selected, Number(v), t('newColumnText'))}
                testId="prop-columns"
              />
            )}
          </>
        )}

        {type === CHIP_TYPE && <ChipInfo component={selected} variables={variables} />}

        {type !== CHIP_TYPE && (
          <Advanced component={selected} attrs={attrs} type={type} />
        )}
      </div>
    </div>
  )
}

/** Chữ trên nút: sửa ở đây khi nút chỉ có chữ; có biến thì sửa thẳng trên nút (bấm đúp). */
function ButtonLabel({ component }: { component: Component }) {
  const t = useTranslations('visualEditor')
  const parts: (string | null)[] = component.components().map((c: Component) => (c.get('type') === 'textnode' ? String(c.get('content') ?? '') : null))
  if (parts.some((p) => p === null)) {
    return <p className="text-xs text-[var(--text-secondary)]">{t('buttonLabelInline')}</p>
  }
  const value = parts.join('').trim()
  return (
    <TextField
      id="prop-button-label"
      label={t('buttonLabel')}
      value={value}
      onCommit={(next) => next && component.components([{ type: 'textnode', content: next }])}
    />
  )
}

/** Ô link: https / mailto hoặc một biến (hiện thành viên nhãn, không lộ `{{ }}`). */
function LinkField({
  id,
  label,
  value,
  variables,
  onChange,
  onRequestVariable,
}: {
  id: string
  label: string
  value: string
  variables: readonly TemplateVariableDto[]
  onChange: (href: string) => void
  onRequestVariable: LinkVariableRequest
}) {
  const t = useTranslations('visualEditor')
  const variable = value.trim().startsWith('{{') ? parseVariables(value)[0] : undefined
  const declared = variable ? variables.find((v) => v.name === variable.path) : undefined
  const error = !variable && value.trim() !== '' && !/^(https:\/\/|mailto:)/i.test(value.trim()) ? t('linkSchemeError') : null
  const pick = () =>
    onRequestVariable((path, fallback) => onChange(fallback ? `{{ ${path} | default: '${fallback}' }}` : `{{ ${path} }}`))
  return (
    <div className="space-y-1.5" data-testid={id}>
      {variable ? (
        <>
          <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate rounded-full border border-[var(--starlight)]/30 bg-[var(--nebula-indigo)] px-2.5 py-0.5 text-xs font-medium text-[var(--starlight)]">
              {declared ? variableLabel(declared) : variable.path}
            </span>
            <Button variant="ghost" size="icon-xs" aria-label={t('linkClear')} onClick={() => onChange('')}>
              <X />
            </Button>
          </div>
          {variable.defaultValue && <p className="text-[11px] text-[var(--text-muted)]">{t('linkFallback', { value: variable.defaultValue })}</p>}
        </>
      ) : (
        <TextField id={`${id}-input`} label={label} value={value} onCommit={onChange} placeholder="https://…" error={error} />
      )}
      <Button variant="outline" size="xs" onClick={pick}>
        <Braces /> {t('insertVariable')}
      </Button>
    </div>
  )
}

function ImageProps({
  component,
  attrs,
  settings,
  variables,
  align,
  onRequestLinkVariable,
}: {
  component: Component
  attrs: Record<string, string | undefined>
  settings: EmailSettings
  variables: readonly TemplateVariableDto[]
  align: Option[]
  onRequestLinkVariable: LinkVariableRequest
}) {
  const t = useTranslations('visualEditor')
  const src = String(component.get('src') ?? attrs.src ?? '')
  const srcError = src && !HTTPS_IMAGE_RE.test(src) ? t('imageSrcError') : null
  const widthPct = Math.round((px(attrs.width, settings.width) / settings.width) * 100)
  return (
    <>
      <TextField
        id="prop-image-src"
        label={t('imageSrc')}
        value={src}
        placeholder="https://…/anh.png"
        error={srcError}
        onCommit={(next) => {
          component.set('src', next)
          component.addAttributes({ src: next })
          // Có ảnh thật thì bỏ chiều cao chừa chỗ — ảnh tự theo tỉ lệ.
          if (next) component.removeAttributes('height')
        }}
      />
      <TextField id="prop-image-alt" label={t('imageAlt')} value={attrs.alt ?? ''} onCommit={(alt) => component.addAttributes({ alt })} />
      <Choice
        label={t('imageWidth')}
        value={String(nearest(widthPct, [25, 50, 75, 100]))}
        options={[25, 50, 75, 100].map((p) => ({ value: String(p), label: `${p}%` }))}
        onChange={(v) => component.addAttributes({ width: `${Math.round((settings.width * Number(v)) / 100)}px` })}
      />
      <LinkField id="prop-image-link" label={t('imageLink')} value={attrs.href ?? ''} variables={variables} onChange={(href) => component.addAttributes({ href })} onRequestVariable={onRequestLinkVariable} />
      <Choice label={t('align')} value={attrs.align ?? 'center'} options={align} onChange={(v) => component.addAttributes({ align: v })} />
    </>
  )
}

/** Biến trong khối chữ — nhãn + chữ hiện khi app không gửi (bản phác "Biến trong khối này"). */
function VariablesInBlock({ component, variables }: { component: Component; variables: readonly TemplateVariableDto[] }) {
  const t = useTranslations('visualEditor')
  const chips = component.findType(CHIP_TYPE)
  if (chips.length === 0) return null
  return (
    <section className="space-y-2 border-t border-[var(--orbit)] pt-4">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{t('variablesInBlock')}</p>
      <ul className="space-y-1.5">
        {chips.map((chip: Component) => {
          const path = String(chip.get('varPath') ?? '')
          const v = variables.find((x) => x.name === path)
          const fallback = chip.get('varDefault') as string | undefined
          return (
            <li key={chip.getId()} className="text-xs text-[var(--text-secondary)]">
              <span className={v ? 'font-medium text-[var(--starlight)]' : 'font-medium text-[var(--supernova)]'}>{v ? variableLabel(v) : path}</span>
              {fallback ? ` — ${t('chipFallback', { value: fallback })}` : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ChipInfo({ component, variables }: { component: Component; variables: readonly TemplateVariableDto[] }) {
  const t = useTranslations('visualEditor')
  const path = String(component.get('varPath') ?? '')
  const v = variables.find((x) => x.name === path)
  const fallback = component.get('varDefault') as string | undefined
  return (
    <div className="space-y-2 text-xs text-[var(--text-secondary)]">
      <p className="text-sm font-medium text-[var(--text-primary)]">{v ? variableLabel(v) : path}</p>
      {!v && <p className="text-[var(--supernova)]">{t('chipUndeclared')}</p>}
      {v?.sample && <p>{t('insertExample', { value: v.sample })}</p>}
      {fallback && <p>{t('chipFallback', { value: fallback })}</p>}
      <p className="font-mono text-[11px] text-[var(--text-muted)]">{path}</p>
    </div>
  )
}

/** "Nâng cao — khoảng cách, mã màu": thu gọn sẵn, chỉ ở đây mới thấy px / hex. */
function Advanced({ component, attrs, type }: { component: Component; attrs: Record<string, string | undefined>; type: string }) {
  const t = useTranslations('visualEditor')
  const colorKeys = ['color', 'background-color', 'border-color'].filter((k) => attrs[k] !== undefined)
  const hasPadding = ['mj-text', 'mj-button', 'mj-image', 'mj-divider', 'mj-section', 'mj-column'].includes(type)
  if (!hasPadding && colorKeys.length === 0) return null
  return (
    <Collapsible className="border-t border-[var(--orbit)] pt-3">
      <CollapsibleTrigger className="group/adv flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]" data-testid="visual-advanced">
        <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]/adv:rotate-90" />
        {t('advanced')}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-3">
          {hasPadding && (
            <TextField id="prop-padding" label={t('padding')} value={attrs.padding ?? ''} placeholder="10px 25px" mono onCommit={(padding) => component.addAttributes({ padding })} />
          )}
          {colorKeys.map((key) => (
            <TextField
              key={key}
              id={`prop-hex-${key}`}
              label={t('hexOf', { field: key })}
              value={attrs[key] ?? ''}
              mono
              onCommit={(value) => /^#[0-9a-fA-F]{6}$/.test(value) && component.addAttributes({ [key]: value })}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Đổi số cột của hàng: thêm cột trống (có chữ mẫu), bớt cột thì dồn khối của cột bị bớt vào cột cuối còn lại. */
function setColumnCount(section: Component, count: number, sampleText: string): void {
  const columns = section.components().filter((c: Component) => c.get('type') === 'mj-column')
  if (count === columns.length || count < 1) return
  if (count > columns.length) {
    for (let i = columns.length; i < count; i++) {
      section.append(`<mj-column><mj-text>${sampleText.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</mj-text></mj-column>`)
    }
  } else {
    const keep = columns[count - 1]
    for (const extra of columns.slice(count)) {
      extra.components().forEach((child: Component) => keep?.append(child.clone()))
      extra.remove()
    }
  }
  // Cột tự chia đều lại.
  section.components().forEach((c: Component) => c.get('type') === 'mj-column' && c.removeAttributes('width'))
}
