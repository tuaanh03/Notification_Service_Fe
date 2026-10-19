'use client'
import { useState, useTransition } from 'react'
import { AlertTriangle, RotateCcw, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { updateSystemSettingsAction } from '@/app/admin/settings/actions'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { SystemSettingDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'

/** next-intl coi `.` là tầng lồng — khoá câu dịch không chứa tên cài đặt nguyên văn. */
const LABEL: Partial<
  Record<
    string,
    {
      label: 'dedupeLabel' | 'rateLabel' | 'maxHooksLabel' | 'baseUrlLabel' | 'maxKeysLabel' | 'maxEndpointsLabel' | 'visualEditorLabel'
      help: 'dedupeHelp' | 'rateHelp' | 'maxHooksHelp' | 'baseUrlHelp' | 'maxKeysHelp' | 'maxEndpointsHelp' | 'visualEditorHelp'
      unit?: 'unitMinutes' | 'unitPerMinute' | 'unitKeys' | 'unitHooks' | 'unitUrls'
    }
  >
> = {
  'incoming.dedupe_window_minutes': { label: 'dedupeLabel', help: 'dedupeHelp', unit: 'unitMinutes' },
  'incoming.max_publications_per_minute': { label: 'rateLabel', help: 'rateHelp', unit: 'unitPerMinute' },
  'incoming.max_hooks_per_app': { label: 'maxHooksLabel', help: 'maxHooksHelp', unit: 'unitHooks' },
  'api.public_base_url': { label: 'baseUrlLabel', help: 'baseUrlHelp' },
  'apps.max_active_api_keys': { label: 'maxKeysLabel', help: 'maxKeysHelp', unit: 'unitKeys' },
  'webhooks.max_endpoints_per_app': { label: 'maxEndpointsLabel', help: 'maxEndpointsHelp', unit: 'unitUrls' },
  'templates.visual_editor_enabled': { label: 'visualEditorLabel', help: 'visualEditorHelp' },
}

/** Nhóm trên màn: `apps.*` / `webhooks.*` -> Ứng dụng; `templates.*` -> Template; còn lại -> Incoming webhook. */
const groupOf = (key: string): 'apps' | 'templates' | 'incoming' =>
  key.startsWith('apps.') || key.startsWith('webhooks.') ? 'apps' : key.startsWith('templates.') ? 'templates' : 'incoming'

/**
 * Cài đặt hệ thống (ADR-0030 của backend) — con số vận hành Super Admin chỉnh không cần deploy. Mỗi
 * dòng lưu riêng (một nút Lưu / một dòng) để đổi một con số không vô tình ghi đè con số khác; "Về mặc
 * định" gửi `null`. Ô số chỉ nhận trong khoảng backend cho phép — backend vẫn kiểm lại.
 */
export function SystemSettingsPanel({ initial }: { initial: SystemSettingDto[] }) {
  const t = useTranslations('systemSettings')
  const te = useTranslations('errors')
  const [settings, setSettings] = useState(initial)
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((s) => [s.key, s.value === null ? '' : String(s.value)])),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = (setting: SystemSettingDto, value: number | string | boolean | null) =>
    startTransition(async () => {
      const result = await updateSystemSettingsAction({ [setting.key]: value })
      if (!result.ok) {
        setError(te('withCode', { message: result.message, code: result.issues?.[0]?.code ?? result.code }))
        return
      }
      setError(null)
      setSettings(result.data)
      setDrafts(Object.fromEntries(result.data.map((s) => [s.key, s.value === null ? '' : String(s.value)])))
      toast.success(t('saved'))
    })

  const parsed = (s: SystemSettingDto): number | string | boolean | null | undefined => {
    const raw = (drafts[s.key] ?? '').trim()
    if (s.kind === 'int') {
      const n = Number(raw)
      return raw !== '' && Number.isInteger(n) && n >= (s.min ?? -Infinity) && n <= (s.max ?? Infinity) ? n : undefined
    }
    return raw === '' ? null : raw
  }

  const row = (s: SystemSettingDto) => (s.kind === 'bool' ? boolRow(s) : valueRow(s))

  const meta = (s: SystemSettingDto) => {
    const label = LABEL[s.key]
    const shownDefault = s.default === null ? '—' : typeof s.default === 'boolean' ? t(s.default ? 'on' : 'off') : String(s.default)
    return (
      <div className="min-w-0">
        <Label htmlFor={`setting-${s.key}`} className="text-sm">
          {label ? t(label.label) : s.key}
        </Label>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{label ? t(label.help) : null}</p>
        <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
          {s.key}
          {s.kind === 'int' && ` · ${t('range', { min: s.min ?? 0, max: s.max ?? 0 })}`}
          {` · ${t('default', { value: shownDefault })}`}
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {s.customized && s.updatedAt ? t('customized', { at: fmtDateTime(s.updatedAt) }) : t('usingDefault')}
        </p>
      </div>
    )
  }

  /** Bật / tắt lưu ngay khi gạt — một khoá, không có ô gõ nên không cần nút Lưu riêng. */
  const boolRow = (s: SystemSettingDto) => (
    <div key={s.key} className="grid gap-2 border-b border-[var(--orbit)] pb-5 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-6">
      {meta(s)}
      <div className="flex min-w-0 items-center gap-3">
        <Switch id={`setting-${s.key}`} checked={s.value === true} disabled={pending} onCheckedChange={(checked) => save(s, checked)} />
        <span className="text-xs text-[var(--text-secondary)]">{t(s.value === true ? 'on' : 'off')}</span>
        <Button size="sm" variant="ghost" disabled={!s.customized || pending} onClick={() => save(s, null)}>
          <RotateCcw /> {t('reset')}
        </Button>
      </div>
    </div>
  )

  const valueRow = (s: SystemSettingDto) => {
    const label = LABEL[s.key]
    const next = parsed(s)
    const changed = next !== undefined && next !== s.value
    return (
      <div key={s.key} className="grid gap-2 border-b border-[var(--orbit)] pb-5 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-6">
        {meta(s)}
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id={`setting-${s.key}`}
              inputMode={s.kind === 'int' ? 'numeric' : 'url'}
              value={drafts[s.key] ?? ''}
              placeholder={s.kind === 'url' ? 'https://ews-api.example.com' : undefined}
              onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              className="font-mono text-xs tabular-nums"
              aria-invalid={next === undefined}
            />
            {label?.unit && <span className="shrink-0 text-xs text-[var(--text-muted)]">{t(label.unit)}</span>}
          </div>
          {next === undefined && <p className="text-[11px] text-[var(--supernova)]">{t('outOfRange', { min: s.min ?? 0, max: s.max ?? 0 })}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={!changed || pending} onClick={() => next !== undefined && save(s, next)}>
              <Save /> {t('save')}
            </Button>
            <Button size="sm" variant="ghost" disabled={!s.customized || pending} onClick={() => save(s, null)}>
              <RotateCcw /> {t('reset')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>{t('saveFailed')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Panel className="p-5" ring>
        <h2 className="text-sm font-semibold">{t('incomingTitle')}</h2>
        <p className="mt-1 mb-5 text-xs text-[var(--text-secondary)]">{t('incomingIntro')}</p>
        <div className="space-y-6">{settings.filter((s) => groupOf(s.key) === 'incoming').map(row)}</div>
      </Panel>
      <Panel className="mt-5 p-5">
        <h2 className="mb-5 text-sm font-semibold">{t('appsTitle')}</h2>
        <div className="space-y-6">{settings.filter((s) => groupOf(s.key) === 'apps').map(row)}</div>
      </Panel>
      {settings.some((s) => groupOf(s.key) === 'templates') && (
        <Panel className="mt-5 p-5">
          <h2 className="mb-5 text-sm font-semibold">{t('templatesTitle')}</h2>
          <div className="space-y-6">{settings.filter((s) => groupOf(s.key) === 'templates').map(row)}</div>
        </Panel>
      )}
      <p className="mt-4 text-xs text-[var(--text-muted)]">{t('propagation')}</p>
    </>
  )
}
