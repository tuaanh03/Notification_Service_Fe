'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Files, Sparkles } from 'lucide-react'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill } from '@/components/status-pill'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/components/app-context'
import { schemaOf, templateBindings, templates, type Template } from '@/lib/mock-data'

type Row = Template & Record<string, unknown> & { varCount: number; bindingCount: number; status: 'active' | 'archived' }

const columns: Column<Row>[] = [
  {
    key: 'key',
    label: 'template_key',
    mono: true,
    render: (t) => (
      <span className="font-mono text-xs font-semibold text-[var(--starlight)]">
        {t.key}
        {t.ai_generated && (
          <Badge variant="outline" className="ml-2 border-[var(--pulsar)]/40 font-mono text-[10px] text-[var(--pulsar)]">
            <Sparkles data-icon="inline-start" /> ai_generated
          </Badge>
        )}
      </span>
    ),
  },
  { key: 'name', label: 'Tên', render: (t) => t.name ?? '—' },
  { key: 'channel', label: 'Kênh', mono: true, render: (t) => t.channel ?? 'email' },
  { key: 'status', label: 'Trạng thái', render: (t) => <StatusPill status={t.status} /> },
  { key: 'published', label: 'Version đang published', mono: true, render: (t) => t.published ?? <span className="text-[var(--text-muted)]">— (draft)</span> },
  { key: 'varCount', label: 'Số biến', numeric: true },
  {
    key: 'bindingCount',
    label: 'Số binding',
    numeric: true,
    render: (t) =>
      t.bindingCount === 0 ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex cursor-help font-mono text-xs font-bold text-[var(--solar)] underline decoration-dotted" />}>
            0
          </TooltipTrigger>
          <TooltipContent>Chưa gắn vào topic nào</TooltipContent>
        </Tooltip>
      ) : (
        <span className="font-mono text-xs tabular-nums">{t.bindingCount}</span>
      ),
  },
  { key: 'updated_by', label: 'Cập nhật bởi', mono: true, render: (t) => t.updated_by ?? '—' },
]

/** UC-006 §A — list template; 0 binding = viền gạch đứt + hint. */
export function TemplatesTable() {
  const router = useRouter()
  const { app } = useApp()
  const [channel, setChannel] = useState<string[]>([])
  const [status, setStatus] = useState<string[]>([])
  const [bound, setBound] = useState<string[]>([])
  const rows = useMemo<Row[]>(
    () =>
      templates
        .filter((t) => !t.namespace || t.namespace === app.namespace)
        .map((t) => ({
          ...t,
          status: t.status ?? 'active',
          varCount: schemaOf(t).length,
          bindingCount: templateBindings.filter((b) => b.template_key === t.key).length,
        })),
    [app.namespace],
  )
  const filtered = rows.filter(
    (t) =>
      (channel.length === 0 || channel.includes(t.channel ?? 'email')) &&
      (status.length === 0 || status.includes(t.status)) &&
      (bound.length === 0 || (bound.includes('bound') && t.bindingCount > 0) || (bound.includes('unbound') && t.bindingCount === 0)),
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup multiple variant="outline" size="sm" value={channel} onValueChange={(v) => setChannel(v as string[])} aria-label="Kênh">
          <ToggleGroupItem value="email" className="font-mono">email</ToggleGroupItem>
          <ToggleGroupItem value="in_app" className="font-mono">in_app</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup multiple variant="outline" size="sm" value={status} onValueChange={(v) => setStatus(v as string[])} aria-label="Trạng thái">
          <ToggleGroupItem value="active" className="font-mono">active</ToggleGroupItem>
          <ToggleGroupItem value="archived" className="font-mono">archived</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup variant="outline" size="sm" value={bound} onValueChange={(v) => setBound(v as string[])} aria-label="Binding">
          <ToggleGroupItem value="bound">Có binding</ToggleGroupItem>
          <ToggleGroupItem value="unbound">Chưa bind</ToggleGroupItem>
        </ToggleGroup>
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{filtered.length}/{rows.length}</span>
      </div>
      <DataTable<Row>
        columns={columns}
        rows={filtered}
        onRowClick={(t) => router.push(`/templates/${t.key}`)}
        rowClassName={(t) => (t.bindingCount === 0 ? 'border-dashed border-[var(--solar)]/40' : undefined)}
        empty={<EmptyState icon={Files} title="Không có template khớp bộ lọc" description="Nới bộ lọc kênh / trạng thái / binding." />}
      />
    </div>
  )
}
