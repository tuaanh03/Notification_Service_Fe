'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Gauge } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { loadSendLimitsAction, saveSendWindowAction, type SendLimits } from '@/app/settings/limits/actions'
import { useApp } from '@/components/app-context'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { useRole } from '@/components/role-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SendWindowDto } from '@/lib/api/types'

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const
/** Lần đầu bật khung giờ: giờ hành chính. */
const OFFICE_HOURS: SendWindowDto = { days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }

/**
 * Mốc giờ chọn được, mỗi 30 phút. Không dùng ô giờ của trình duyệt: nó hiện AM/PM theo máy người xem và
 * không có `24:00` (tới hết ngày). Giờ lẻ đặt qua API vẫn hiện được — `withValue` chèn vào danh sách.
 */
const SLOTS = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const START_SLOTS = SLOTS.slice(0, -1)
const END_SLOTS = SLOTS.slice(1)
const withValue = (slots: string[], value: string) => (slots.includes(value) ? slots : [...slots, value].sort())

type Draft = { enabled: boolean; window: SendWindowDto; mandatoryBypass: boolean }

const draftOf = (limits: SendLimits): Draft => ({
  enabled: limits.sendWindow !== null,
  window: limits.sendWindow ?? OFFICE_HOURS,
  mandatoryBypass: limits.mandatoryBypassWindow,
})

const sameDraft = (a: Draft, b: Draft) =>
  a.enabled === b.enabled &&
  a.mandatoryBypass === b.mandatoryBypass &&
  (!a.enabled ||
    (a.window.start === b.window.start && a.window.end === b.window.end && a.window.days.join() === b.window.days.join()))

/**
 * `/settings/limits` — Giới hạn gửi của app đang xem (ADR-0032 của backend). GĐ 1: khung giờ gửi + ngoại lệ
 * cho tin bắt buộc. Ai xem app cũng thấy; chỉ người quản lý app (`canManage`) sửa — backend vẫn chặn (403).
 */
export function SendLimitsPanel() {
  const t = useTranslations('limits')
  const te = useTranslations('errors')
  const { app } = useApp()
  const writable = useRole().canManage(app)
  const appId = app.app_id

  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadSendLimitsAction(appId)
    if (result.ok) {
      setSaved(draftOf(result.data))
      setDraft(draftOf(result.data))
      setLoadError(null)
    } else {
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

  useEffect(() => {
    setSaved(null)
    setDraft(null)
    setLoadError(null)
    void load()
  }, [load])

  const header = <PageHeader title={t('title')} subtitle={t('subtitle', { app: app.slug })} />

  if (loadError) {
    return (
      <>
        {header}
        <Panel className="overflow-hidden">
          <EmptyState
            icon={Gauge}
            title={t('loadFailed')}
            description={loadError}
            action={
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                {t('retry')}
              </Button>
            }
          />
        </Panel>
      </>
    )
  }

  const disabled = !draft || !writable || pending
  const range = draft?.window ?? OFFICE_HOURS
  const invalid =
    draft?.enabled === true
      ? range.days.length === 0
        ? t('errDays')
        : range.start >= range.end
          ? t('errTime')
          : null
      : null
  const dirty = draft !== null && saved !== null && !sameDraft(draft, saved)
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const updateWindow = (patch: Partial<SendWindowDto>) => setDraft((d) => (d ? { ...d, window: { ...d.window, ...patch } } : d))

  const save = () =>
    draft &&
    startTransition(async () => {
      const result = await saveSendWindowAction(appId, draft.enabled ? draft.window : null, draft.mandatoryBypass)
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        return
      }
      setSaved(draftOf(result.data))
      setDraft(draftOf(result.data))
      toast.success(t('saved'))
    })

  return (
    <>
      {header}
      <div className="max-w-2xl space-y-5">
        <Panel className="p-6" ring>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="send-window">{t('windowTitle')}</Label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('windowHint')}</p>
            </div>
            <Switch
              id="send-window"
              checked={draft?.enabled ?? false}
              disabled={disabled}
              onCheckedChange={(enabled) => update({ enabled })}
            />
          </div>

          {draft?.enabled && (
            <div className="mt-6 space-y-6 border-t pt-6">
              <div className="space-y-2.5">
                <Label>{t('days')}</Label>
                <ToggleGroup
                  multiple
                  variant="outline"
                  size="sm"
                  className="grid w-full grid-cols-7 sm:flex sm:w-fit"
                  value={range.days.map(String)}
                  onValueChange={(v) => updateWindow({ days: (v as string[]).map(Number).sort((a, b) => a - b) })}
                  disabled={disabled}
                >
                  {DAYS.map((d) => (
                    <ToggleGroupItem
                      key={d}
                      value={String(d)}
                      className="min-w-0 px-0 sm:min-w-11 sm:px-2.5 aria-pressed:border-[var(--starlight)] aria-pressed:bg-[var(--starlight)] aria-pressed:text-white aria-pressed:hover:bg-[var(--starlight)]"
                    >
                      {t(`day${d}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2.5">
                  <Label htmlFor="window-start">{t('from')}</Label>
                  <NativeSelect
                    id="window-start"
                    className="w-28 font-mono"
                    value={range.start}
                    disabled={disabled}
                    onChange={(e) => updateWindow({ start: e.target.value })}
                  >
                    {withValue(START_SLOTS, range.start).map((v) => (
                      <NativeSelectOption key={v} value={v}>
                        {v}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="window-end">{t('to')}</Label>
                  <NativeSelect
                    id="window-end"
                    className="w-28 font-mono"
                    value={range.end}
                    disabled={disabled}
                    onChange={(e) => updateWindow({ end: e.target.value })}
                  >
                    {withValue(END_SLOTS, range.end).map((v) => (
                      <NativeSelectOption key={v} value={v}>
                        {v}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <span className="pb-2 text-xs text-[var(--text-muted)]">{t('timezone')}</span>
              </div>
              {invalid && <p className="text-xs text-[var(--supernova)]">{invalid}</p>}
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <p className="mb-4 text-sm font-medium">{t('mandatoryTitle')}</p>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="bypass-window" className="font-normal">
              {t('bypassWindow')}
            </Label>
            <Switch
              id="bypass-window"
              checked={draft?.mandatoryBypass ?? true}
              disabled={disabled}
              onCheckedChange={(mandatoryBypass) => update({ mandatoryBypass })}
            />
          </div>
        </Panel>

        {writable && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={disabled || !dirty || invalid !== null}>
              {t('save')}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
