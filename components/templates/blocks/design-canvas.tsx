'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, GripVertical, Settings2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  duplicateBlock,
  duplicateRow,
  removeBlock,
  removeRow,
  type DesignBlock,
  type DesignColumn,
  type DesignRow,
  type EmailDesign,
} from '@/lib/email-design'
import { cn } from '@/lib/utils'
import type { DropData, Selection } from './block-editor'
import { BlockView } from './block-view'

type CanvasProps = {
  design: EmailDesign
  locked: boolean
  selection: Selection
  onSelect: (s: Selection) => void
  onChange: (d: EmailDesign) => void
}

/**
 * Khung soạn giữa: thư đang dựng theo đúng rộng / màu của thiết kế. Chỉ là bản VẼ để soạn — thư thật
 * (HTML) xem ở khung Xem trước, do backend sinh.
 */
export function DesignCanvas({ design, locked, selection, onSelect, onChange }: CanvasProps) {
  const t = useTranslations('blockEditor')
  const end = useDroppable({ id: 'canvas', data: { kind: 'canvas' } satisfies DropData, disabled: locked })
  const { settings } = design
  return (
    <div
      className="min-h-0 overflow-y-auto p-4"
      style={{ backgroundColor: settings.backgroundColor }}
      onClick={() => onSelect({ kind: 'settings' })}
      data-testid="design-canvas"
    >
      <div
        className="mx-auto w-full"
        style={{ maxWidth: settings.width, backgroundColor: settings.contentBackgroundColor, color: settings.textColor, fontFamily: FONT_CSS[settings.fontFamily] }}
      >
        <SortableContext items={design.rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {design.rows.map((row) => (
            <RowView key={row.id} row={row} design={design} locked={locked} selection={selection} onSelect={onSelect} onChange={onChange} />
          ))}
        </SortableContext>
        <div
          ref={end.setNodeRef}
          className={cn(
            'flex min-h-20 items-center justify-center border-2 border-dashed p-4 text-xs text-[var(--text-muted)] transition-colors',
            end.isOver ? 'border-[var(--starlight)] bg-[var(--starlight)]/5' : 'border-transparent',
            design.rows.length === 0 && 'min-h-48 border-[var(--orbit)]',
          )}
          data-testid="canvas-end"
        >
          {!locked && (design.rows.length === 0 ? t('emptyCanvas') : t('dropNewRow'))}
        </div>
      </div>
    </div>
  )
}

/** Font của khung soạn — gần với font thư; font thật trong thư do backend đặt. */
const FONT_CSS = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, Menlo, monospace',
} as const

function Toolbar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      className="absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-md border border-[var(--starlight)]/40 bg-[var(--deep)] px-1 shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="px-1 text-[10px] text-[var(--starlight)]">{label}</span>
      {children}
    </div>
  )
}

function RowView({ row, design, locked, selection, onSelect, onChange }: CanvasProps & { row: DesignRow }) {
  const t = useTranslations('blockEditor')
  const sortable = useSortable({ id: row.id, data: { kind: 'row', rowId: row.id } satisfies DropData, disabled: locked })
  const selected = selection.kind === 'row' && selection.rowId === row.id
  const style: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    backgroundColor: row.backgroundColor,
  }
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        'group/row relative border-2 px-3 py-2',
        selected ? 'border-[var(--starlight)]' : 'border-transparent hover:border-[var(--starlight)]/30',
        sortable.isDragging && 'z-20 opacity-60',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect({ kind: 'row', rowId: row.id })
      }}
      data-testid="design-row"
    >
      {!locked && (
        <div className={cn('hidden group-hover/row:block', selected && 'block')}>
          <Toolbar label={t('columns', { count: row.columns.length })}>
            <Button variant="ghost" size="icon-xs" aria-label={t('dragRow')} className="cursor-grab" {...sortable.attributes} {...sortable.listeners}>
              <GripVertical />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={t('rowSettings')} onClick={() => onSelect({ kind: 'row', rowId: row.id })}>
              <Settings2 />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={t('duplicateRow')} onClick={() => onChange(duplicateRow(design, row.id))}>
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('deleteRow')}
              className="text-[var(--supernova)]"
              onClick={() => {
                onChange(removeRow(design, row.id))
                onSelect({ kind: 'settings' })
              }}
            >
              <Trash2 />
            </Button>
          </Toolbar>
        </div>
      )}
      <div className={cn('grid gap-3', row.columns.length === 2 && 'grid-cols-2', row.columns.length === 3 && 'grid-cols-3')}>
        {row.columns.map((col) => (
          <ColumnView key={col.id} column={col} design={design} locked={locked} selection={selection} onSelect={onSelect} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function ColumnView({ column, design, locked, selection, onSelect, onChange }: CanvasProps & { column: DesignColumn }) {
  const t = useTranslations('blockEditor')
  const drop = useDroppable({ id: `col:${column.id}`, data: { kind: 'column', columnId: column.id } satisfies DropData, disabled: locked })
  return (
    <div
      ref={drop.setNodeRef}
      className={cn('min-h-14 min-w-0 rounded-md transition-colors', drop.isOver && 'bg-[var(--starlight)]/10 outline-2 outline-dashed outline-[var(--starlight)]')}
      data-testid="design-column"
    >
      <SortableContext items={column.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {column.blocks.map((block) => (
          <BlockCard key={block.id} block={block} column={column} design={design} locked={locked} selection={selection} onSelect={onSelect} onChange={onChange} />
        ))}
      </SortableContext>
      {column.blocks.length === 0 && (
        <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-[var(--orbit)] text-[11px] text-[var(--text-muted)]">
          {locked ? '' : t('dropHere')}
        </div>
      )}
    </div>
  )
}

function BlockCard({ block, column, design, locked, selection, onSelect, onChange }: CanvasProps & { block: DesignBlock; column: DesignColumn }) {
  const t = useTranslations('blockEditor')
  const sortable = useSortable({ id: block.id, data: { kind: 'block', blockId: block.id, columnId: column.id } satisfies DropData, disabled: locked })
  const selected = selection.kind === 'block' && selection.blockId === block.id
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={cn(
        'group/block relative my-1 rounded-sm border-2',
        selected ? 'border-[var(--pulsar)]' : 'border-transparent hover:border-[var(--pulsar)]/30',
        sortable.isDragging && 'z-20 opacity-60',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect({ kind: 'block', blockId: block.id })
      }}
      data-testid={`design-block-${block.type}`}
    >
      {!locked && (
        <div className={cn('hidden group-hover/block:block', selected && 'block')}>
          <Toolbar label={t(block.type)}>
            <Button variant="ghost" size="icon-xs" aria-label={t('dragBlock')} className="cursor-grab" {...sortable.attributes} {...sortable.listeners}>
              <GripVertical />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={t('duplicateBlock')} onClick={() => onChange(duplicateBlock(design, block.id))}>
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('deleteBlock')}
              className="text-[var(--supernova)]"
              onClick={() => {
                onChange(removeBlock(design, block.id))
                onSelect({ kind: 'settings' })
              }}
            >
              <Trash2 />
            </Button>
          </Toolbar>
        </div>
      )}
      <BlockView block={block} settings={design.settings} />
    </div>
  )
}
