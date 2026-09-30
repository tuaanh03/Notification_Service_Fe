'use client'
import { useCallback, useEffect, useState } from 'react'
import { FileWarning, Files } from 'lucide-react'
import { loadTemplatesAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateSummaryDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

type Row = TemplateSummaryDto & Record<string, unknown>

const columns: Column<Row>[] = [
  { key: 'name', label: 'Tên', render: (t) => <span className="font-medium">{t.name}</span> },
  { key: 'status', label: 'Trạng thái', render: (t) => <StatusPill status={t.status} /> },
  {
    key: 'publishedVersion',
    label: 'Đang xuất bản',
    mono: true,
    render: (t) =>
      t.publishedVersion === null ? (
        <span className="text-[var(--text-muted)]">— chưa, app chưa gửi được</span>
      ) : (
        <span className="font-mono">v{t.publishedVersion}</span>
      ),
  },
  {
    key: 'draftVersion',
    label: 'Nháp',
    mono: true,
    render: (t) => (t.draftVersion === null ? <span className="text-[var(--text-muted)]">—</span> : <span className="font-mono">v{t.draftVersion}</span>),
  },
  { key: 'variableCount', label: 'Số biến', numeric: true },
  { key: 'updatedAt', label: 'Cập nhật', mono: true, render: (t) => fmtDateTime(t.updatedAt) },
]

/** Danh sách template thật của app đang chọn — bấm dòng mở màn soạn `/templates/[id]`. */
export function TemplatesTable() {
  const { app } = useApp()
  const router = useAppRouter()
  const [rows, setRows] = useState<TemplateSummaryDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string[]>(['active'])

  const appId = app.app_id
  const load = useCallback(async () => {
    const result = await loadTemplatesAction(appId)
    if (result.ok) {
      setRows(result.data)
      setError(null)
    } else {
      setRows(null)
      setError(`${result.message} (mã: ${result.code})`)
    }
  }, [appId])

  // Đổi app là đổi hẳn tập template: xoá dữ liệu cũ trước khi nạp.
  useEffect(() => {
    setRows(null)
    setError(null)
    void load()
  }, [load])

  if (error) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Không tải được danh sách template"
        description={error}
        action={<Button variant="outline" onClick={() => void load()}>Thử lại</Button>}
      />
    )
  }

  const filtered = (rows ?? []).filter((t) => status.length === 0 || status.includes(t.status))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup multiple variant="outline" size="sm" value={status} onValueChange={(v) => setStatus(v as string[])} aria-label="Trạng thái">
          <ToggleGroupItem value="active" className="font-mono">active</ToggleGroupItem>
          <ToggleGroupItem value="archived" className="font-mono">archived</ToggleGroupItem>
        </ToggleGroup>
        {rows && <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{filtered.length}/{rows.length}</span>}
      </div>
      <DataTable<Row>
        columns={columns}
        rows={filtered as Row[]}
        onRowClick={(t) => router.push(`/templates/${t.id}`)}
        empty={
          rows === null ? (
            <EmptyState icon={Files} title="Đang tải…" description="" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Files}
              title="App chưa có template nào"
              description="Tạo template, soạn nội dung rồi Xuất bản — sau đó đưa templateId cho đội app."
              action={<Button onClick={() => router.push('/templates/new')}>Tạo template</Button>}
            />
          ) : (
            <EmptyState icon={Files} title="Không có template khớp bộ lọc" description="Bỏ bớt bộ lọc trạng thái." />
          )
        }
      />
    </div>
  )
}
