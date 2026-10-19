/**
 * Thiết kế kéo-thả của template email — sao đúng KIỂU của backend
 * (`ews-astrolink-api/src/modules/templates/domain/types/email-design.ts`, ADR-0034).
 *
 * File này CHỈ có kiểu + giá trị mặc định + các phép sửa cây (thêm / chuyển / xoá khối). HTML thư do
 * BACKEND sinh (`POST …/templates/design-preview`, lưu nháp) — đừng chép hàm sinh sang đây.
 * Màu trong đây là màu của THƯ (dữ liệu người soạn chọn), không phải token console.
 */

/** Kiểu soạn của một version. `visual` = bộ soạn trực quan GrapesJS (ADR-0036 của backend, `lib/visual-design.ts`). */
export const TEMPLATE_EDITORS = ['blocks', 'html', 'visual'] as const
export type TemplateEditor = (typeof TEMPLATE_EDITORS)[number]

export const DESIGN_FONTS = ['sans', 'serif', 'mono'] as const
export type DesignFont = (typeof DESIGN_FONTS)[number]
export const DESIGN_ALIGNS = ['left', 'center', 'right'] as const
export type DesignAlign = (typeof DESIGN_ALIGNS)[number]
export const DESIGN_BLOCK_TYPES = ['heading', 'text', 'button', 'image', 'divider', 'spacer', 'html'] as const
export type DesignBlockType = (typeof DESIGN_BLOCK_TYPES)[number]

/** Giới hạn của backend (`DESIGN_LIMITS`) — chỉ để khoá nút thêm; backend vẫn là cổng chặn. */
export const DESIGN_LIMITS = { rows: 40, columnsPerRow: 3, blocks: 100 } as const

export type DesignSettings = {
  width: number
  backgroundColor: string
  contentBackgroundColor: string
  textColor: string
  linkColor: string
  fontFamily: DesignFont
}

export type HeadingBlock = { id: string; type: 'heading'; text: string; level: 1 | 2 | 3; align: DesignAlign; color?: string }
export type TextBlock = { id: string; type: 'text'; text: string; align: DesignAlign; color?: string }
export type ButtonBlock = {
  id: string
  type: 'button'
  label: string
  url: string
  align: DesignAlign
  backgroundColor: string
  textColor: string
  borderRadius: number
}
export type ImageBlock = { id: string; type: 'image'; src: string; alt: string; width: number; link: string; align: DesignAlign }
export type DividerBlock = { id: string; type: 'divider'; color: string; thickness: number }
export type SpacerBlock = { id: string; type: 'spacer'; height: number }
export type HtmlBlock = { id: string; type: 'html'; html: string }
export type DesignBlock = HeadingBlock | TextBlock | ButtonBlock | ImageBlock | DividerBlock | SpacerBlock | HtmlBlock

export type DesignColumn = { id: string; blocks: DesignBlock[] }
export type DesignRow = { id: string; backgroundColor?: string; columns: DesignColumn[] }
export type EmailDesign = { version: 1; settings: DesignSettings; rows: DesignRow[] }

export const DEFAULT_SETTINGS: DesignSettings = {
  width: 600,
  backgroundColor: '#f1f5f9',
  contentBackgroundColor: '#ffffff',
  textColor: '#1e293b',
  linkColor: '#2563eb',
  fontFamily: 'sans',
}

export const emptyDesign = (): EmailDesign => ({ version: 1, settings: { ...DEFAULT_SETTINGS }, rows: [] })

/** Id cho khoá kéo-thả — chỉ gọi trong handler (không lúc render, SSR-safe). */
export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

export function newBlock(type: DesignBlockType): DesignBlock {
  const id = newId('b')
  switch (type) {
    case 'heading':
      return { id, type, text: '', level: 1, align: 'left' }
    case 'text':
      return { id, type, text: '', align: 'left' }
    case 'button':
      return { id, type, label: '', url: 'https://', align: 'center', backgroundColor: '#2563eb', textColor: '#ffffff', borderRadius: 6 }
    case 'image':
      return { id, type, src: '', alt: '', width: 100, link: '', align: 'center' }
    case 'divider':
      return { id, type, color: '#e2e8f0', thickness: 1 }
    case 'spacer':
      return { id, type, height: 24 }
    case 'html':
      return { id, type, html: '' }
  }
}

export const newRow = (columns: number): DesignRow => ({
  id: newId('r'),
  columns: Array.from({ length: Math.min(Math.max(columns, 1), DESIGN_LIMITS.columnsPerRow) }, () => ({ id: newId('c'), blocks: [] })),
})

export const countBlocks = (design: EmailDesign) =>
  design.rows.reduce((n, row) => n + row.columns.reduce((m, col) => m + col.blocks.length, 0), 0)

/** Mọi chữ có thể chứa biến — để màn soạn tìm biến đã dùng mà chưa khai. */
export function designTexts(design: EmailDesign): string[] {
  return design.rows.flatMap((row) =>
    row.columns.flatMap((col) =>
      col.blocks.flatMap((b) => {
        switch (b.type) {
          case 'heading':
          case 'text':
            return [b.text]
          case 'button':
            return [b.label, b.url]
          case 'image':
            return [b.alt, b.link]
          case 'html':
            return [b.html]
          default:
            return []
        }
      }),
    ),
  )
}

