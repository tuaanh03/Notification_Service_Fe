import { Panel } from '@/components/panel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TABLE_HEADER_CLASS } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * Mảnh dựng trang Hướng dẫn tích hợp (`/developers/guide`). Không hook, không state — dùng được cả trong Server
 * Component. Nội dung hai ngôn ngữ (`guide-vi.tsx` / `guide-en.tsx`) chỉ ghép các mảnh này, không tự đặt class màu.
 */

export type GuideSection = {
  id: string
  title: string
  /** Mục con hiện trong mục lục — `id` phải trùng `<Sub id>` trong `body`. */
  sub?: { id: string; title: string }[]
  body: React.ReactNode
}

export type GuideDoc = {
  title: string
  subtitle: string
  tocLabel: string
  sections: GuideSection[]
}

/** Định danh trong câu: route, mã lỗi, trường JSON — luôn mono (CLAUDE.md §1). */
export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-px font-mono text-[0.86em] break-words">{children}</code>
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[72ch] text-sm leading-6 text-[var(--text-secondary)]">{children}</p>
}

export function List({ items, ordered = false }: { items: React.ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={cn('max-w-[72ch] space-y-1 pl-5 text-sm leading-6 text-[var(--text-secondary)]', ordered ? 'list-decimal' : 'list-disc')}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  )
}

export function Sub({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-20 pt-3 text-base font-semibold text-[var(--text-primary)]">
      {children}
    </h3>
  )
}

/** Các bước có thứ tự thật — số đếm là thông tin, không phải trang trí. */
export function Steps({ items }: { items: { title: React.ReactNode; detail: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
          <span className="grid size-6 place-items-center rounded-full border font-mono text-[11px] font-semibold tabular-nums text-[var(--starlight)]">
            {i + 1}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-[var(--text-primary)]">{s.title}</p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

const NOTE_TONE = { info: 'var(--starlight)', warn: 'var(--solar)' } as const

export function Note({ tone = 'info', title, children }: { tone?: keyof typeof NOTE_TONE; title: string; children: React.ReactNode }) {
  return (
    <Panel className="space-y-1 px-4 py-3">
      <p className="text-xs font-semibold" style={{ color: NOTE_TONE[tone] }}>
        {title}
      </p>
      <div className="text-xs leading-5 text-[var(--text-secondary)]">{children}</div>
    </Panel>
  )
}

export function DocTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <Panel className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader className={TABLE_HEADER_CLASS}>
          <TableRow className="hover:bg-transparent">
            {head.map((h) => (
              <TableHead key={h} className="px-3">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="border-[var(--orbit)]">
              {row.map((cell, j) => (
                <TableCell key={j} className={cn('min-w-32 px-3 align-top whitespace-normal', j > 0 && 'text-[var(--text-secondary)]')}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}

/** Màu phương thức — cùng bảng với thẻ route của trang API (`operation-card.tsx`). */
const METHOD_COLOR: Record<string, string> = {
  GET: 'var(--starlight)',
  POST: 'var(--aurora)',
  PUT: 'var(--solar)',
  PATCH: 'var(--solar)',
  DELETE: 'var(--supernova)',
}

export function Route({ method, path }: { method: keyof typeof METHOD_COLOR | string; path: string }) {
  const color = METHOD_COLOR[method] ?? 'var(--text-secondary)'
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className="inline-flex w-14 shrink-0 justify-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ color, borderColor: `color-mix(in srgb, ${color} 33%, transparent)` }}
      >
        {method}
      </span>
      <code className="font-mono text-xs break-all text-[var(--text-primary)]">{path}</code>
    </span>
  )
}

/** Một cách tích hợp: chiều đi + tên + một câu + header xác thực. */
export function PathCard({ direction, tone, title, body, auth }: { direction: string; tone: string; title: string; body: string; auth: string }) {
  return (
    <Panel className="flex flex-col gap-2 p-4">
      <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: tone }}>
        {direction}
      </span>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">{body}</p>
      <code className="mt-auto font-mono text-[11px] break-all text-[var(--text-primary)]">{auth}</code>
    </Panel>
  )
}

/** Ô của bảng "Tuỳ biến": có / một phần / không — màu kèm chữ, không chỉ màu. */
export function Mark({ kind, children }: { kind: 'yes' | 'part' | 'no'; children: React.ReactNode }) {
  const color = kind === 'yes' ? 'var(--aurora)' : kind === 'part' ? 'var(--solar)' : 'var(--supernova)'
  return (
    <span className="font-semibold" style={{ color }}>
      {children}
    </span>
  )
}
