'use client'
import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useTranslations } from 'next-intl'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import {
  columnOf,
  countBlocks,
  DESIGN_LIMITS,
  emptyDesign,
  findBlock,
  insertBlock,
  insertRow,
  moveBlock,
  moveRow,
  newBlock,
  newRow,
  removeBlock,
  type DesignBlock,
  type DesignBlockType,
  type EmailDesign,
} from '@/lib/email-design'
import { BlockInspector } from './block-inspector'
import { BlockPalette } from './block-palette'
import { DesignCanvas } from './design-canvas'

/** Thứ đang được kéo — ghi ở `data` của draggable / sortable. */
export type DragData =
  | { kind: 'new-block'; type: DesignBlockType }
  | { kind: 'new-row'; columns: number }
  | { kind: 'row'; rowId: string }
  | { kind: 'block'; blockId: string; columnId: string }

/** Chỗ thả — ghi ở `data` của droppable. `canvas` = vùng trống cuối thư. */
export type DropData =
  | { kind: 'row'; rowId: string }
  | { kind: 'block'; blockId: string; columnId: string }
  | { kind: 'column'; columnId: string }
  | { kind: 'canvas' }

export type Selection = { kind: 'settings' } | { kind: 'row'; rowId: string } | { kind: 'block'; blockId: string }

/** Kéo hàng chỉ xét chỗ thả là hàng; kéo khối xét khối > cột > cuối thư — tránh hàng "nuốt" khối đang kéo. */
const DROP_RANK: Record<DropData['kind'], number> = { block: 0, column: 1, row: 2, canvas: 3 }
const collision: CollisionDetection = (args) => {
  const kind = (args.active.data.current as DragData | undefined)?.kind
  const wanted: DropData['kind'][] = kind === 'row' || kind === 'new-row' ? ['row', 'canvas'] : ['block', 'column', 'canvas']
  const droppableContainers = args.droppableContainers.filter((c) => wanted.includes((c.data.current as DropData | undefined)?.kind ?? 'canvas'))
  const rankOf = (id: string | number) => {
    const data = droppableContainers.find((c) => c.id === id)?.data.current as DropData | undefined
    return data ? DROP_RANK[data.kind] : 9
  }
  const hits = pointerWithin({ ...args, droppableContainers })
  if (hits.length) return [...hits].sort((a, b) => rankOf(a.id) - rankOf(b.id))
  return closestCenter({ ...args, droppableContainers })
}

/**
 * Trình soạn kéo-thả (ADR-0034 của backend): bảng khối trái · khung soạn giữa · thuộc tính phải.
 * Chỉ sửa CÂY thiết kế (`ed.setDesign`); HTML thư do backend sinh khi xem trước / lưu nháp.
 * Mọi thao tác kéo đều có đường bấm tương ứng (bấm khối ở bảng trái = thêm), không bắt buộc phải kéo.
 */
export function BlockEditor({ ed, locked }: { ed: TemplateEditorState; locked: boolean }) {
  const t = useTranslations('blockEditor')
  const design = ed.design ?? emptyDesign()
  const [selection, setSelection] = useState<Selection>({ kind: 'settings' })
  const [dragging, setDragging] = useState<DragData | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const blockCount = countBlocks(design)
  const canAddBlock = !locked && blockCount < DESIGN_LIMITS.blocks
  const canAddRow = !locked && design.rows.length < DESIGN_LIMITS.rows
  const change = (next: EmailDesign) => ed.setDesign(next)

  /** Khối mới (bấm ở bảng trái): sau khối đang chọn, vào hàng đang chọn, không thì thành hàng mới ở cuối. */
  const addBlock = (type: DesignBlockType) => {
    if (!canAddBlock) return
    const block = newBlock(type)
    if (selection.kind === 'block') {
      const at = findBlock(design, selection.blockId)
      if (at) {
        const index = columnOf(design, at.columnId)!.column.blocks.findIndex((b) => b.id === at.blockId) + 1
        change(insertBlock(design, at.columnId, block, index))
        setSelection({ kind: 'block', blockId: block.id })
        return
      }
    }
    const row = selection.kind === 'row' ? design.rows.find((r) => r.id === selection.rowId) : undefined
    if (row?.columns[0]) change(insertBlock(design, row.columns[0].id, block))
    else if (canAddRow) change(insertRow(design, withBlock(block)))
    else return
    setSelection({ kind: 'block', blockId: block.id })
  }
  const addRow = (columns: number) => {
    if (!canAddRow) return
    const row = newRow(columns)
    change(insertRow(design, row))
    setSelection({ kind: 'row', rowId: row.id })
  }

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as DragData | undefined) ?? null)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const drag = active.data.current as DragData | undefined
    const drop = over?.data.current as DropData | undefined
    if (!drag || locked) return
    const rowIndex = (rowId: string) => design.rows.findIndex((r) => r.id === rowId)

    if (drag.kind === 'new-row') {
      if (!canAddRow) return
      const row = newRow(drag.columns)
      change(insertRow(design, row, drop?.kind === 'row' ? rowIndex(drop.rowId) : design.rows.length))
      setSelection({ kind: 'row', rowId: row.id })
      return
    }
    if (drag.kind === 'row') {
      if (drop?.kind === 'row' && drop.rowId !== drag.rowId) change(moveRow(design, drag.rowId, rowIndex(drop.rowId)))
      return
    }

    // Khối: thả lên khối = đứng trước khối đó; lên cột = cuối cột; lên vùng trống = hàng mới.
    const target =
      drop?.kind === 'block'
        ? { columnId: drop.columnId, index: columnOf(design, drop.columnId)!.column.blocks.findIndex((b) => b.id === drop.blockId) }
        : drop?.kind === 'column'
          ? { columnId: drop.columnId, index: columnOf(design, drop.columnId)!.column.blocks.length }
          : null
    if (drag.kind === 'new-block') {
      if (!canAddBlock || !drop) return
      const block = newBlock(drag.type)
      if (target) change(insertBlock(design, target.columnId, block, target.index))
      else if (canAddRow) change(insertRow(design, withBlock(block)))
      else return
      setSelection({ kind: 'block', blockId: block.id })
      return
    }
    if (!drop || (drop.kind === 'block' && drop.blockId === drag.blockId)) return
    if (target) {
      change(moveBlock(design, drag.blockId, target.columnId, target.index))
    } else if (drop.kind === 'canvas' && canAddRow) {
      const found = findBlock(design, drag.blockId)
      if (found) change(insertRow(removeBlock(design, drag.blockId), withBlock(found.block)))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[170px_minmax(0,1fr)_280px]" data-testid="block-editor">
        <BlockPalette locked={locked} canAddBlock={canAddBlock} canAddRow={canAddRow} onAddBlock={addBlock} onAddRow={addRow} />
        <DesignCanvas design={design} locked={locked} selection={selection} onSelect={setSelection} onChange={change} />
        <BlockInspector ed={ed} design={design} locked={locked} selection={selection} onSelect={setSelection} onChange={change} />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="rounded-lg border border-[var(--starlight)] bg-[var(--deep)] px-3 py-1.5 text-xs font-medium text-[var(--starlight)] shadow-lg">
            {dragging.kind === 'new-block' ? t(dragging.type) : dragging.kind === 'new-row' ? t('columns', { count: dragging.columns }) : dragging.kind === 'row' ? t('rowTitle') : t('blockTitle')}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

const withBlock = (block: DesignBlock) => {
  const row = newRow(1)
  row.columns[0]!.blocks.push(block)
  return row
}
