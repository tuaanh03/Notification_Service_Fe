'use client'

import { useState, useEffect } from 'react'
import {
  Copy,
  Plus,
  X,
  Eye,
  Info,
  ChevronRight,
  Code2,
  PlusCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  type Topic,
  type SegmentFilterGroup,
  type SegmentFilterRule,
  type SegmentFilterField,
  type SegmentFilterOperator,
} from '@/lib/mock-data'

const FIELD_OPTIONS: { label: string; value: SegmentFilterField }[] = [
  { label: 'User Tag', value: 'user_tag' },
  { label: 'Session Count', value: 'session_count' },
  { label: 'Country', value: 'country' },
  { label: 'Customer Code', value: 'customer_code' },
  { label: 'Identified', value: 'identified' },
]

const OPERATOR_OPTIONS: { label: string; value: SegmentFilterOperator }[] = [
  { label: 'is', value: 'is' },
  { label: 'is not', value: 'is_not' },
  { label: 'greater than', value: 'greater_than' },
  { label: 'less than', value: 'less_than' },
  { label: 'contains', value: 'contains' },
]

const COUNTRY_OPTIONS = [
  'Vietnam (VN)',
  'United States (US)',
  'Singapore (SG)',
  'Japan (JP)',
  'United Kingdom (UK)',
  'Germany (DE)',
]

interface Props {
  topic: Topic | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (updatedTopic: Topic) => void
  appNamespace?: string
}

