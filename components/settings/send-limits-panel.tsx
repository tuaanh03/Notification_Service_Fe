'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Gauge } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  loadSendLimitsAction,
  saveSendLimitsAction,
  type SendLimits,
  type SendLimitsChanges,
} from '@/app/settings/limits/actions'
import { useApp } from '@/components/app-context'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { useRole } from '@/components/role-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SendWindowDto } from '@/lib/api/types'

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const
/** Lần đầu bật khung giờ: giờ hành chính. */
const OFFICE_HOURS: SendWindowDto = { days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }
/** Lần đầu bật dàn đều (thấp hơn nếu trần thấp hơn). */
const DEFAULT_PER_MINUTE = 10
/** Khoảng backend nhận cho mọi con số thư / phút (`PACING_INVALID`). */
const MAX_PER_MINUTE = 1000

/**
 * Mốc giờ chọn được, mỗi 30 phút. Không dùng ô giờ của trình duyệt: nó hiện AM/PM theo máy người xem và
 * không có `24:00` (tới hết ngày). Giờ lẻ đặt qua API vẫn hiện được — `withValue` chèn vào danh sách.
 */
const SLOTS = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const START_SLOTS = SLOTS.slice(0, -1)
const END_SLOTS = SLOTS.slice(1)
const withValue = (slots: string[], value: string) => (slots.includes(value) ? slots : [...slots, value].sort())

/** Ô số giữ chuỗi người gõ — kiểm lúc lưu, không ép số giữa chừng. */
type Draft = {
  enabled: boolean
  window: SendWindowDto
  mandatoryBypass: boolean
  pacing: boolean
  perMinute: string
  mandatoryBypassPacing: boolean
  ceilingOn: boolean
  ceiling: string
}

const draftOf = (limits: SendLimits): Draft => ({
  enabled: limits.sendWindow !== null,
  window: limits.sendWindow ?? OFFICE_HOURS,
  mandatoryBypass: limits.mandatoryBypassWindow,
  pacing: limits.sendPerMinute !== null,
  perMinute: String(limits.sendPerMinute ?? Math.min(DEFAULT_PER_MINUTE, limits.maxSendPerMinute ?? DEFAULT_PER_MINUTE)),
  mandatoryBypassPacing: limits.mandatoryBypassPacing,
  ceilingOn: limits.maxSendPerMinute !== null,
  ceiling: String(limits.maxSendPerMinute ?? MAX_PER_MINUTE),
})

/** "12" -> 12; rỗng, số lẻ, ngoài 1..max -> null. */
const countIn = (value: string, max: number): number | null => {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= max ? n : null
}

const sameWindowPart = (a: Draft, b: Draft) =>
  a.enabled === b.enabled &&
  a.mandatoryBypass === b.mandatoryBypass &&
  (!a.enabled ||
    (a.window.start === b.window.start && a.window.end === b.window.end && a.window.days.join() === b.window.days.join()))
const samePacingPart = (a: Draft, b: Draft) =>
  a.pacing === b.pacing && a.mandatoryBypassPacing === b.mandatoryBypassPacing && (!a.pacing || a.perMinute === b.perMinute)
const sameCeilingPart = (a: Draft, b: Draft) => a.ceilingOn === b.ceilingOn && (!a.ceilingOn || a.ceiling === b.ceiling)

/**
 * `/settings/limits` — Giới hạn gửi của app đang xem (ADR-0032 của backend): khung giờ gửi, dàn đều, ngoại lệ
 * cho tin bắt buộc; Super Admin thấy thêm trần tốc độ. Ai xem app cũng thấy; chỉ người quản lý app
 * (`canManage`) sửa — backend vẫn chặn (403).
 */
