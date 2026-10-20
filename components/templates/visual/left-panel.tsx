'use client'
import type { Editor } from 'grapesjs'
import {
  Columns2,
  Columns3,
  Heading,
  Image as ImageIcon,
  type LucideIcon,
  Minus,
  MoveVertical,
  PanelLeft,
  PanelRight,
  RectangleHorizontal,
  Square,
  Text,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CONTENT_BLOCKS, LAYOUT_BLOCKS, type BlockKind } from './blocks'
import { ColorField, PALETTES } from './color-field'
import { EMAIL_FONTS, EMAIL_WIDTHS, type EmailFont, type EmailSettings } from './email-settings'

const ICONS: Record<BlockKind, LucideIcon> = {
  heading: Heading,
  text: Text,
  button: RectangleHorizontal,
  image: ImageIcon,
  divider: Minus,
  spacer: MoveVertical,
  col1: Square,
  col2: Columns2,
  col3: Columns3,
  col12: PanelLeft,
  col21: PanelRight,
}

/**
 * Bảng trái của bộ soạn trực quan (bản phác Main): tab Khối / Bố cục / Cài đặt thư. Khối là thẻ có biểu tượng lucide
 * + tên tiếng Việt; KÉO vào thư (`editor.Blocks.startDrag`) hoặc BẤM để thêm (mọi thao tác kéo có đường bấm tương ứng).
 */
export function LeftPanel({
  editor,
  labels,
  settings,
  onAdd,
  onSettings,
}: {
  editor: Editor
  labels: Record<BlockKind, string>
  settings: EmailSettings
  onAdd: (kind: BlockKind) => void
  onSettings: (patch: Partial<EmailSettings>) => void
}) {
  const t = useTranslations('visualEditor')
  const tile = (kind: BlockKind) => {
    const Icon = ICONS[kind]
    const block = editor.Blocks.get(`ews-${kind}`)
    return (
      // Thẻ kéo được: dùng nút gốc của trình duyệt cho kéo-thả HTML5 — GrapesJS nhận qua startDrag / endDrag.
      <div
        key={kind}
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => block && editor.Blocks.startDrag(block, e.nativeEvent)}
        onDragEnd={() => editor.Blocks.endDrag(false)}
        onClick={() => onAdd(kind)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAdd(kind))}
        className="flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-[var(--orbit)] bg-[var(--deep)] px-2 py-3 text-xs text-[var(--text-primary)] transition-colors select-none hover:border-[var(--starlight)] hover:text-[var(--starlight)] focus-visible:ring-2 focus-visible:ring-[var(--starlight)] focus-visible:outline-none active:cursor-grabbing"
        data-testid={`visual-block-${kind}`}
      >
        <Icon className="size-5 text-[var(--starlight)]" aria-hidden />
        {labels[kind]}
      </div>
    )
  }
  return (
    <Tabs defaultValue="blocks" className="flex min-h-0 flex-col" data-testid="visual-left">
      <TabsList className="m-3 mb-0 grid h-auto grid-cols-3 group-data-horizontal/tabs:h-auto">
        <TabsTrigger value="blocks" data-testid="visual-tab-blocks">{t('tabBlocks')}</TabsTrigger>
        <TabsTrigger value="layout" data-testid="visual-tab-layout">{t('tabLayout')}</TabsTrigger>
        <TabsTrigger value="settings" data-testid="visual-tab-settings">{t('tabSettings')}</TabsTrigger>
      </TabsList>
      <TabsContent value="blocks" className="space-y-3 overflow-y-auto p-3">
        <p className="text-xs text-[var(--text-secondary)]">{t('blocksHint')}</p>
        <div className="grid grid-cols-2 gap-2">{CONTENT_BLOCKS.map(tile)}</div>
      </TabsContent>
      <TabsContent value="layout" className="space-y-3 overflow-y-auto p-3">
        <p className="text-xs text-[var(--text-secondary)]">{t('layoutHint')}</p>
        <div className="grid grid-cols-2 gap-2">{LAYOUT_BLOCKS.map(tile)}</div>
      </TabsContent>
      <TabsContent value="settings" className="space-y-5 overflow-y-auto p-3" data-testid="visual-settings">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[var(--text-primary)]">{t('settingWidth')}</p>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[String(settings.width)]}
            onValueChange={(v) => {
              const width = EMAIL_WIDTHS.find((w) => String(w) === v[0])
              if (width) onSettings({ width })
            }}
            aria-label={t('settingWidth')}
            className="grid w-full grid-cols-3 gap-1"
          >
            <ToggleGroupItem value="480" className="text-xs">{t('widthNarrow')}</ToggleGroupItem>
            <ToggleGroupItem value="540" className="text-xs">{t('widthMedium')}</ToggleGroupItem>
            <ToggleGroupItem value="600" className="text-xs">{t('widthWide')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ColorField label={t('settingOuterBg')} value={settings.backgroundColor} palette={PALETTES.background} onChange={(c) => onSettings({ backgroundColor: c })} />
        <ColorField label={t('settingInnerBg')} value={settings.contentBackgroundColor} palette={PALETTES.background} onChange={(c) => onSettings({ contentBackgroundColor: c })} />
        <ColorField label={t('settingTextColor')} value={settings.textColor} palette={PALETTES.text} onChange={(c) => onSettings({ textColor: c })} />
        <ColorField label={t('settingAccent')} value={settings.linkColor} palette={PALETTES.accent} onChange={(c) => onSettings({ linkColor: c })} />
        <div className="space-y-1.5">
          <Label htmlFor="visual-font" className="text-xs font-semibold">{t('settingFont')}</Label>
          <NativeSelect
            id="visual-font"
            value={settings.font}
            onChange={(e) => (Object.keys(EMAIL_FONTS) as EmailFont[]).includes(e.target.value as EmailFont) && onSettings({ font: e.target.value as EmailFont })}
            className="w-full"
          >
            <NativeSelectOption value="sans">{t('fontSans')}</NativeSelectOption>
            <NativeSelectOption value="serif">{t('fontSerif')}</NativeSelectOption>
            <NativeSelectOption value="mono">{t('fontMono')}</NativeSelectOption>
          </NativeSelect>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">{t('settingsNote')}</p>
      </TabsContent>
    </Tabs>
  )
}
