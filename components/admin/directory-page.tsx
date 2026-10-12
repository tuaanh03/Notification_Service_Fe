'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, ContactRound, Eye, EyeOff, PlugZap, RefreshCw, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { loadDirectoryAction, setMemberListedAction, syncDirectoryAction } from '@/app/admin/directory/actions'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { DirectoryPersonDto } from '@/lib/api/types'

type Row = DirectoryPersonDto & Record<string, unknown>
type Listed = '' | 'yes' | 'no'

/** Bằng trần một lô tích của backend (100) — "cả trang" luôn gửi được trong một lời gọi. */
const PAGE_SIZE = 50

/**
 * Màn Danh bạ của Super Admin (ADR-0027 của backend, bổ sung). Mọi tài khoản EWS; Super Admin tích ai
 * thì người đó hiện trong hộp "Thêm thành viên" của các tổ chức. Người mới từ đồng bộ M365 vào ở trạng
 * thái ẩn. Bỏ tích không gỡ ai khỏi tổ chức đang ở.
 */
export function DirectoryPage() {
  const t = useTranslations('directory')
  const tc = useTranslations('common')
  const te = useTranslations('errors')

  const [rows, setRows] = useState<DirectoryPersonDto[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  /** Ô tìm đang gõ — chỉ áp dụng khi bấm Tìm, để mỗi phím không thành một lời gọi. */
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [listed, setListed] = useState<Listed>('')
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Id đang chờ backend ghi — khoá ô tích của họ cho tới khi xong. */
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [syncing, startSync] = useTransition()

  const load = useCallback(async () => {
    const result = await loadDirectoryAction({ limit: PAGE_SIZE, offset, q: query, ...(listed ? { listed } : {}) })
    if (result.ok) {
      setRows(result.data.items)
      setTotal(result.data.total)
      setLoadError(null)
    } else {
      setRows(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [offset, query, listed, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  const search = () => {
    setOffset(0)
    setQuery(draft.trim())
  }

  /** Ghi cờ cho một lô; hiện ngay trên bảng, backend từ chối thì trả lại như cũ. */
  const apply = async (ids: string[], next: boolean): Promise<boolean> => {
    if (ids.length === 0) return false
    const before = rows
    setRows((rs) => rs?.map((r) => (ids.includes(r.adminId) ? { ...r, memberListed: next } : r)) ?? rs)
    setSaving((s) => new Set([...s, ...ids]))
    const res = await setMemberListedAction(ids, next)
    setSaving((s) => new Set([...s].filter((id) => !ids.includes(id))))
    if (!res.ok) {
      setRows(before)
      toast.error(res.message)
      return false
    }
    // Đang lọc theo cờ thì dòng vừa đổi không còn thuộc bộ lọc — đọc lại trang.
    if (listed) startTransition(load)
    return true
  }

  const applyPage = (next: boolean) => {
    const ids = (rows ?? []).filter((r) => r.memberListed !== next).map((r) => r.adminId)
    void apply(ids, next).then((ok) => {
      if (ok) toast.success(t(next ? 'pageShown' : 'pageHidden', { count: ids.length }))
    })
  }

  const sync = () =>
    startSync(async () => {
      const res = await syncDirectoryAction()
      if (!res.ok) return void toast.error(res.message)
      toast.success(t('synced', res.data))
      if (res.data.created > 0) toast.info(t('syncedHidden', { count: res.data.created }))
      if (res.data.conflicts > 0) toast.warning(t('syncConflicts', { count: res.data.conflicts }))
      await load()
    })

  const columns: Column<Row>[] = [
    {
      key: 'email',
      label: t('colPerson'),
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.displayName ?? r.email}</p>
          {r.displayName && <p className="truncate text-[11px] text-[var(--text-muted)]">{r.email}</p>}
        </div>
      ),
    },
    {
      key: 'm365Linked',
      label: t('colAccount'),
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.isSuperAdmin && (
            <Badge variant="outline" className="border-[var(--solar)]/30 text-[10px] text-[var(--solar)]">
              Super Admin
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {r.m365Linked ? t('m365') : t('passwordOnly')}
          </Badge>
        </span>
      ),
    },
    {
      key: 'memberListed',
      label: t('colListed'),
      align: 'right',
      render: (r) => (
        <label className="flex cursor-pointer items-center justify-end gap-2 pr-4 text-xs text-[var(--text-secondary)]">
          {r.memberListed ? t('shown') : t('hidden')}
          <Checkbox
            checked={r.memberListed}
            disabled={saving.has(r.adminId)}
            onCheckedChange={(c) => void apply([r.adminId], c === true)}
            aria-label={t('listedFor', { email: r.email })}
          />
        </label>
      ),
    },
  ]

  const to = Math.min(offset + PAGE_SIZE, total)
  const hasRows = (rows ?? []).length > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCw className={syncing ? 'animate-spin' : undefined} />
            {syncing ? t('syncing') : t('sync')}
          </Button>
        }
      />

      {loadError ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={loadError} />
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={search} disabled={pending}>
              <Search /> {tc('search')}
            </Button>
            <NativeSelect
              value={listed}
              onChange={(e) => {
                setOffset(0)
                setListed(e.target.value as Listed)
              }}
              aria-label={t('filterLabel')}
            >
              <NativeSelectOption value="">{tc('all')}</NativeSelectOption>
              <NativeSelectOption value="yes">{t('filterShown')}</NativeSelectOption>
              <NativeSelectOption value="no">{t('filterHidden')}</NativeSelectOption>
            </NativeSelect>
            {(query || listed) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft('')
                  setQuery('')
                  setListed('')
                  setOffset(0)
                }}
              >
                {tc('clearFilters')}
              </Button>
            )}
            {hasRows && (
              <span className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPage(true)} disabled={pending || saving.size > 0}>
                  <Eye /> {t('showPage')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPage(false)} disabled={pending || saving.size > 0}>
                  <EyeOff /> {t('hidePage')}
                </Button>
              </span>
            )}
          </div>

          <DataTable<Row>
            hideSearch
            columns={columns}
            rows={(rows ?? []) as Row[]}
            empty={
              <EmptyState
                icon={ContactRound}
                title={query || listed ? t('notFound') : t('emptyTitle')}
                description={query || listed ? t('noMatch') : t('emptyBody')}
              />
            }
          />

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="font-mono tabular-nums">
                {offset + 1}–{to} / {total}
              </span>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || pending}
                  onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}
                >
                  <ChevronLeft /> {tc('prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={to >= total || pending}
                  onClick={() => setOffset((v) => v + PAGE_SIZE)}
                >
                  {tc('next')} <ChevronRight data-icon="inline-end" />
                </Button>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
