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
import { InfoHint } from '@/components/info-hint'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { useRole } from '@/components/role-context'
import { Badge } from '@/components/ui/badge'
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

/** Ô số giữ chuỗi người gõ — kiểm khi hiện lỗi / lưu, không ép số giữa chừng. */
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

/** "12" -> 12; rỗng, số lẻ, ngoài 1..1000 -> null. */
const countOf = (value: string): number | null => {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_PER_MINUTE ? n : null
}

const sameWindowPart = (a: Draft, b: Draft) =>
  a.enabled === b.enabled &&
  a.mandatoryBypass === b.mandatoryBypass &&
  (!a.enabled ||
    (a.window.start === b.window.start && a.window.end === b.window.end && a.window.days.join() === b.window.days.join()))
const samePacingPart = (a: Draft, b: Draft) =>
  a.pacing === b.pacing && a.mandatoryBypassPacing === b.mandatoryBypassPacing && (!a.pacing || a.perMinute === b.perMinute)
const sameCeilingPart = (a: Draft, b: Draft) => a.ceilingOn === b.ceilingOn && (!a.ceilingOn || a.ceiling === b.ceiling)

/** Một mục: tiêu đề + ⓘ (+ nhãn) bên trái, công tắc bên phải; mục con luôn hiện bên dưới. */
function Section({
  title,
  hint,
  badge,
  toggle,
  ring,
  children,
}: {
  title: string
  hint: React.ReactNode
  badge?: string | undefined
  toggle?: React.ReactNode
  ring?: boolean
  children: React.ReactNode
}) {
  return (
    <Panel className="p-6" ring={ring ?? false}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">{title}</h2>
          {hint}
          {badge && (
            <Badge variant="outline" className="text-[11px] font-normal text-[var(--text-secondary)]">
              {badge}
            </Badge>
          )}
        </div>
        {toggle}
      </div>
      <div className="mt-5 space-y-5 border-t pt-5">{children}</div>
    </Panel>
  )
}

/** Mục con có ô chỉnh: dưới `lg` (điện thoại, tablet có thanh bên) tên ở trên; từ `lg` tên bên trái. Lỗi nằm ngay dưới ô. */
function Row({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string | undefined
  error?: string | null | undefined
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <Label htmlFor={htmlFor} className="font-normal lg:pt-1.5">
        {label}
      </Label>
      <div className="min-w-0 space-y-1.5">
        {children}
        {error && <p className="text-xs text-[var(--supernova)]">{error}</p>}
      </div>
    </div>
  )
}

/** Mục con là công tắc: luôn nằm ngang — công tắc nhỏ, tên dài thì xuống dòng. */
function SwitchRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

