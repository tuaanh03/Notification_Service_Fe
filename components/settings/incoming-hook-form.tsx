'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppLink } from '@/components/app-link'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { AlertTrigger, IncomingIntegrationDto, IncomingIntegrationId, TemplateSummaryDto, TopicDto } from '@/lib/api/types'

/** Lựa chọn của dòng thêm / sửa: gửi cho ai (topic), nội dung gì (template), công cụ nào gọi vào, gửi khi nào. */
export type Selection = { topicId: string; templateId: string; integration: IncomingIntegrationId; trigger: AlertTrigger }

export const GENERIC: IncomingIntegrationId = 'generic'
const TRIGGERS: readonly AlertTrigger[] = ['firing', 'resolved', 'all']
export const TRIGGER_KEY = { firing: 'triggerFiring', resolved: 'triggerResolved', all: 'triggerAll' } as const

/** Mẫu template cho cảnh báo (ADR-0035 / 0043 của backend) — gợi ý tạo khi app chưa có template nhóm "Cảnh báo". */
const ALERT_PRESETS = [
  { id: 'incident-alert', label: 'presetAlert' },
  { id: 'incident-resolved', label: 'presetResolved' },
] as const

/** Các ô chọn (topic, template, công cụ, gửi khi) + nút — dùng cho dòng "Thêm" và phần sửa trong hook. */
export function HookForm({
  topics,
  templates,
  integrations,
  initial,
  suggestPresets = false,
  submitLabel,
  pending,
  onCancel,
  onSubmit,
}: {
  topics: TopicDto[]
  templates: TemplateSummaryDto[]
  integrations: IncomingIntegrationDto[]
  initial: Selection
  /** App chưa có template cảnh báo: chọn công cụ giám sát thì gợi ý tạo từ mẫu. */
  suggestPresets?: boolean
  submitLabel: string
  pending: boolean
  onCancel?: () => void
  onSubmit: (sel: Selection) => void
}) {
  const t = useTranslations('incoming')
  const [sel, setSel] = useState<Selection>(initial)
  const set = (patch: Partial<Selection>) => setSel((prev) => ({ ...prev, ...patch }))
  const tool = integrations.find((i) => i.id === sel.integration) ?? null
  const changed =
    sel.topicId !== initial.topicId ||
    sel.templateId !== initial.templateId ||
    sel.integration !== initial.integration ||
    (tool?.status != null && sel.trigger !== initial.trigger)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
          <span className="text-[var(--text-muted)]">{t('topicLabel')}</span>
          <NativeSelect value={sel.topicId} onChange={(e) => set({ topicId: e.target.value })} className="w-full">
            {topics.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
          <span className="text-[var(--text-muted)]">{t('templateLabel')}</span>
          <NativeSelect value={sel.templateId} onChange={(e) => set({ templateId: e.target.value })} className="w-full">
            {templates.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        {integrations.length > 0 && (
          <label className="min-w-[10rem] flex-1 space-y-1 text-xs">
            <span className="text-[var(--text-muted)]">{t('toolLabel')}</span>
            <NativeSelect
              value={sel.integration}
              onChange={(e) => {
                const next = integrations.find((i) => i.id === e.target.value)
                if (next) set({ integration: next.id })
              }}
              className="w-full"
            >
              {integrations.map((x) => (
                <NativeSelectOption key={x.id} value={x.id}>
                  {x.id === GENERIC ? t('toolGeneric') : x.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
        {tool?.status && (
          <label className="min-w-[9rem] flex-1 space-y-1 text-xs">
            <span className="text-[var(--text-muted)]">{t('triggerLabel')}</span>
            <NativeSelect value={sel.trigger} onChange={(e) => set({ trigger: TRIGGERS.find((x) => x === e.target.value) ?? 'all' })} className="w-full">
              {TRIGGERS.map((x) => (
                <NativeSelectOption key={x} value={x}>
                  {t(TRIGGER_KEY[x])}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending || !sel.topicId || !sel.templateId || (onCancel === undefined && !changed)}
            onClick={() => onSubmit(sel)}
          >
            {submitLabel}
          </Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </div>
      {suggestPresets && sel.integration !== GENERIC && <AlertPresetHint />}
    </div>
  )
}

/** "Chưa có template cảnh báo — tạo từ mẫu" — mở hộp mẫu ở /templates/new (`?preset=`), tạo xong soạn / xuất bản như thường. */
export function AlertPresetHint() {
  const t = useTranslations('incoming')
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
      {t('noAlertTemplate')}
      {ALERT_PRESETS.map((p) => (
        <AppLink
          key={p.id}
          href={`/templates/new?preset=${p.id}`}
          className="inline-flex min-h-6 items-center text-[var(--starlight)] hover:underline max-md:min-h-11"
        >
          {t(p.label)}
        </AppLink>
      ))}
    </p>
  )
}
