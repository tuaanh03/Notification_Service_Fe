'use client'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Panel } from './panel'

export type Column<T> = {
  key: keyof T
  label: string
  /** identifier column → font-mono */
  mono?: boolean
  /** numeric column → font-mono + tabular-nums, right-aligned */
  numeric?: boolean
  /** cột thao tác (nút ⋯) → tiêu đề và ô cùng căn phải, cột co vừa nội dung */
  align?: 'right'
  /** custom cell (e.g. <StatusPill>); default renders String(value) */
  render?: (row: T, index: number) => React.ReactNode
}

/** Bảng dữ liệu dày (13px / row 44px) trên shadcn <Table>; glass chỉ ở container <Panel>, không ở row. */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  empty,
  rowClassName,
  filterKey,
  chipLabel,
  toolbarActions,
  searchPlaceholder,
  hideSearch,
}: {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  empty?: React.ReactNode
  /** class thêm cho từng row (viền cảnh báo, highlight…) */
  rowClassName?: (row: T) => string | undefined
  /** cột dùng làm filter chip (01 §2 "per-column filter chips"): chip = giá trị duy nhất của cột, kèm count */
  filterKey?: keyof T
  /** Chữ trên nút lọc theo giá trị thô (dịch trạng thái / vai). Bỏ trống = hiện nguyên giá trị. */
  chipLabel?: (value: string) => string
  toolbarActions?: React.ReactNode
  searchPlaceholder?: string
  /**
   * Ẩn ô lọc dựng sẵn. Dùng khi màn hình đã có ô tìm PHÍA MÁY CHỦ: ô lọc ở đây chỉ lọc trang
   * đang hiển thị, để cạnh nhau là hai ô trông giống nhau nhưng tìm ra kết quả khác nhau.
   */
  hideSearch?: boolean
}) {
  const tc = useTranslations('common')
  const [q, setQ] = useState('')
  const [chip, setChip] = useState<string>('all')
  const chips = filterKey
    ? Array.from(new Set(rows.map((r) => String(r[filterKey] ?? '')))).filter(Boolean)
    : []
  const filtered = rows
    .filter((r) => chip === 'all' || String(r[filterKey!] ?? '') === chip)
    .filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--orbit)] px-4 py-2.5">
        {!hideSearch && (
        <div className="flex flex-1 items-center gap-2 max-w-sm rounded-lg border border-[var(--orbit)] bg-muted/20 px-2.5 py-1">
          <Search className="size-3.5 text-[var(--text-muted)]" />
          <Input
            aria-label={tc('searchLabel')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder ?? tc('filterPlaceholder')}
            className="h-6 border-0 bg-transparent px-1 text-xs focus-visible:ring-0 shadow-none dark:bg-transparent"
          />
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border border-[var(--orbit)] bg-background px-1 font-mono text-[9px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        )}
        {toolbarActions && <div className="ml-auto flex items-center gap-2">{toolbarActions}</div>}
        {filterKey && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button
              size="xs"
              variant={chip === 'all' ? 'secondary' : 'outline'}
              className="rounded-full font-mono"
              onClick={() => setChip('all')}
            >
              {tc('allCount', { count: rows.length })}
            </Button>
            {chips.map((c) => (
              <Button
                key={c}
                size="xs"
                variant={chip === c ? 'secondary' : 'outline'}
                className="rounded-full font-mono"
                onClick={() => setChip(c)}
              >
                {chipLabel ? chipLabel(c) : c} · {rows.filter((r) => String(r[filterKey] ?? '') === c).length}
              </Button>
            ))}
          </div>
        )}
      </div>
      {filtered.length ? (
        <Table className="text-[13px]">
          <TableHeader className="sticky top-0 bg-[var(--deep)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={String(c.key)} className={cn('h-10 px-4 font-medium', c.numeric && 'text-right', c.align === 'right' && 'w-px whitespace-nowrap text-right')}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow
                key={i}
                onClick={() => onRowClick?.(r)}
                className={cn(
                  'h-11 border-[var(--orbit)] hover:bg-[var(--orbit)]',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(r),
                )}
              >
                {columns.map((c) => (
                  <TableCell
                    key={String(c.key)}
                    className={cn(
                      'px-4',
                      c.mono && 'font-mono text-xs',
                      c.numeric && 'text-right font-mono tabular-nums',
                      c.align === 'right' && 'w-px whitespace-nowrap text-right',
                    )}
                  >
                    {c.render ? c.render(r, i) : String(r[c.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        empty
      )}
    </Panel>
  )
}
