'use client'
import { useCallback, useEffect, useState } from 'react'
import { FileWarning, Files } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadTemplatesAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateSummaryDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

type Row = TemplateSummaryDto & Record<string, unknown>

/** Cột của bảng — trong hook vì nhãn theo ngôn ngữ đang chọn. */
function useColumns(): Column<Row>[] {
  const tt = useTranslations('templates')
  return [
  { key: 'name', label: tt('colName'), render: (t) => <span className="font-medium">{t.name}</span> },
  { key: 'status', label: tt('colStatus'), render: (t) => <StatusPill status={t.status} /> },
  {
    key: 'publishedVersion',
    label: tt('colPublished'),
    mono: true,
    render: (t) =>
      t.publishedVersion === null ? (
        <span className="text-[var(--text-muted)]">{tt('notPublished')}</span>
      ) : (
        <span className="font-mono">v{t.publishedVersion}</span>
      ),
  },
  {
    key: 'draftVersion',
    label: tt('colDraft'),
    mono: true,
    render: (t) => (t.draftVersion === null ? <span className="text-[var(--text-muted)]">—</span> : <span className="font-mono">v{t.draftVersion}</span>),
  },
  { key: 'variableCount', label: tt('colVariables'), numeric: true },
  { key: 'updatedAt', label: tt('colUpdated'), mono: true, render: (t) => fmtDateTime(t.updatedAt) },
]
}

/** Danh sách template thật của app đang chọn — bấm dòng mở màn soạn `/templates/[id]`. */
export function TemplatesTable() {
  const tt = useTranslations('templates')
  const tc = useTranslations('common')
  const statusLabel = useStatusLabel()
  const te = useTranslations('errors')
  const columns = useColumns()
  const { app } = useApp()
  const writable = useRole().canManage(app)
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
      setError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

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
        title={tt('loadFailed')}
        description={error}
        action={<Button variant="outline" onClick={() => void load()}>{tt('retry')}</Button>}
      />
    )
  }

  const filtered = (rows ?? []).filter((t) => status.length === 0 || status.includes(t.status))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup multiple variant="outline" size="sm" value={status} onValueChange={(v) => setStatus(v as string[])} aria-label={tt('colStatus')}>
          <ToggleGroupItem value="active">{statusLabel('active')}</ToggleGroupItem>
          <ToggleGroupItem value="archived">{statusLabel('archived')}</ToggleGroupItem>
        </ToggleGroup>
        {rows && <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">{filtered.length}/{rows.length}</span>}
      </div>
      <DataTable<Row>
        columns={columns}
        rows={filtered as Row[]}
        onRowClick={(t) => router.push(`/templates/${t.id}`)}
        empty={
          rows === null ? (
            <EmptyState icon={Files} title={tt('loading')} description="" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Files}
              title={tt('emptyTitle')}
              description={tt('emptyBody')}
              action={writable ? <Button onClick={() => router.push('/templates/new')}>{tt('create')}</Button> : undefined}
            />
          ) : (
            <EmptyState icon={Files} title={tt('noMatchTitle')} description={tt('noMatchBody')} />
          )
        }
      />
    </div>
  )
}