export function SendLimitsPanel() {
  const t = useTranslations('limits')
  const te = useTranslations('errors')
  const { app } = useApp()
  const role = useRole()
  const writable = role.canManage(app)
  const superAdmin = role.isSuperAdmin
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
  const ceilingValue = draft?.ceilingOn ? countIn(draft.ceiling, MAX_PER_MINUTE) : null
  // Trần mà dàn đều phải nằm dưới: Super Admin đang sửa thì theo ô trần, người khác theo trần đã lưu.
  const ceilingLimit = draft?.ceilingOn ? (ceilingValue ?? MAX_PER_MINUTE) : MAX_PER_MINUTE
  const perMinuteValue = draft?.pacing ? countIn(draft.perMinute, ceilingLimit) : null

  const windowInvalid =
    draft?.enabled === true
      ? range.days.length === 0
        ? t('errDays')
        : range.start >= range.end
          ? t('errTime')
          : null
      : null
  const pacingInvalid = draft?.pacing === true && perMinuteValue === null ? t('errPerMinute', { max: ceilingLimit }) : null
  const ceilingInvalid = draft?.ceilingOn === true && ceilingValue === null ? t('errPerMinute', { max: MAX_PER_MINUTE }) : null
  const invalid = windowInvalid ?? pacingInvalid ?? ceilingInvalid

  const changes: SendLimitsChanges = {}
  if (draft && saved) {
    if (!sameCeilingPart(draft, saved)) changes.ceiling = ceilingValue
    if (!sameWindowPart(draft, saved)) changes.window = { window: draft.enabled ? draft.window : null, mandatoryBypass: draft.mandatoryBypass }
    if (!samePacingPart(draft, saved)) changes.pacing = { perMinute: perMinuteValue, mandatoryBypass: draft.mandatoryBypassPacing }
  }
  const dirty = Object.keys(changes).length > 0
  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const updateWindow = (patch: Partial<SendWindowDto>) => setDraft((d) => (d ? { ...d, window: { ...d.window, ...patch } } : d))

  const save = () =>
    startTransition(async () => {
      const result = await saveSendLimitsAction(appId, changes)
      if (!result.ok) {
        toast.error(te('withCode', { message: result.message, code: result.code }))
        // Bước trước có thể đã lưu — đọc lại cho đúng.
        await load()
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
              {windowInvalid && <p className="text-xs text-[var(--supernova)]">{windowInvalid}</p>}
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="pacing">{t('pacingTitle')}</Label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('pacingHint')}</p>
            </div>
            <Switch
              id="pacing"
              checked={draft?.pacing ?? false}
              disabled={disabled}
              onCheckedChange={(pacing) => update({ pacing })}
            />
          </div>

          {draft?.pacing && (
            <div className="mt-6 space-y-2.5 border-t pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="per-minute"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={ceilingLimit}
                  className="w-24 font-mono"
                  value={draft.perMinute}
                  disabled={disabled}
                  aria-label={t('perMinute')}
                  onChange={(e) => update({ perMinute: e.target.value })}
                />
                <span className="text-sm text-[var(--text-secondary)]">{t('perMinute')}</span>
              </div>
              {pacingInvalid ? (
                <p className="text-xs text-[var(--supernova)]">{pacingInvalid}</p>
              ) : (
                saved?.ceilingOn &&
                !superAdmin && <p className="text-xs text-[var(--text-muted)]">{t('ceilingNote', { max: saved.ceiling })}</p>
              )}
            </div>
          )}
        </Panel>

        {superAdmin && (
          <Panel className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="ceiling">{t('ceilingTitle')}</Label>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t('ceilingHint')}</p>
              </div>
              <Switch
                id="ceiling"
                checked={draft?.ceilingOn ?? false}
                disabled={disabled}
                onCheckedChange={(ceilingOn) => update({ ceilingOn })}
              />
            </div>

            {draft?.ceilingOn && (
              <div className="mt-6 space-y-2.5 border-t pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="ceiling-value"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_PER_MINUTE}
                    className="w-24 font-mono"
                    value={draft.ceiling}
                    disabled={disabled}
                    aria-label={t('ceilingTitle')}
                    onChange={(e) => update({ ceiling: e.target.value })}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">{t('perMinute')}</span>
                </div>
                {ceilingInvalid && <p className="text-xs text-[var(--supernova)]">{ceilingInvalid}</p>}
              </div>
            )}
          </Panel>
        )}

        <Panel className="p-6">
          <p className="mb-4 text-sm font-medium">{t('mandatoryTitle')}</p>
          <div className="space-y-4">
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
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="bypass-pacing" className="font-normal">
                {t('bypassPacing')}
              </Label>
              <Switch
                id="bypass-pacing"
                checked={draft?.mandatoryBypassPacing ?? true}
                disabled={disabled}
                onCheckedChange={(mandatoryBypassPacing) => update({ mandatoryBypassPacing })}
              />
            </div>
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