/**
 * `/settings/limits` — Giới hạn gửi của app đang xem (ADR-0032 của backend): Khung giờ gửi · Dàn đều · Trần tốc độ.
 * Mục con luôn hiện; công tắc mục cha tắt thì NÚT CHỈNH của mục con mờ + khoá (giá trị giữ nguyên, bật lại còn đó).
 * Giải thích nằm trong ⓘ của mục cha, không viết trên màn. Một lần lưu cho cả trang qua thanh dính đáy.
 * Trần chỉ Super Admin sửa; người khác thấy con số. Người không quản lý app: mọi nút khoá, không có thanh lưu.
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

  const locked = !draft || !writable || pending
  const windowOn = draft?.enabled ?? false
  const pacingOn = draft?.pacing ?? false
  const ceilingOn = draft?.ceilingOn ?? false
  const range = draft?.window ?? OFFICE_HOURS

  // Trần mà dàn đều phải nằm dưới: Super Admin đang sửa thì theo ô trần, người khác theo trần đã lưu (draft = saved).
  const ceilingValue = ceilingOn && draft ? countOf(draft.ceiling) : null
  const perMinuteValue = pacingOn && draft ? countOf(draft.perMinute) : null

  const daysError = windowOn && range.days.length === 0 ? t('errDays') : null
  const timeError = windowOn && range.start >= range.end ? t('errTime') : null
  const perMinuteError = !pacingOn
    ? null
    : perMinuteValue === null
      ? t('errNumber', { max: MAX_PER_MINUTE })
      : ceilingValue !== null && perMinuteValue > ceilingValue
        ? t('errAboveCeiling', { max: ceilingValue })
        : null
  const ceilingError = superAdmin && ceilingOn && ceilingValue === null ? t('errNumber', { max: MAX_PER_MINUTE }) : null
  const invalid = Boolean(daysError ?? timeError ?? perMinuteError ?? ceilingError)

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

  const hint = (summary: string, items: [term: string, definition: string][]) => (
    <InfoHint label={t('info')} summary={summary} items={items.map(([term, definition]) => ({ term, definition }))} />
  )
  const parentSwitch = (id: string, label: string, checked: boolean, disabled: boolean, onChange: (value: boolean) => void) => (
    <Switch id={id} aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
  )

  return (
    <>
      {header}
      <div className="max-w-2xl space-y-5">
        <Section
          ring
          title={t('windowTitle')}
          hint={hint(t('windowHint'), [
            [t('days'), t('daysDef')],
            [t('hours'), t('hoursDef')],
            [t('windowMandatory'), t('windowMandatoryDef')],
          ])}
          toggle={parentSwitch('send-window', t('windowTitle'), windowOn, locked, (enabled) => update({ enabled }))}
        >
          <Row label={t('days')} error={daysError}>
            <ToggleGroup
              multiple
              variant="outline"
              size="sm"
              className="grid w-full grid-cols-7 lg:flex lg:w-fit"
              value={range.days.map(String)}
              onValueChange={(v) => updateWindow({ days: (v as string[]).map(Number).sort((a, b) => a - b) })}
              disabled={locked || !windowOn}
            >
              {DAYS.map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={String(d)}
                  className="min-w-0 px-0 lg:min-w-11 lg:px-2.5 aria-pressed:border-[var(--starlight)] aria-pressed:bg-[var(--starlight)] aria-pressed:text-white aria-pressed:hover:bg-[var(--starlight)]"
                >
                  {t(`day${d}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>

          <Row label={t('hours')} htmlFor="window-start" error={timeError}>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                id="window-start"
                aria-label={t('from')}
                aria-invalid={timeError !== null}
                className="w-28 font-mono disabled:opacity-50"
                value={range.start}
                disabled={locked || !windowOn}
                onChange={(e) => updateWindow({ start: e.target.value })}
              >
                {withValue(START_SLOTS, range.start).map((v) => (
                  <NativeSelectOption key={v} value={v}>
                    {v}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <span className="text-[var(--text-muted)]">–</span>
              <NativeSelect
                id="window-end"
                aria-label={t('to')}
                aria-invalid={timeError !== null}
                className="w-28 font-mono disabled:opacity-50"
                value={range.end}
                disabled={locked || !windowOn}
                onChange={(e) => updateWindow({ end: e.target.value })}
              >
                {withValue(END_SLOTS, range.end).map((v) => (
                  <NativeSelectOption key={v} value={v}>
                    {v}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <span className="ml-1 text-xs text-[var(--text-muted)]">{t('timezone')}</span>
            </div>
          </Row>

          <SwitchRow
            id="window-mandatory"
            label={t('windowMandatory')}
            checked={draft?.mandatoryBypass ?? true}
            disabled={locked || !windowOn}
            onChange={(mandatoryBypass) => update({ mandatoryBypass })}
          />
        </Section>

        <Section
          title={t('pacingTitle')}
          hint={hint(t('pacingHint'), [
            [t('perMinute'), t('perMinuteDef')],
            [t('pacingMandatory'), t('pacingMandatoryDef')],
          ])}
          toggle={parentSwitch('pacing', t('pacingTitle'), pacingOn, locked, (pacing) => update({ pacing }))}
        >
          <Row label={t('perMinute')} htmlFor="per-minute" error={perMinuteError}>
            <div className="flex items-center gap-2">
              <Input
                id="per-minute"
                type="number"
                inputMode="numeric"
                min={1}
                max={ceilingValue ?? MAX_PER_MINUTE}
                aria-invalid={perMinuteError !== null}
                className="w-24 font-mono"
                value={draft?.perMinute ?? ''}
                disabled={locked || !pacingOn}
                onChange={(e) => update({ perMinute: e.target.value })}
              />
              <span className="text-sm text-[var(--text-secondary)]">{t('unit')}</span>
            </div>
          </Row>

          <SwitchRow
            id="pacing-mandatory"
            label={t('pacingMandatory')}
            checked={draft?.mandatoryBypassPacing ?? true}
            disabled={locked || !pacingOn}
            onChange={(mandatoryBypassPacing) => update({ mandatoryBypassPacing })}
          />
        </Section>

        <Section
          title={t('ceilingTitle')}
          badge={t('superAdmin')}
          hint={hint(t('ceilingHint'), [[t('ceiling'), t('ceilingDef')]])}
          toggle={superAdmin ? parentSwitch('ceiling', t('ceilingTitle'), ceilingOn, locked, (on) => update({ ceilingOn: on })) : undefined}
        >
          {superAdmin ? (
            <Row label={t('ceiling')} htmlFor="ceiling-value" error={ceilingError}>
              <div className="flex items-center gap-2">
                <Input
                  id="ceiling-value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_PER_MINUTE}
                  aria-invalid={ceilingError !== null}
                  className="w-24 font-mono"
                  value={draft?.ceiling ?? ''}
                  disabled={locked || !ceilingOn}
                  onChange={(e) => update({ ceiling: e.target.value })}
                />
                <span className="text-sm text-[var(--text-secondary)]">{t('unit')}</span>
              </div>
            </Row>
          ) : (
            <Row label={t('ceiling')}>
              <p className="text-sm lg:pt-1.5">
                {saved?.ceilingOn ? t('count', { count: Number(saved.ceiling) }) : t('unlimited')}
              </p>
            </Row>
          )}
        </Section>

        {writable && dirty && (
          <div className="sticky bottom-4 z-20">
            <Panel glow className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="sm:hidden">{t('unsavedShort')}</span>
                <span className="hidden sm:inline">{t('unsaved')}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => setDraft(saved)}>
                  {t('cancel')}
                </Button>
                <Button size="sm" onClick={save} disabled={pending || invalid}>
                  {t('save')}
                </Button>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </>
  )
}
