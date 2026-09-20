'use client'
import { Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Channel } from '@/lib/mock-data'
import type { TopicDraft } from './wizard-types'

const ALL_CHANNELS: Channel[] = ['in_app', 'email']

/** Step 2 — Topic đầu tiên (≥ 1, UC-001 BR-1/BR-3/BR-8). */
export function StepTopics({
  namespace,
  declaredChannels,
  topics,
  onChange,
}: {
  namespace: string
  declaredChannels: Channel[]
  topics: TopicDraft[]
  onChange: (next: TopicDraft[]) => void
}) {
  const update = (index: number, patch: Partial<TopicDraft>) =>
    onChange(topics.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Topic đầu tiên</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Tối thiểu một topic là bắt buộc.</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            onChange([
              ...topics,
              { suffix: '', name: '', description: '', channels: declaredChannels.slice(0, 1), severity: 'info', userMutable: false },
            ])
          }
        >
          <Plus /> Thêm topic
        </Button>
      </div>
      {topics.map((topic, index) => {
        const duplicate = topics.some((t, i) => i !== index && t.suffix === topic.suffix)
        return (
          <div key={index} className="rounded-xl border border-[var(--orbit)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                TOPIC {String(index + 1).padStart(2, '0')}
              </span>
              {topics.length > 1 && (
                <Button variant="ghost" size="icon-xs" aria-label="Xoá topic" onClick={() => onChange(topics.filter((_, i) => i !== index))}>
                  <Trash2 />
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`tp-key-${index}`} className="font-mono text-xs">topic_key</Label>
              {/* UC-001 BR-3: prefix namespace khoá cứng, chỉ gõ được phần đuôi */}
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[var(--orbit)] bg-[var(--starlight)]/10 px-3 font-mono text-xs text-[var(--starlight)]">
                  {namespace}.
                </span>
                <Input
                  id={`tp-key-${index}`}
                  value={topic.suffix}
                  onChange={(e) => update(index, { suffix: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                  placeholder="resource_alert"
                  aria-invalid={duplicate}
                  className="rounded-l-none font-mono"
                />
              </div>
              {duplicate && <p className="font-mono text-xs text-[var(--supernova)]">topic_key phải unique toàn hệ thống.</p>}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`tp-name-${index}`}>Tên hiển thị</Label>
                <Input id={`tp-name-${index}`} value={topic.name} onChange={(e) => update(index, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`tp-sev-${index}`}>Mức độ</Label>
                <NativeSelect
                  id={`tp-sev-${index}`}
                  value={topic.severity}
                  onChange={(e) => update(index, { severity: e.target.value as TopicDraft['severity'] })}
                  className="w-full"
                >
                  <NativeSelectOption value="info">info</NativeSelectOption>
                  <NativeSelectOption value="warning">warning</NativeSelectOption>
                  <NativeSelectOption value="critical">critical</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <Label htmlFor={`tp-desc-${index}`}>Mô tả</Label>
              <Textarea id={`tp-desc-${index}`} value={topic.description} onChange={(e) => update(index, { description: e.target.value })} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Label className="font-mono text-xs">default_channels</Label>
                {/* UC-001 BR-8: chỉ chọn trong kênh đã khai ở step 1; kênh khác disabled + tooltip */}
                <ToggleGroup
                  multiple
                  variant="outline"
                  size="sm"
                  value={topic.channels}
                  onValueChange={(v) => update(index, { channels: v as Channel[] })}
                >
                  {ALL_CHANNELS.map((c) =>
                    declaredChannels.includes(c) ? (
                      <ToggleGroupItem key={c} value={c} className="font-mono">
                        {c}
                      </ToggleGroupItem>
                    ) : (
                      <Tooltip key={c}>
                        <TooltipTrigger render={<span />}>
                          <ToggleGroupItem value={c} disabled className="font-mono">
                            {c}
                          </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Kênh {c} chưa khai ở bước Hồ sơ app</TooltipContent>
                      </Tooltip>
                    ),
                  )}
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2">
                <Switch id={`tp-mut-${index}`} checked={topic.userMutable} onCheckedChange={(v) => update(index, { userMutable: v })} />
                <Label htmlFor={`tp-mut-${index}`} className="text-xs">
                  <span className="font-mono">user_mutable</span> — Người dùng được tự tắt topic này
                </Label>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 border-t border-[var(--orbit)] pt-3 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="size-3.5" />
              Topic này hiện 0 subscriber. Thêm người nhận sau khi app active.
            </p>
          </div>
        )
      })}
    </div>
  )
}
