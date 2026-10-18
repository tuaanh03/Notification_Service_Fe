'use client'
import { useDraggable } from '@dnd-kit/core'
import { Code2, Columns2, Columns3, Heading, Image as ImageIcon, Minus, MousePointerClick, MoveVertical, Pilcrow, RectangleHorizontal, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DESIGN_BLOCK_TYPES, type DesignBlockType } from '@/lib/email-design'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DragData } from './block-editor'

export const BLOCK_ICONS: Record<DesignBlockType, LucideIcon> = {
  heading: Heading,
  text: Pilcrow,
  button: MousePointerClick,
  image: ImageIcon,
  divider: Minus,
  spacer: MoveVertical,
  html: Code2,
}
const ROW_ICONS: Record<number, LucideIcon> = { 1: RectangleHorizontal, 2: Columns2, 3: Columns3 }

/** Một ô trong bảng trái: kéo vào khung soạn, hoặc bấm để thêm. */
function PaletteItem({ id, data, icon: Icon, label, disabled, onAdd }: { id: string; data: DragData; icon: LucideIcon; label: string; disabled: boolean; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data, disabled })
  return (
    <Button
      ref={setNodeRef}
      variant="outline"
      {...attributes}
      {...listeners}
      onClick={onAdd}
      disabled={disabled}
      data-testid={`palette-${id}`}
      className={cn(
        'h-auto w-full justify-start gap-2 px-2.5 py-2 text-left text-xs font-normal text-[var(--text-primary)]',
        'hover:bg-[var(--starlight)]/5',
        isDragging && 'opacity-40',
      )}
    >
      <Icon className="size-3.5 shrink-0 text-[var(--starlight)]" />
      <span className="truncate">{label}</span>
    </Button>
  )
}

export function BlockPalette({
  locked,
  canAddBlock,
  canAddRow,
  onAddBlock,
  onAddRow,
}: {
  locked: boolean
  canAddBlock: boolean
  canAddRow: boolean
  onAddBlock: (type: DesignBlockType) => void
  onAddRow: (columns: number) => void
}) {
  const t = useTranslations('blockEditor')
  return (
    <aside className="min-h-0 space-y-4 overflow-y-auto border-b border-[var(--orbit)] p-3 lg:border-r lg:border-b-0" data-testid="block-palette">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">{t('layout')}</p>
        {[1, 2, 3].map((n) => (
          <PaletteItem key={n} id={`row-${n}`} data={{ kind: 'new-row', columns: n }} icon={ROW_ICONS[n]!} label={t('columns', { count: n })} disabled={locked || !canAddRow} onAdd={() => onAddRow(n)} />
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">{t('blocks')}</p>
        {DESIGN_BLOCK_TYPES.map((type) => (
          <PaletteItem key={type} id={`block-${type}`} data={{ kind: 'new-block', type }} icon={BLOCK_ICONS[type]} label={t(type)} disabled={locked || !canAddBlock} onAdd={() => onAddBlock(type)} />
        ))}
      </div>
      {!locked && (!canAddBlock || !canAddRow) && <p className="text-[11px] text-[var(--solar)]">{t('limitReached')}</p>}
      {!locked && <p className="text-[11px] text-[var(--text-muted)]">{t('paletteHint')}</p>}
    </aside>
  )
}
