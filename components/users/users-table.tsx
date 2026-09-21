'use client'

import { useMemo, useState } from 'react'
import { useAppRouter } from '@/components/app-link'
import {
  Users,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  X,
  GitMerge,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  bindings,
  subscriptionsOf,
  topics,
  users,
  type SubscriptionStatus,
  type User,
} from '@/lib/mock-data'

type Row = User & Record<string, unknown> & { channels: string; status: SubscriptionStatus }

/** UC-002 §A — bảng user (con người); trạng thái = trạng thái tệ nhất trong các subscription. */
export function UsersTable() {
  const router = useAppRouter()
  const [source, setSource] = useState('')
  const [channel, setChannel] = useState('')
  const [status, setStatus] = useState('')
  const [topic, setTopic] = useState('')

  const rows = useMemo<Row[]>(
    () =>
      users.map((u) => {
        const subs = subscriptionsOf(u.id)
        const worst: SubscriptionStatus = subs.some((s) => s.status === 'invalid')
          ? 'invalid'
          : subs.some((s) => s.status === 'unsubscribed')
            ? 'unsubscribed'
            : 'active'
        return {
          ...u,
          subscriptions: subs.length,
          channels: subs.map((s) => s.channel).join(','),
          status: worst,
        }
      }),
    [],
  )

  // "Có binding trong topic…": user nằm trong binding type=user hoặc role của topic (mock: role:qa_lead = i%3==0)
  const inTopic = (u: User, t: string) => {
    const idx = users.findIndex((x) => x.id === u.id)
    return bindings.some(
      (b) =>
        b.topic_key === t &&
        b.status === 'included' &&
        (b.target.startsWith('role:')
          ? idx % 3 === 0
          : b.target === `user:${u.id}` || b.target === `user:user-${idx + 1}`),
    )
  }

  const filtered = rows.filter(
    (u) =>
      (!source || u.source === source) &&
      (!channel || u.channels.split(',').includes(channel)) &&
      (!status || u.status === status) &&
      (!topic || inTopic(u, topic)),
  )

  const activeFilterCount = (source ? 1 : 0) + (channel ? 1 : 0) + (status ? 1 : 0) + (topic ? 1 : 0)

  const columns: Column<Row>[] = [
    {
      key: 'id',
      label: 'USER ID',
      mono: true,
      render: (u) => {
        const anon = !u.identified
        return (
          <div className="flex items-center gap-1.5 py-1">
            <span className="font-mono text-xs font-semibold text-foreground tracking-tight" title={u.id}>
              {u.id}
            </span>
            {anon && (
              <Badge variant="outline" className="border-dashed font-mono text-[9px] text-muted-foreground py-0 px-1">
                ẩn danh
              </Badge>
            )}
            {u.mergedFrom && (
              <GitMerge className="size-3 text-[var(--pulsar)]" aria-label={`Gộp từ ${u.mergedFrom}`} />
            )}
          </div>
        )
      },
    },
    {
      key: 'email',
      label: 'EMAIL',
      mono: true,
      render: (u) => (
        <span className="font-mono text-xs text-foreground/90">
          {u.email || '—'}
        </span>
      ),
    },
    {
      key: 'external_id',
      label: 'EXTERNAL ID',
      mono: true,
      render: (u) => <span className="font-mono text-xs text-muted-foreground">{u.external_id || '—'}</span>,
    },
    {
      key: 'updated_at',
      label: 'CẬP NHẬT',
      mono: true,
      render: (u) => <span className="text-xs text-muted-foreground font-mono">{u.updated_at}</span>,
    },
    {
      key: 'id',
      label: 'THAO TÁC',
      render: (u) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" className="size-7 rounded-lg text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-36 rounded-xl p-1 bg-popover border border-border shadow-md">
              <DropdownMenuItem onClick={() => router.push(`/users/${u.id}`)} className="text-xs cursor-pointer">
                <Eye className="size-3.5 mr-1.5" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(u.id)
                  toast.success('Đã sao chép User ID')
                }}
                className="text-xs cursor-pointer"
              >
                <Copy className="size-3.5 mr-1.5" /> Sao chép ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-lg border-border/80 text-xs font-medium">
              <Filter className="size-3 text-muted-foreground" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] text-primary-foreground font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-64 rounded-xl border border-border bg-popover p-3 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold">Bộ lọc dữ liệu</span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-[11px] h-6 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSource('')
                  setChannel('')
                  setStatus('')
                  setTopic('')
                }}
              >
                Đặt lại
              </Button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Nguồn</Label>
              <NativeSelect value={source} onChange={(e) => setSource(e.target.value)} size="sm" className="w-full text-xs font-mono">
                <NativeSelectOption value="">Tất cả</NativeSelectOption>
                <NativeSelectOption value="directory">directory</NativeSelectOption>
                <NativeSelectOption value="import">import</NativeSelectOption>
                <NativeSelectOption value="self">self</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Kênh</Label>
              <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value)} size="sm" className="w-full text-xs font-mono">
                <NativeSelectOption value="">Tất cả</NativeSelectOption>
                <NativeSelectOption value="email">email</NativeSelectOption>
                <NativeSelectOption value="sms">sms</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Trạng thái</Label>
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} size="sm" className="w-full text-xs font-mono">
                <NativeSelectOption value="">Tất cả</NativeSelectOption>
                <NativeSelectOption value="active">active</NativeSelectOption>
                <NativeSelectOption value="unsubscribed">unsubscribed</NativeSelectOption>
                <NativeSelectOption value="invalid">invalid</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Có binding trong topic</Label>
              <NativeSelect value={topic} onChange={(e) => setTopic(e.target.value)} size="sm" className="w-full text-xs font-mono">
                <NativeSelectOption value="">Bất kỳ</NativeSelectOption>
                {topics.map((t) => (
                  <NativeSelectOption key={t.topic_key} value={t.topic_key}>
                    {t.topic_key}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {filtered.length}/{rows.length}
      </span>
    </div>
  )

  return (
    <div className="space-y-2">
      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 py-0.5">
          <span className="text-[11px] text-muted-foreground mr-1">Đang lọc:</span>
          {source && (
            <Badge variant="secondary" className="gap-1 text-[11px] py-0.5 px-2 rounded-lg font-mono">
              Nguồn: {source}
              <X className="size-3 cursor-pointer hover:opacity-75" onClick={() => setSource('')} />
            </Badge>
          )}
          {channel && (
            <Badge variant="secondary" className="gap-1 text-[11px] py-0.5 px-2 rounded-lg font-mono">
              Kênh: {channel}
              <X className="size-3 cursor-pointer hover:opacity-75" onClick={() => setChannel('')} />
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className="gap-1 text-[11px] py-0.5 px-2 rounded-lg font-mono">
              Trạng thái: {status}
              <X className="size-3 cursor-pointer hover:opacity-75" onClick={() => setStatus('')} />
            </Badge>
          )}
          {topic && (
            <Badge variant="secondary" className="gap-1 text-[11px] py-0.5 px-2 rounded-lg font-mono">
              Topic: {topic}
              <X className="size-3 cursor-pointer hover:opacity-75" onClick={() => setTopic('')} />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="text-[11px] text-muted-foreground h-6 px-1.5 hover:text-foreground"
            onClick={() => {
              setSource('')
              setChannel('')
              setStatus('')
              setTopic('')
            }}
          >
            Xóa tất cả
          </Button>
        </div>
      )}

      {/* Main Table Container */}
      <DataTable<Row>
        columns={columns}
        rows={filtered}
        onRowClick={(u) => router.push(`/users/${u.id}`)}
        toolbarActions={filterToolbar}
        searchPlaceholder="Tìm kiếm user theo ID, email..."
        empty={<EmptyState icon={Users} title="Không có user khớp bộ lọc" description="Nới bộ lọc nguồn / kênh / trạng thái." />}
      />
    </div>
  )
}
