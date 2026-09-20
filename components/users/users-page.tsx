'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, MailX, PlugZap, Search, Users } from 'lucide-react'
import { loadPreferencesAction, loadRecipientsAction } from '@/app/users/actions'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
import { RecipientPreferences } from '@/components/users/recipient-preferences'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RecipientDto, UserPreferencesDto } from '@/lib/api/types'
import { fmtIso } from '@/lib/mock-data'

type Row = RecipientDto & Record<string, unknown>

const PAGE_SIZE = 25

/** Vì sao địa chỉ không dùng được nữa — chữ cho người vận hành, không phải mã kỹ thuật. */
const SUPPRESSED_LABEL: Readonly<Record<string, string>> = {
  user_unsubscribe: 'người dùng tự ngắt',
  hard_bounce: 'thư dội về vĩnh viễn',
  complaint: 'bị báo là thư rác',
}

/**
 * UC-002 §A — màn Người nhận, đọc dữ liệu thật (`implementation_plan.md` §5, ĐX-0004).
 *
 * CHỈ ĐỌC. Không có Thêm / Import CSV / Xuất CSV: backend không có đường nào cho chúng, và
 * người nhận là do app service khai qua `/v1`, không phải quản trị nhập tay.
 */
export function UsersPage() {
  const { app } = useApp()
  const appId = app.app_id

  const [rows, setRows] = useState<RecipientDto[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  /** Ô tìm đang gõ — chỉ áp dụng khi bấm Tìm, để mỗi phím không thành một lời gọi. */
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RecipientDto | null>(null)
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadRecipientsAction(appId, { limit: PAGE_SIZE, offset, q: query })
    if (result.ok) {
      setRows(result.data.rows)
      setTotal(result.data.total)
      setLoadError(null)
    } else {
      setRows(null)
      setLoadError(`${result.message} (mã: ${result.code})`)
    }
  }, [appId, offset, query])

  useEffect(() => {
    startTransition(load)
  }, [load])

  // Đổi app là đổi hẳn sổ người nhận — bỏ chọn, về trang đầu, xoá ô tìm.
  useEffect(() => {
    setSelected(null)
    setPreferences(null)
    setOffset(0)
    setDraft('')
    setQuery('')
  }, [appId])

  const open = (row: RecipientDto) =>
    startTransition(async () => {
      setSelected(row)
      setPreferences(null)
      setDetailError(null)
      const result = await loadPreferencesAction(appId, row.externalId)
      if (result.ok) setPreferences(result.data)
      else setDetailError(`${result.message} (mã: ${result.code})`)
    })

  const search = () => {
    setOffset(0)
    setQuery(draft.trim())
  }

  const columns: Column<Row>[] = [
    { key: 'externalId', label: 'Mã nhân viên (của app)', mono: true },
    {
      key: 'email',
      label: 'Email',
      render: (row) =>
        row.email ? (
          <span className="font-mono text-xs">{row.email.address}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <MailX className="size-3.5" /> chưa khai email
          </span>
        ),
    },
    {
      key: 'userId',
      label: 'Tình trạng',
      render: (row) =>
        row.email ? (
          <span className="flex items-center gap-2">
            <StatusPill status={row.email.status} />
            {row.email.suppressedReason && (
              <span className="text-[11px] text-[var(--text-muted)]">
                {SUPPRESSED_LABEL[row.email.suppressedReason] ?? row.email.suppressedReason}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Tắt mọi tin không bắt buộc',
      render: (row) =>
        row.email?.optedOutOptional ? (
          <span className="text-xs text-[var(--solar)]">có</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">không</span>
        ),
    },
  ]

  const to = Math.min(offset + PAGE_SIZE, total)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Người nhận"
        subtitle={`Người nhận mà ${app.name} đã khai báo qua API. Màn này chỉ đọc.`}
      />

      {loadError ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title="Không đọc được dữ liệu từ API" description={loadError} />
        </Panel>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Tìm theo mã nhân viên…"
              className="max-w-xs font-mono"
            />
            <Button variant="outline" size="sm" onClick={search} disabled={pending}>
              <Search /> Tìm
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
                Bỏ lọc
              </Button>
            )}
          </div>

          <DataTable<Row>
            hideSearch
            columns={columns}
            rows={(rows ?? []) as Row[]}
            onRowClick={open}
            rowClassName={(row) => (row.externalId === selected?.externalId ? 'bg-sidebar-accent' : undefined)}
            empty={
              <EmptyState
                icon={Users}
                title={query ? 'Không tìm thấy' : 'Chưa có người nhận nào'}
                description={
                  query
                    ? `Không có mã nhân viên nào khớp «${query}».`
                    : 'App service chưa khai báo người nhận nào qua PUT /v1/users/:externalId.'
                }
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
                  <ChevronLeft /> Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={to >= total || pending}
                  onClick={() => setOffset((v) => v + PAGE_SIZE)}
                >
                  Sau <ChevronRight data-icon="inline-end" />
                </Button>
              </span>
            </div>
          )}

          {selected && (
            <RecipientPreferences
              recipient={selected}
              preferences={preferences}
              error={detailError}
              loading={pending && preferences === null && detailError === null}
              onClose={() => {
                setSelected(null)
                setPreferences(null)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
