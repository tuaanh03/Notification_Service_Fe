'use client'

import { useState, useMemo } from 'react'
import { RadioTower, Plus, SlidersHorizontal, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { DataTable, type Column } from '@/components/data-table'
import { StatusPill } from '@/components/status-pill'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/components/app-context'
import { topics, type Topic } from '@/lib/mock-data'
import { TopicSegmentEditorDialog } from '@/components/topics/topic-segment-editor-dialog'

type Row = Topic & Record<string, unknown>

export default function Page() {
  const { app } = useApp()

  // Danh sách chủ đề quản lý local theo app hiện tại
  const [localTopics, setLocalTopics] = useState<Topic[]>(() => [...topics])
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // Lọc chính xác 100% các topic thuộc namespace của app đang chọn
  const rows = useMemo<Row[]>(() => {
    return localTopics
      .filter((t) => t.topic_key.startsWith(`${app.namespace}.`))
      .map((t) => ({ ...t }))
  }, [localTopics, app.namespace])

  const handleOpenEditor = (topic: Topic) => {
    setSelectedTopic(topic)
    setIsEditorOpen(true)
  }

  const handleAddNewTopic = () => {
    const newDraft: Topic = {
      topic_key: `${app.namespace}.new_topic_${Date.now().toString().slice(-4)}`,
      name: 'Chủ đề mới',
      description: '',
      status: 'draft',
      user_mutable: true,
      bindings: 0,
      default_channels: ['in_app', 'email'],
      directory_mode: 'pull',
      filter_groups: [
        {
          id: `fg-${Date.now()}`,
          conjunction: 'where',
          rules: [
            {
              id: `r-${Date.now()}`,
              field: 'user_tag',
              tag_name: 'test',
              operator: 'is',
              value: '',
            },
          ],
          subscribed_records: 0,
        },
      ],
    }
    setSelectedTopic(newDraft)
    setIsEditorOpen(true)
  }

  const handleSaveTopic = (updatedTopic: Topic) => {
    setLocalTopics((prev) => {
      const exists = prev.some((t) => t.topic_key === updatedTopic.topic_key)
      if (exists) {
        return prev.map((t) => (t.topic_key === updatedTopic.topic_key ? updatedTopic : t))
      }
      return [updatedTopic, ...prev]
    })
    toast.success(`Đã lưu cấu hình chủ đề "${updatedTopic.name || updatedTopic.topic_key}"`)
  }

  const columns = useMemo<Column<Row>[]>(
    () => [
      {
        key: 'topic_key',
        label: 'topic_key',
        render: (r) => {
          const cleanKey = r.topic_key.startsWith(`${app.namespace}.`)
            ? r.topic_key.slice(app.namespace.length + 1)
            : r.topic_key
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs font-semibold text-[var(--starlight)]">
                {cleanKey}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {app.namespace}
              </span>
            </div>
          )
        },
      },
      {
        key: 'name',
        label: 'Tên hiển thị & Mô tả',
        render: (r) => (
          <div className="flex flex-col max-w-xs">
            <span className="font-medium text-sm text-foreground">{r.name}</span>
            {r.description && (
              <span className="text-xs text-muted-foreground truncate" title={r.description}>
                {r.description}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Trạng thái',
        render: (r) => <StatusPill status={r.status ?? 'draft'} />,
      },
      {
        key: 'filter_summary',
        label: 'Điều kiện lọc phân khúc',
        render: (r) => {
          const groups = r.filter_groups ?? []
          if (groups.length === 0) {
            return (
              <span className="text-xs text-muted-foreground italic">Chưa thiết lập bộ lọc</span>
            )
          }

          const rulesCount = groups.reduce((acc, g) => acc + g.rules.length, 0)
          const firstRule = groups[0]?.rules[0]

          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {firstRule && (
                <Badge variant="outline" className="font-mono text-[11px] bg-[var(--void)]/50 border-[var(--orbit)]">
                  {firstRule.field === 'user_tag'
                    ? `tag:${firstRule.tag_name || 'tag'} = ${firstRule.value || '...'}`
                    : `${firstRule.field} = ${firstRule.value || '...'}`}
                </Badge>
              )}
              {rulesCount > 1 && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  +{rulesCount - 1} filter
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        key: 'bindings',
        label: 'Người nhận ước tính',
        numeric: true,
        render: (r) =>
          r.bindings === 0 ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex cursor-help font-mono text-xs font-bold text-[var(--solar)] underline decoration-dotted" />}>
                0
              </TooltipTrigger>
              <TooltipContent>Chưa có người nhận khớp bộ lọc</TooltipContent>
            </Tooltip>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-foreground">
              <Users className="size-3 text-muted-foreground" />
              {r.bindings}
            </span>
          ),
      },
      {
        key: 'actions',
        label: 'Thao tác',
        render: (r) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenEditor(r)
            }}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-[var(--starlight)] hover:bg-[var(--starlight)]/10"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Sửa bộ lọc</span>
          </Button>
        ),
      },
    ],
    [app.namespace],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chủ đề"
        subtitle={`Quản lý chủ đề & thiết lập bộ lọc phân khúc người nhận (Segment Filter) thuộc ${app.name} (${app.namespace})`}
        actions={
          <Button onClick={handleAddNewTopic} className="gap-1.5 text-xs">
            <Plus className="size-3.5" />
            <span>Thêm chủ đề</span>
          </Button>
        }
      />

      <DataTable<Row>
        rows={rows}
        columns={columns}
        filterKey="status"
        onRowClick={(r) => handleOpenEditor(r)}
        rowClassName={(r) =>
          r.bindings === 0 ? 'border-l-2 border-l-[var(--solar)] border-dashed cursor-pointer' : 'cursor-pointer'
        }
        empty={
          <EmptyState
            icon={RadioTower}
            title="Chưa có chủ đề"
            description={`Tạo chủ đề đầu tiên cho app ${app.name}.`}
          />
        }
      />

      {/* Dialog Segment Editor mở tại chỗ */}
      <TopicSegmentEditorDialog
        topic={selectedTopic}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleSaveTopic}
        appNamespace={app.namespace}
      />
    </div>
  )
}