// ---------------------------------------------------------------- phép sửa cây (thuần, trả bản mới)

export type BlockAddress = { rowId: string; columnId: string; blockId: string }

const mapColumns = (design: EmailDesign, fn: (col: DesignColumn, row: DesignRow) => DesignColumn): EmailDesign => ({
  ...design,
  rows: design.rows.map((row) => ({ ...row, columns: row.columns.map((col) => fn(col, row)) })),
})

export function findBlock(design: EmailDesign, blockId: string): (BlockAddress & { block: DesignBlock }) | null {
  for (const row of design.rows)
    for (const col of row.columns) {
      const block = col.blocks.find((b) => b.id === blockId)
      if (block) return { rowId: row.id, columnId: col.id, blockId, block }
    }
  return null
}

export function columnOf(design: EmailDesign, columnId: string): { row: DesignRow; column: DesignColumn } | null {
  for (const row of design.rows) {
    const column = row.columns.find((c) => c.id === columnId)
    if (column) return { row, column }
  }
  return null
}

export function insertRow(design: EmailDesign, row: DesignRow, index = design.rows.length): EmailDesign {
  const rows = [...design.rows]
  rows.splice(Math.max(0, Math.min(index, rows.length)), 0, row)
  return { ...design, rows }
}

export function moveRow(design: EmailDesign, rowId: string, toIndex: number): EmailDesign {
  const from = design.rows.findIndex((r) => r.id === rowId)
  if (from < 0) return design
  const rows = [...design.rows]
  const [row] = rows.splice(from, 1)
  rows.splice(Math.max(0, Math.min(toIndex, rows.length)), 0, row!)
  return { ...design, rows }
}

export const removeRow = (design: EmailDesign, rowId: string): EmailDesign => ({
  ...design,
  rows: design.rows.filter((r) => r.id !== rowId),
})

/** Nhân bản hàng ngay dưới nó — id mới cho hàng, cột và khối. */
export function duplicateRow(design: EmailDesign, rowId: string): EmailDesign {
  const index = design.rows.findIndex((r) => r.id === rowId)
  const row = design.rows[index]
  if (!row) return design
  const copy: DesignRow = {
    ...row,
    id: newId('r'),
    columns: row.columns.map((c) => ({ id: newId('c'), blocks: c.blocks.map((b) => ({ ...b, id: newId('b') })) })),
  }
  return insertRow(design, copy, index + 1)
}

export const updateRow = (design: EmailDesign, rowId: string, patch: Partial<Omit<DesignRow, 'id' | 'columns'>>): EmailDesign => ({
  ...design,
  rows: design.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
})

/** Đổi số cột: bớt cột thì dồn khối của cột bị bỏ vào cột cuối còn lại — không mất khối nào. */
export function setColumnCount(design: EmailDesign, rowId: string, count: number): EmailDesign {
  return {
    ...design,
    rows: design.rows.map((row) => {
      if (row.id !== rowId) return row
      const n = Math.min(Math.max(count, 1), DESIGN_LIMITS.columnsPerRow)
      if (n === row.columns.length) return row
      if (n > row.columns.length) {
        return { ...row, columns: [...row.columns, ...Array.from({ length: n - row.columns.length }, () => ({ id: newId('c'), blocks: [] }))] }
      }
      const kept = row.columns.slice(0, n).map((c) => ({ ...c, blocks: [...c.blocks] }))
      kept[n - 1]!.blocks.push(...row.columns.slice(n).flatMap((c) => c.blocks))
      return { ...row, columns: kept }
    }),
  }
}

export function insertBlock(design: EmailDesign, columnId: string, block: DesignBlock, index?: number): EmailDesign {
  return mapColumns(design, (col) => {
    if (col.id !== columnId) return col
    const blocks = [...col.blocks]
    blocks.splice(index === undefined ? blocks.length : Math.max(0, Math.min(index, blocks.length)), 0, block)
    return { ...col, blocks }
  })
}

export const removeBlock = (design: EmailDesign, blockId: string): EmailDesign =>
  mapColumns(design, (col) => ({ ...col, blocks: col.blocks.filter((b) => b.id !== blockId) }))

/** Chuyển khối sang cột `columnId`, đứng ở vị trí `index` (tính SAU khi đã gỡ khối khỏi chỗ cũ). */
export function moveBlock(design: EmailDesign, blockId: string, columnId: string, index: number): EmailDesign {
  const found = findBlock(design, blockId)
  if (!found) return design
  return insertBlock(removeBlock(design, blockId), columnId, found.block, index)
}

export function duplicateBlock(design: EmailDesign, blockId: string): EmailDesign {
  const found = findBlock(design, blockId)
  if (!found) return design
  const col = columnOf(design, found.columnId)!.column
  return insertBlock(design, found.columnId, { ...found.block, id: newId('b') }, col.blocks.findIndex((b) => b.id === blockId) + 1)
}

export const updateBlock = (design: EmailDesign, blockId: string, patch: Partial<DesignBlock>): EmailDesign =>
  mapColumns(design, (col) => ({
    ...col,
    blocks: col.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch, id: b.id, type: b.type } as DesignBlock) : b)),
  }))
