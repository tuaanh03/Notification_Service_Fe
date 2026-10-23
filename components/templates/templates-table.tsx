'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileWarning, Files, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadTemplatesAction } from '@/app/templates/actions'
import { loadTemplateSendStatsAction } from '@/app/templates/stats-actions'
import { useApp } from '@/components/app-context'
import { useRole } from '@/components/role-context'
import { AppLink, useAppRouter } from '@/components/app-link'
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

/** Số liệu 30 ngày ở hai cột cuối (UX-24) — template chưa gửi thì vắng mặt trong map. */
const STATS_DAYS = 30
type SendStats = { sent: number; tracked: number; opened: number }
type Row = TemplateSummaryDto & { stats?: SendStats | undefined } & Record<string, unknown>

/** Ô số liệu dẫn thẳng tới tab Hiệu quả; chặn bấm dòng để không mở tab Soạn đè lên. */
function StatsLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AppLink
      href={`/templates/${encodeURIComponent(id)}?tab=stats`}
      onClick={(e) => e.stopPropagation()}
      className="tabular-nums underline-offset-2 hover:text-[var(--starlight)] hover:underline"
    >
      {children}
    </AppLink>
  )
}

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
  { key: 'variableCount', label: tt('colVariables'), numeric: true, hideBelow: 'xl' },
  {
    key: 'stats',
    label: tt('colSent30', { days: STATS_DAYS }),
    numeric: true,
    hideBelow: 'lg',
    render: (t) => <StatsLink id={t.id}>{t.stats?.sent ?? 0}</StatsLink>,
  },
  {
    key: 'openRate',
    label: tt('colOpenRate'),
    numeric: true,
    hideBelow: 'lg',
    render: (t) =>
      t.stats && t.stats.tracked > 0 ? (
        <StatsLink id={t.id}>{Math.round((t.stats.opened / t.stats.tracked) * 1000) / 10}%</StatsLink>
      ) : (
        <span className="text-[var(--text-muted)]">—</span>
      ),
  },
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
  const [sendStats, setSendStats] = useState<Map<string, SendStats>>(new Map())

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

  // Số liệu 30 ngày cho hai cột cuối — lỗi ở đây không chặn bảng, chỉ để ô trống.
  useEffect(() => {
    let live = true
    loadTemplateSendStatsAction(appId, STATS_DAYS).then((result) => {
      if (live) setSendStats(new Map(result.ok ? result.data.rows.map((r) => [r.templateId, r] as const) : []))
    })
    return () => {
      live = false
    }
  }, [appId])

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

  const filtered = (rows ?? []).filter((t) => status === '' || t.status === status).map((t) => ({ ...t, stats: sendStats.get(t.id) }))
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
