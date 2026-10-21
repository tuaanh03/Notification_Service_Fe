'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, ChevronRight, ScrollText } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loadAuditEventsAction } from '@/app/admin/audit/actions'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { SourceBadge } from '@/components/source-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { tOr } from '@/i18n/dynamic'
import type { AuditEventDto, AuditEventPageDto } from '@/lib/api/types'
import { AUDIT_GROUP_KEYS, AUDIT_RANGES, type AuditGroup, type AuditRange } from '@/lib/audit-groups'
import { fmtDateTime } from '@/lib/time'

/** Giá trị trong `before` / `after` -> một dòng ngắn (object thành JSON, cắt ở 160 ký tự). */
const show = (v: unknown): string => {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 160 ? `${s.slice(0, 160)}…` : s
}

/** Các trường đổi: có ở `before` thì hiện `cũ → mới`, chỉ có ở `after` thì hiện giá trị mới. */
function changesOf(e: AuditEventDto): { key: string; from?: string; to?: string }[] {
  const keys = [...new Set([...Object.keys(e.before ?? {}), ...Object.keys(e.after ?? {})])]
  return keys.map((key) => ({
    key,
    ...(e.before && key in e.before ? { from: show(e.before[key]) } : {}),
    ...(e.after && key in e.after ? { to: show(e.after[key]) } : {}),
  }))
}

/**
 * Nhật ký hoạt động — ai làm gì, lúc nào, trên đối tượng nào (Super Admin). Lọc theo nhóm sự kiện + khoảng thời gian
 * (lọc ở BACKEND; đổi lọc là tải lại từ đầu), "Xem thêm" đi tiếp bằng con trỏ. Mặc định "Hoạt động quản trị": sự kiện
 * gửi thư chiếm phần lớn bảng, để ở nhóm riêng.
 */
export function AuditLogPage({
  initialGroup,
  initialRange,
  initialPage,
}: {
  initialGroup: AuditGroup
  initialRange: AuditRange
  initialPage: AuditEventPageDto
}) {
  const t = useTranslations('auditLog')
  const ta = useTranslations('auditActions')
  const te = useTranslations('errors')
  const [group, setGroup] = useState(initialGroup)
  const [range, setRange] = useState(initialRange)
  const [items, setItems] = useState(initialPage.items)
  const [total, setTotal] = useState(initialPage.total)
  const [cursor, setCursor] = useState(initialPage.nextCursor)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = (next: { group: AuditGroup; range: AuditRange }, append: boolean) =>
    startTransition(async () => {
      const result = await loadAuditEventsAction({ ...next, ...(append && cursor ? { cursor } : {}) })
      if (!result.ok) {
        setError(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setError(null)
      setItems((cur) => (append ? [...cur, ...result.data.items] : result.data.items))
      setTotal(result.data.total)
      setCursor(result.data.nextCursor)
    })

  /** Đổi lọc: ghi lên đường dẫn (gửi link được), không chuyển trang. */
  const applyFilter = (next: { group: AuditGroup; range: AuditRange }) => {
    setGroup(next.group)
    setRange(next.range)
    const url = new URL(window.location.href)
    url.searchParams.set('group', next.group)
    url.searchParams.set('range', next.range)
    window.history.replaceState(null, '', url)
    load(next, false)
  }

  const actionLabel = (action: string) => {
    const label = tOr(ta, action, '')
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : action
  }

  const columns: Column<AuditEventDto>[] = [
    {
      key: 'at',
      label: t('colAt'),
      render: (e) => <span className="whitespace-nowrap font-mono text-xs tabular-nums">{fmtDateTime(e.at)}</span>,
    },
    {
      key: 'action',
      label: t('colAction'),
      render: (e) => {
        const changes = changesOf(e)
        return (
          <div className="min-w-0 whitespace-normal">
            {/* Mã sự kiện chỉ ở tooltip — tên dễ đọc là chính, mã để đối chiếu khi cần. */}
            <p className="text-[13px]" title={e.action}>
              {actionLabel(e.action)}
            </p>
            {/* Điện thoại: cột Người làm ẩn — đưa xuống dưới tên sự kiện. */}
            <p className="mt-0.5 break-all text-[11px] text-[var(--text-secondary)] sm:hidden">{e.actorEmail ?? e.actor}</p>
            {changes.length > 0 && (
              <Collapsible className="mt-1">
                <CollapsibleTrigger className="group/chg inline-flex min-h-6 items-center gap-1 text-[11px] text-[var(--starlight)] hover:underline max-md:min-h-11">
                  <ChevronRight className="size-3 transition-transform group-data-[panel-open]/chg:rotate-90" />
                  {t('details', { count: changes.length })}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <dl className="mt-1 space-y-0.5 rounded-md bg-[var(--void)] p-2 font-mono text-[11px]">
                    {changes.map((c) => (
                      <div key={c.key} className="break-all">
                        <dt className="inline text-[var(--text-secondary)]">{c.key}: </dt>
                        <dd className="inline">
                          {c.from !== undefined && <span className="text-[var(--text-muted)] line-through">{c.from}</span>}
                          {c.from !== undefined && c.to !== undefined && ' → '}
                          {c.to}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )
      },
    },
    {
      key: 'actor',
      label: t('colActor'),
      hideBelow: 'sm',
      render: (e) => (
        <div className="min-w-0 whitespace-normal">
          <p className="break-all text-xs">{e.actorName ?? e.actorEmail ?? <span className="font-mono">{e.actor}</span>}</p>
          {e.actorName && e.actorEmail && <p className="break-all text-[11px] text-[var(--text-muted)]">{e.actorEmail}</p>}
          <div className="mt-1">
            <SourceBadge source={e.source} />
          </div>
        </div>
      ),
    },
    {
      key: 'targetType',
      label: t('colTarget'),
      hideBelow: 'lg',
      render: (e) => (
        <div className="min-w-0 whitespace-normal text-xs">
          <p>{e.targetType}</p>
          {e.targetEmail ? (
            <p className="break-all text-[11px] text-[var(--text-secondary)]" title={e.targetId}>
              {e.targetEmail}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-[var(--text-muted)]" title={e.targetId}>
              {e.targetId.length > 13 ? `${e.targetId.slice(0, 8)}…` : e.targetId}
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="grid min-w-[14rem] gap-1.5">
          <Label htmlFor="audit-group" className="text-xs">
            {t('group')}
          </Label>
          <NativeSelect
            id="audit-group"
            value={group}
            disabled={pending}
            onChange={(e) => applyFilter({ group: e.target.value as AuditGroup, range })}
          >
            {AUDIT_GROUP_KEYS.map((g) => (
              <NativeSelectOption key={g} value={g}>
                {t(`group_${g}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-[10rem] gap-1.5">
          <Label htmlFor="audit-range" className="text-xs">
            {t('range')}
          </Label>
          <NativeSelect
            id="audit-range"
            value={range}
            disabled={pending}
            onChange={(e) => applyFilter({ group, range: e.target.value as AuditRange })}
          >
            {AUDIT_RANGES.map((r) => (
              <NativeSelectOption key={r} value={r}>
                {t(`range_${r}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <p className="pb-2 text-xs text-[var(--text-secondary)]" aria-live="polite">
          {t('count', { shown: items.length, total })}
        </p>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={items}
        hideSearch
        empty={<EmptyState icon={ScrollText} title={t('empty')} description={t('emptyHint')} />}
      />
      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" className="max-md:h-11" disabled={pending} onClick={() => load({ group, range }, true)}>
            {t('more')}
          </Button>
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--text-muted)]">{t('note')}</p>
    </>
  )
}
