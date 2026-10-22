'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileWarning, Files, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadTemplatesAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import { useAppRouter } from '@/components/app-link'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { StatusTabs } from '@/components/status-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { TemplateSummaryDto } from '@/lib/api/types'
import { isTemplateCategory, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/template-categories'
import { fmtDateTime } from '@/lib/time'

/** Chờ người gõ ngừng một chút rồi mới hỏi backend — không gọi mỗi phím. */
const SEARCH_DEBOUNCE_MS = 300

type Row = TemplateSummaryDto & Record<string, unknown>

/** Cột của bảng — trong hook vì nhãn theo ngôn ngữ đang chọn. */
function useColumns(): Column<Row>[] {
  const tt = useTranslations('templates')
  const tcat = useTranslations('templateCategory')
  return [
  { key: 'name', label: tt('colName'), render: (t) => <span className="font-medium">{t.name}</span> },
  {
    key: 'category',
    label: tt('colCategory'),
    render: (t) => <span className="text-[var(--text-secondary)]">{isTemplateCategory(t.category) ? tcat(t.category) : t.category}</span>,
  },
  { key: 'status', label: tt('colStatus'), render: (t) => <StatusPill status={t.status} /> },
  {
    key: 'publishedVersion',
    label: tt('colPublished'),
    render: (t) =>
      t.publishedVersion === null ? (
        <span className="text-[var(--text-muted)]">{tt('notPublished')}</span>
      ) : (
        <span className="tabular-nums">v{t.publishedVersion}</span>
      ),
  },
  {
    key: 'draftVersion',
    label: tt('colDraft'),
    render: (t) => (t.draftVersion === null ? <span className="text-[var(--text-muted)]">—</span> : <span className="tabular-nums">v{t.draftVersion}</span>),
  },
  { key: 'variableCount', label: tt('colVariables'), numeric: true },
  { key: 'updatedAt', label: tt('colUpdated'), render: (t) => <span className="tabular-nums">{fmtDateTime(t.updatedAt)}</span> },
]
}

/**
 * Danh sách template thật của app đang chọn — bấm dòng mở màn soạn `/templates/[id]`.
 * Nhóm + ô tìm lọc ở BACKEND (so tên theo collation: "canh bao" ra "Cảnh báo"); trạng thái lọc tại chỗ.
 */
export function TemplatesTable() {
  const tt = useTranslations('templates')
  const tc = useTranslations('common')
  const tcat = useTranslations('templateCategory')
  const statusLabel = useStatusLabel()
  const te = useTranslations('errors')
  const columns = useColumns()
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const router = useAppRouter()
  const [rows, setRows] = useState<TemplateSummaryDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** `''` = tất cả. Mặc định chỉ template đang dùng. */
  const [status, setStatus] = useState('active')
  const [category, setCategory] = useState<TemplateCategory | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const appId = app.app_id
  /** Lần nạp mới nhất — kết quả của lần cũ về muộn (đổi bộ lọc liên tục) thì bỏ. */
  const latest = useRef(0)
  const load = useCallback(async () => {
    const seq = ++latest.current
    const result = await loadTemplatesAction(appId, { ...(category ? { category } : {}), ...(search ? { search } : {}) })
    if (seq !== latest.current) return
    if (result.ok) {
      setRows(result.data)
      setError(null)
    } else {
      setRows(null)
      setError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, category, search, te])

  // Đổi app / bộ lọc là đổi hẳn tập template: xoá dữ liệu cũ trước khi nạp.
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

  const filtered = (rows ?? []).filter((t) => status === '' || t.status === status)
  const countOf = (s: string) => (rows ?? []).filter((t) => t.status === s).length
  const filtering = category !== '' || search !== ''
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tt('search')}
            aria-label={tt('search')}
            maxLength={200}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <NativeSelect
          size="sm"
          value={category}
          onChange={(e) => setCategory(isTemplateCategory(e.target.value) ? e.target.value : '')}
          aria-label={tt('category')}
        >
          <NativeSelectOption value="">{tt('allCategories')}</NativeSelectOption>
          {TEMPLATE_CATEGORIES.map((c) => (
            <NativeSelectOption key={c} value={c}>{tcat(c)}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <StatusTabs
        label={tt('colStatus')}
        value={status}
        onChange={setStatus}
        tabs={[
          { value: 'active', label: statusLabel('active'), count: countOf('active') },
          { value: 'archived', label: statusLabel('archived'), count: countOf('archived') },
          { value: '', label: tc('all'), count: rows?.length ?? 0 },
        ]}
      />
      <DataTable<Row>
        columns={columns}
        rows={filtered as Row[]}
        onRowClick={(t) => router.push(`/templates/${t.id}`)}
        // Đã có ô "Tìm theo tên" (tìm ở backend) phía trên — ô lọc của bảng thành ô thứ hai trông giống mà tìm khác.
        hideSearch
        empty={
          rows === null ? (
            <EmptyState icon={Files} title={tt('loading')} description="" />
          ) : rows.length === 0 && !filtering ? (
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