export function TopicSegmentEditorDialog({
  topic,
  open,
  onOpenChange,
  onSave,
}: Props) {
  const [topicName, setTopicName] = useState('')
  const [description, setDescription] = useState('')
  const [showDescriptionInput, setShowDescriptionInput] = useState(false)
  const [showJsonView, setShowJsonView] = useState(false)
  const [isChannelBreakdownOpen, setIsChannelBreakdownOpen] = useState(false)
  const [filterGroups, setFilterGroups] = useState<SegmentFilterGroup[]>([])

  // Đồng bộ khi mở dialog hoặc thay đổi topic
  useEffect(() => {
    if (topic) {
      setTopicName(topic.name ?? '')
      setDescription(topic.description ?? '')
      setShowDescriptionInput(false)
      setShowJsonView(false)
      setIsChannelBreakdownOpen(false)
      if (topic.filter_groups && topic.filter_groups.length > 0) {
        setFilterGroups(JSON.parse(JSON.stringify(topic.filter_groups)))
      } else {
        setFilterGroups([
          {
            id: `fg-${Date.now()}`,
            conjunction: 'where',
            rules: [
              {
                id: `r-${Date.now()}-1`,
                field: 'user_tag',
                tag_name: 'test',
                operator: 'is',
                value: 'con gà',
              },
            ],
            subscribed_records: topic.bindings || 2,
          },
        ])
      }
    }
  }, [topic, open])

  // Thêm điều kiện AND vào 1 group
  const addRuleToGroup = (groupId: string) => {
    setFilterGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const newRule: SegmentFilterRule = {
          id: `r-${Date.now()}`,
          field: 'user_tag',
          tag_name: '',
          operator: 'is',
          value: '',
        }
        return {
          ...g,
          rules: [...g.rules, newRule],
          subscribed_records: Math.max(1, (g.subscribed_records ?? 2) - 1),
        }
      }),
    )
  }

  // Cập nhật 1 rule
  const updateRule = (
    groupId: string,
    ruleId: string,
    patch: Partial<SegmentFilterRule>,
  ) => {
    setFilterGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          rules: g.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
        }
      }),
    )
  }

  // Xóa 1 rule khỏi group
  const removeRule = (groupId: string, ruleId: string) => {
    setFilterGroups((prev) =>
      prev
        .map((g) => {
          if (g.id !== groupId) return g
          return {
            ...g,
            rules: g.rules.filter((r) => r.id !== ruleId),
          }
        })
        .filter((g) => g.rules.length > 0),
    )
  }

  // Nhân bản 1 rule
  const duplicateRule = (groupId: string, rule: SegmentFilterRule) => {
    setFilterGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const clone: SegmentFilterRule = {
          ...rule,
          id: `r-${Date.now()}`,
        }
        return {
          ...g,
          rules: [...g.rules, clone],
        }
      }),
    )
  }

  // Thêm 1 nhóm OR mới
  const addGroup = () => {
    const newGroup: SegmentFilterGroup = {
      id: `fg-${Date.now()}`,
      conjunction: 'or',
      rules: [
        {
          id: `r-${Date.now()}-1`,
          field: 'user_tag',
          tag_name: 'priority',
          operator: 'is',
          value: 'low',
        },
      ],
      subscribed_records: 3,
    }
    setFilterGroups((prev) => [...prev, newGroup])
  }

  // Nhân bản 1 group
  const duplicateGroup = (group: SegmentFilterGroup) => {
    const clone: SegmentFilterGroup = {
      ...group,
      id: `fg-${Date.now()}`,
      conjunction: 'or',
      rules: group.rules.map((r) => ({ ...r, id: `r-${Date.now()}-${Math.random()}` })),
    }
    setFilterGroups((prev) => [...prev, clone])
  }

  // Xóa 1 group
  const removeGroup = (groupId: string) => {
    setFilterGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  // Tính tổng số người nhận ước lượng
  const totalSubscribed = filterGroups.reduce(
    (acc, g) => acc + (g.subscribed_records ?? 0),
    0,
  )

  const handleSave = () => {
    if (!topic) return
    const updated: Topic = {
      ...topic,
      name: topicName,
      description: description,
      filter_groups: filterGroups,
      bindings: totalSubscribed,
    }
    onSave?.(updated)
    onOpenChange(false)
  }

  if (!topic) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-border/80 bg-background shadow-2xl">
        {/* Modal Header: Tinh gọn chỉ có Topic Editor */}
        <DialogHeader className="p-4 px-6 border-b border-border/70 bg-background flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-heading font-bold text-foreground">
            Topic Editor
          </DialogTitle>
        </DialogHeader>

        {/* Modal Body: 2 Cột */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border/60">
          {/* CỘT TRÁI: Filter Builder (~75%) */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-5 bg-background">
            {/* Cụm Tiêu đề Topic, Mô tả & Subtitle - Kéo sát lề trái */}
            <div className="space-y-3 pb-4 border-b border-border/60">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Name of topic</span>
                  <span className="text-destructive font-bold">*</span>
                </label>
                <Input
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="First-time audience"
                  className="h-9 text-xs rounded-md bg-background border-border/90 focus-visible:ring-1"
                />
              </div>

              {/* Cụm Add description chuẩn ảnh số 2 */}
              {showDescriptionInput ? (
                <div className="flex items-center gap-2 pt-0.5">
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add description..."
                    className="h-8 text-xs bg-muted/20 border-border/70 flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowDescriptionInput(false)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground p-1"
                    title="Đóng"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDescriptionInput(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <PlusCircle className="size-3.5" />
                    <span>{description ? description : 'Add description'}</span>
                  </button>
                  {description && (
                    <button
                      type="button"
                      onClick={() => setDescription('')}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="Xóa mô tả"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Dòng mô tả & Nút View filter JSON cùng hàng */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  This topic contains all subscriptions matching the criteria below...
                </p>
                <button
                  type="button"
                  onClick={() => setShowJsonView((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showJsonView ? <Code2 className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showJsonView ? 'Visual editor' : 'View filter JSON'}</span>
                </button>
              </div>
            </div>
            {showJsonView ? (
              <div className="space-y-2">
                <span className="text-xs font-mono text-muted-foreground">
                  Filter Schema Payload (JSON):
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 border border-border/80 font-mono text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    {
                      topic_key: topic.topic_key,
                      name: topicName,
                      description: description,
                      filter_groups: filterGroups,
                      estimated_records: totalSubscribed,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            ) : (
              <>
                {filterGroups.map((group, gIndex) => (
                  <div key={group.id} className="flex items-start gap-3">
                    {/* Nhãn Where / ...or nằm ở ngoài Card như Ảnh 2 */}
                    <div className="w-12 pt-3 shrink-0 text-right">
                      <span className="text-xs text-muted-foreground font-normal font-sans">
                        {gIndex === 0 ? 'Where' : '...or'}
                      </span>
                    </div>

                    {/* Card Nhóm điều kiện */}
                    <div className="flex-1 rounded-lg border border-border/80 bg-slate-50/40 dark:bg-muted/15 p-4 space-y-3.5">
                      {group.rules.map((rule, rIndex) => (
                        <div key={rule.id} className="space-y-2.5">
                          {/* Phân tách giữa các rule: hiển thị nhãn ...and nếu là rule thứ 2 trở đi */}
                          {rIndex > 0 && (
                            <div className="text-xs text-muted-foreground font-normal pl-1">
                              ...and
                            </div>
                          )}

                          {/* Trường User Tag: Chia 2 tầng chuyên nghiệp theo Ảnh 2 */}
                          {rule.field === 'user_tag' ? (
                            <div className="space-y-2 rounded-md border border-border/60 bg-background p-3">
                              {/* Tầng 1: Field selector + Tag name input + Actions */}
                              <div className="flex items-center gap-2.5">
                                <NativeSelect
                                  value={rule.field}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, {
                                      field: e.target.value as SegmentFilterField,
                                    })
                                  }
                                  className="text-xs h-8.5 w-44 shrink-0 font-medium"
                                >
                                  {FIELD_OPTIONS.map((f) => (
                                    <option key={f.value} value={f.value}>
                                      {f.label}
                                    </option>
                                  ))}
                                </NativeSelect>

                                <Input
                                  value={rule.tag_name ?? ''}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { tag_name: e.target.value })
                                  }
                                  placeholder="test"
                                  className="h-8.5 flex-1 max-w-md text-xs font-mono"
                                />

                                <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                                  <button
                                    type="button"
                                    onClick={() => duplicateRule(group.id, rule)}
                                    title="Nhân bản điều kiện"
                                    className="p-1 hover:text-foreground transition-colors"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                  {group.rules.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeRule(group.id, rule.id)}
                                      title="Xóa điều kiện"
                                      className="p-1 hover:text-destructive transition-colors"
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Tầng gợi ý ghi chú info nhỏ */}
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pl-0.5">
                                <Info className="size-3 text-muted-foreground shrink-0" />
                                <span>
                                  Manually type in (exact match) or select tags pulled from your test users
                                </span>
                              </div>

                              {/* Tầng 2: Operator selector + Value input */}
                              <div className="flex items-center gap-2.5">
                                <NativeSelect
                                  value={rule.operator}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, {
                                      operator: e.target.value as SegmentFilterOperator,
                                    })
                                  }
                                  className="text-xs h-8.5 w-40 shrink-0"
                                >
                                  {OPERATOR_OPTIONS.map((op) => (
                                    <option key={op.value} value={op.value}>
                                      {op.label}
                                    </option>
                                  ))}
                                </NativeSelect>

                                <Input
                                  value={rule.value}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { value: e.target.value })
                                  }
                                  placeholder="con gà"
                                  className="h-8.5 flex-1 max-w-md text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            /* Các trường khác: Country, Session Count, Customer Code */
                            <div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-background p-3">
                              <NativeSelect
                                value={rule.field}
                                onChange={(e) =>
                                  updateRule(group.id, rule.id, {
                                    field: e.target.value as SegmentFilterField,
                                  })
                                }
                                className="text-xs h-8.5 w-44 shrink-0 font-medium"
                              >
                                {FIELD_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </NativeSelect>

                              <NativeSelect
                                value={rule.operator}
                                onChange={(e) =>
                                  updateRule(group.id, rule.id, {
                                    operator: e.target.value as SegmentFilterOperator,
                                  })
                                }
                                className="text-xs h-8.5 w-36 shrink-0"
                              >
                                {OPERATOR_OPTIONS.map((op) => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </NativeSelect>

                              {rule.field === 'country' ? (
                                <NativeSelect
                                  value={rule.value || COUNTRY_OPTIONS[0]}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { value: e.target.value })
                                  }
                                  className="text-xs h-8.5 min-w-52"
                                >
                                  {COUNTRY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </NativeSelect>
                              ) : rule.field === 'session_count' ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    value={rule.value || '2'}
                                    onChange={(e) =>
                                      updateRule(group.id, rule.id, { value: e.target.value })
                                    }
                                    className="h-8.5 w-24 text-xs font-mono tabular-nums"
                                  />
                                  <span className="text-xs text-muted-foreground">sessions</span>
                                </div>
                              ) : (
                                <Input
                                  value={rule.value}
                                  onChange={(e) =>
                                    updateRule(group.id, rule.id, { value: e.target.value })
                                  }
                                  placeholder="value..."
                                  className="h-8.5 flex-1 max-w-sm text-xs"
                                />
                              )}

                              <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                                <button
                                  type="button"
                                  onClick={() => duplicateRule(group.id, rule)}
                                  title="Nhân bản điều kiện"
                                  className="p-1 hover:text-foreground transition-colors"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                                {group.rules.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeRule(group.id, rule.id)}
                                    title="Xóa điều kiện"
                                    className="p-1 hover:text-destructive transition-colors"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Đáy mỗi nhóm card: ...and + Add filter & Subscribed records */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-normal">...and</span>
                          <button
                            type="button"
                            onClick={() => addRuleToGroup(group.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-muted/30 px-2.5 py-1 rounded-md shadow-2xs transition-colors"
                          >
                            <PlusCircle className="size-3.5" />
                            <span>Add filter</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs text-muted-foreground">
                            Subscribed records:{' '}
                            <span className="font-bold text-foreground">
                              {group.subscribed_records ?? 0}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <button
                              type="button"
                              onClick={() => duplicateGroup(group)}
                              title="Nhân bản khối điều kiện"
                              className="p-1 hover:text-foreground transition-colors"
                            >
                              <Copy className="size-3.5" />
                            </button>
                            {filterGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeGroup(group.id)}
                                title="Xóa khối điều kiện"
                                className="p-1 hover:text-destructive transition-colors"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Nút thêm khối OR ở dưới cùng */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 text-right shrink-0">
                    <span className="text-xs text-muted-foreground font-normal">...or</span>
                  </div>
                  <button
                    type="button"
                    onClick={addGroup}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-muted/30 px-3 py-1.5 rounded-md shadow-2xs transition-colors"
                  >
                    <PlusCircle className="size-3.5" />
                    <span>Add filter</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* CỘT PHẢI: Summary & Channel Breakdown (~25%) */}
          <div className="w-72 shrink-0 p-5 space-y-5 bg-muted/10 overflow-y-auto">
            {/* Thẻ Metric Card duy nhất chuẩn theo Ảnh 2 */}
            <div className="rounded-lg border border-border/80 bg-slate-50/70 dark:bg-muted/30 p-5 space-y-4">
              <div>
                <div className="text-3xl font-bold text-foreground tracking-tight">
                  {totalSubscribed}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-normal">
                  subscribed records
                </div>
              </div>

              {/* Thanh Progress bar màu xanh lá cây mỏng */}
              <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(15, totalSubscribed * 15))}%`,
                  }}
                />
              </div>

              {/* Dòng 0 unsubscribed */}
              <div className="text-xs text-muted-foreground font-normal">
                0 unsubscribed
              </div>
            </div>

            {/* Collapsible Channel Breakdown chuẩn theo Ảnh 2 */}
            <Collapsible
              open={isChannelBreakdownOpen}
              onOpenChange={setIsChannelBreakdownOpen}
              className="space-y-2 pt-1"
            >
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
                <ChevronRight
                  className={`size-3.5 transition-transform duration-200 ${
                    isChannelBreakdownOpen ? 'rotate-90' : ''
                  }`}
                />
                <span>Channel breakdown</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pl-4 text-xs">
                <div className="flex items-center justify-between text-muted-foreground py-1 border-b border-border/40">
                  <span>In-app notification</span>
                  <span className="font-mono font-semibold text-foreground">
                    {totalSubscribed}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground py-1 border-b border-border/40">
                  <span>Email</span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.max(1, totalSubscribed - 1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground py-1">
                  <span>SMS / Webhook</span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.floor(totalSubscribed / 2)}
                  </span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Modal Footer: Chỉ 1 nút Update Topic ở bên phải */}
        <div className="p-4 px-6 border-t border-border/80 bg-background flex items-center justify-end">
          <Button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-6 h-9 rounded-md shadow-xs transition-colors"
          >
            Update Topic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
