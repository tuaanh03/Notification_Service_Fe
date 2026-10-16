'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, MailX, PlugZap, Search, Upload, UserPlus, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadRecipientsAction } from '@/app/users/actions'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { useRole } from '@/components/role-context'
import { AddRecipientDialog } from '@/components/users/add-recipient-dialog'
import { useSuppressedLabel } from '@/components/users/recipient-preferences'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { RecipientDto } from '@/lib/api/types'

type Row = RecipientDto & Record<string, unknown>

const PAGE_SIZE = 25

/**
 * UC-002 §A — màn Người nhận, đọc dữ liệu thật (`implementation_plan.md` §5, ĐX-0004).
 *
 * Người nhận chủ yếu do app service khai qua `/v1`. Người quản lý app (`canManage`) thêm TAY được
 * từng người (mã + email); Nhập CSV chưa có — mục trong menu để mờ.
 *
 * Bấm một dòng -> trang chi tiết `/users/[id]` (cài đặt nhận tin + các lần gửi của người đó).
 */
export function UsersPage() {
  const t = useTranslations('recipients')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const suppressedLabel = useSuppressedLabel()
  const router = useAppRouter()
  const { app } = useApp()
  const appId = app.app_id
  const writable = useRole().canManage(app)
  const [adding, setAdding] = useState(false)

  const [rows, setRows] = useState<RecipientDto[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  /** Ô tìm đang gõ — chỉ áp dụng khi bấm Tìm, để mỗi phím không thành một lời gọi. */
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadRecipientsAction(appId, { limit: PAGE_SIZE, offset, q: query })
    if (result.ok) {
      setRows(result.data.rows)
      setTotal(result.data.total)
      setLoadError(null)
    } else {
      setRows(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, offset, query, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  // Đổi app là đổi hẳn sổ người nhận — về trang đầu, xoá ô tìm.
  useEffect(() => {
    setOffset(0)
    setDraft('')
    setQuery('')
  }, [appId])

  const search = () => {
    setOffset(0)
    setQuery(draft.trim())
  }

  const columns: Column<Row>[] = [
    { key: 'externalId', label: t('colExternalId'), mono: true },
    {
      key: 'email',
      label: t('colEmail'),
      render: (row) =>
        row.email ? (
          <span className="font-mono text-xs">{row.email.address}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <MailX className="size-3.5" /> {t('noEmail')}
          </span>
        ),
    },
    {
      key: 'userId',
      label: t('colState'),
      render: (row) =>
        row.email ? (
          <span className="flex items-center gap-2">
            <StatusPill status={row.email.status} />
            {row.email.suppressedReason && (
              <span className="text-[11px] text-[var(--text-muted)]">
                {suppressedLabel(row.email.suppressedReason)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: 'createdAt',
      label: t('colOptedOut'),
      render: (row) =>
        row.email?.optedOutOptional ? (
          <span className="text-xs text-[var(--solar)]">{t('yes')}</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">{t('no')}</span>
        ),
    },
  ]

  const to = Math.min(offset + PAGE_SIZE, total)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { app: app.name })}
        actions={
          writable ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button>
                    {t('addMenu')} <ChevronDown />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1 bg-popover border border-border shadow-md">
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setAdding(true)}>
                  <UserPlus className="size-3.5 mr-1.5" /> {t('addManual')}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" disabled>
                  <Upload className="size-3.5 mr-1.5" /> {t('importCsv')}
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">{t('soon')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />
      <AddRecipientDialog
        open={adding}
        appId={appId}
        onClose={() => setAdding(false)}
        onCreated={(r) => router.push(`/users/${encodeURIComponent(r.externalId)}`)}
      />

      {loadError ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={loadError} />
        </Panel>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder={t('searchPlaceholder')}
              className="max-w-xs font-mono"
            />
            <Button variant="outline" size="sm" onClick={search} disabled={pending}>
              <Search /> {tc('search')}
            </Button>
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft('')
                  setQuery('')
                  setOffset(0)
                }}
              >
                {tc('clearFilters')}
              </Button>
            )}
          </div>

          <DataTable<Row>
            hideSearch
            columns={columns}
            rows={(rows ?? []) as Row[]}
            onRowClick={(row) => router.push(`/users/${encodeURIComponent(row.externalId)}`)}
            empty={
              <EmptyState
                icon={Users}
                title={query ? t('notFound') : t('emptyTitle')}
                description={query ? t('noMatch', { query }) : t('emptyBody')}
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
