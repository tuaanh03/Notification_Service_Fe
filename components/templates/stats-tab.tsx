'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { BarChart3, PlugZap } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { loadOpenTrackingAction } from '@/app/settings/tracking/actions'
import { loadTemplateStatsAction } from '@/app/templates/stats-actions'
import { useApp } from '@/components/app-context'
import { AppLink } from '@/components/app-link'
import { EmptyState } from '@/components/empty-state'
import { InfoHint } from '@/components/info-hint'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { tOr } from '@/i18n/dynamic'
import type { TemplateStatsDays } from '@/lib/api/template-stats'
import type { TemplateStatsDto } from '@/lib/api/types'
import { cosmicTokens } from '@/lib/theme'
import { fmtDayMonth, vnDateOf } from '@/lib/time'
import { cn } from '@/lib/utils'
import { TemplateRecipients } from './template-recipients'

const DAYS: TemplateStatsDays[] = [7, 30, 90]

/** Đường trên biểu đồ — chú thích cũng là nút bật / tắt (như OneSignal). */
const SERIES = [
  { key: 'sent', label: 'seriesSent', color: cosmicTokens.aurora },
  { key: 'opened', label: 'seriesOpened', color: cosmicTokens.starlight },
  { key: 'failed', label: 'seriesFailed', color: cosmicTokens.supernova },
  { key: 'skipped', label: 'seriesSkipped', color: cosmicTokens.mutedText },
] as const
type SeriesKey = (typeof SERIES)[number]['key']

/** Tỉ lệ một chữ số thập phân; mẫu số 0 -> null ("—", không phải 0%). */
const rate = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 10)

/**
 * Tab "Hiệu quả" của màn soạn template (UX-24) — chỉ những gì EWS đo thật:
 *  - Đã chuyển đi = Microsoft 365 đã nhận thư (không phải "đã vào hộp"; thư trả về chưa đo);
 *  - Tỉ lệ mở = ước lượng bằng ảnh theo dõi, mẫu số là thư CÓ chèn ảnh;
 *  - không có lượt bấm link (đã bỏ — ADR-0031 backend, bổ sung 2026-10-23).
 * Bộ lọc khoảng ngày + phiên bản áp cho cả thẻ, biểu đồ và danh sách người nhận.
 */
export function StatsTab({ templateId }: { templateId: string }) {
  const t = useTranslations('templateStats')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const tx = useTranslations('exclusion')
  const format = useFormatter()
  const num = (n: number) => format.number(n)
  const { app } = useApp()
  const appId = app.app_id

  const [days, setDays] = useState<TemplateStatsDays>(30)
  const [version, setVersion] = useState<number | undefined>(undefined)
  const [stats, setStats] = useState<TemplateStatsDto | null>(null)
  const [tracking, setTracking] = useState<{ enabled: boolean; ready: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadTemplateStatsAction(appId, templateId, { days, version })
    if (result.ok) {
      setStats(result.data)
      setError(null)
    } else {
      setStats(null)
      setError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, templateId, days, version, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  // Cờ "đã mở" của app — chỉ để giải thích ô "—" (chưa bật / server chưa sẵn sàng). Lỗi ở đây không chặn màn.
  useEffect(() => {
    let live = true
    loadOpenTrackingAction(appId).then((result) => {
      if (live) setTracking(result.ok ? result.data : null)
    })
    return () => {
      live = false
    }
  }, [appId])

  if (error) {
    return (
      <Panel className="overflow-hidden">
        <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={error} />
      </Panel>
    )
  }

  const s = stats?.summary
  const versionDates = new Map((stats?.versions ?? []).flatMap((v) => (v.publishedAt ? [[v.version, vnDateOf(v.publishedAt)] as const] : [])))
  const inRange = new Set(stats?.series.map((d) => d.date))

  return (
    <div className="space-y-4" data-testid="template-stats">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="tpl-stats-days" className="text-xs">{t('range')}</Label>
          <NativeSelect id="tpl-stats-days" value={String(days)} onChange={(e) => setDays(Number(e.target.value) as TemplateStatsDays)}>
            {DAYS.map((d) => (
              <NativeSelectOption key={d} value={String(d)}>{t('lastDays', { days: d })}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tpl-stats-version" className="text-xs">{t('version')}</Label>
          <NativeSelect
            id="tpl-stats-version"
            value={version === undefined ? '' : String(version)}
            onChange={(e) => setVersion(e.target.value === '' ? undefined : Number(e.target.value))}
          >
            <NativeSelectOption value="">{t('allVersions')}</NativeSelectOption>
            {(stats?.versions ?? []).map((v) => (
              <NativeSelectOption key={v.id} value={String(v.version)}>
                {v.publishedAt ? t('versionPublished', { version: v.version, date: vnDateOf(v.publishedAt) ?? '' }) : t('versionDraft', { version: v.version })}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {s && s.total === 0 ? (
        <Panel>
          <EmptyState
            icon={BarChart3}
            title={t('emptyTitle', { days })}
            description={version === undefined ? t('emptyBody') : t('emptyVersion', { version })}
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5" data-testid="stats-sent">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold">{t('sentTitle')}</h3>
                <InfoHint label={t('sentTitle')} summary={t('sentInfo')} />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{s ? num(s.sent) : '…'}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {s ? t('sentHint', { rate: format.number(rate(s.sent, s.total) ?? 0) }) : ' '}
              </p>
              {s && (
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span style={{ width: `${(s.sent / s.total) * 100}%`, background: cosmicTokens.aurora }} />
                  <span style={{ width: `${(s.failed / s.total) * 100}%`, background: cosmicTokens.supernova }} />
                  <span style={{ width: `${(s.skipped / s.total) * 100}%`, background: cosmicTokens.mutedText }} />
                </div>
              )}
              <dl className="mt-3 divide-y divide-border text-sm">
                <Fact label={t('total')} value={s ? num(s.total) : '…'} strong />
                <Fact dot={cosmicTokens.supernova} label={t('failed')} value={s ? num(s.failed) : '…'} />
                <Fact dot={cosmicTokens.mutedText} label={t('skipped')} value={s ? num(s.skipped) : '…'}>
                  {s && s.skipped > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--text-muted)]">
                      {Object.entries(s.skippedByReason).map(([reason, n]) => (
                        <li key={reason}>
                          {tOr(tx, reason)}:<span className="tabular-nums">{num(n ?? 0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Fact>
                {s && s.pending > 0 && <Fact label={t('pending')} value={num(s.pending)} />}
                <Fact dot={cosmicTokens.aurora} label={t('sent')} value={s ? num(s.sent) : '…'} strong />
              </dl>
            </Panel>

            <Panel className="p-5" data-testid="stats-opens">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold">{t('openTitle')}</h3>
                <InfoHint label={t('openTitle')} summary={t('openInfo')} />
              </div>
              {stats && stats.opens.tracked > 0 ? (
                <>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">
                    {format.number(rate(stats.opens.opened, stats.opens.tracked) ?? 0)}%
                    <span className="ml-1.5 text-sm font-normal text-[var(--text-muted)]">({num(stats.opens.opened)})</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{t('openHint')}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-3xl font-semibold">—</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {tracking && !tracking.enabled ? t('openOff') : tracking && !tracking.ready ? t('openNotReady') : t('openNone')}
                  </p>
                  {tracking && !tracking.enabled && (
                    <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<AppLink href="/settings/tracking" />}>
                      {t('openEnable')}
                    </Button>
                  )}
                </>
              )}
              <dl className="mt-3 divide-y divide-border text-sm">
                {/* Chưa có thư nào được theo dõi thì "0 người mở" là nói sai — cũng "—" như số lớn. */}
                <Fact label={t('opened')} value={!stats ? '…' : stats.opens.tracked > 0 ? num(stats.opens.opened) : '—'} />
                <Fact label={t('totalOpens')} value={!stats ? '…' : stats.opens.tracked > 0 ? num(stats.opens.total) : '—'} />
                <Fact label={t('tracked')} value={stats ? num(stats.opens.tracked) : '…'} />
              </dl>
            </Panel>
          </div>

          <Panel className="p-5" data-testid="stats-chart">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold">{t('chartTitle')}</h3>
                  <InfoHint label={t('chartTitle')} summary={t('chartInfo')} />
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t('chartSubtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('chartToggle')}>
                {SERIES.map((series) => {
                  const on = !hidden.has(series.key)
                  return (
                    <button
                      key={series.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev)
                          if (on) next.add(series.key)
                          else next.delete(series.key)
                          return next
                        })
                      }
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                        on ? 'border-border bg-muted' : 'border-dashed border-border text-[var(--text-muted)]',
                      )}
                    >
                      <i className="size-2 rounded-full" style={{ backgroundColor: on ? series.color : 'transparent', outline: `1px solid ${series.color}` }} />
                      {t(series.label)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="h-64">
              {stats && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.series.map((d) => ({ ...d, label: fmtDayMonth(d.date) }))}>
                    <XAxis dataKey="label" tick={{ fill: cosmicTokens.mutedText, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis allowDecimals={false} tick={{ fill: cosmicTokens.mutedText, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ background: cosmicTokens.deep, border: `1px solid ${cosmicTokens.orbit}`, borderRadius: 8, fontSize: 11 }}
                    />
                    {[...versionDates].map(([v, date]) =>
                      date && inRange.has(date) ? (
                        <ReferenceLine
                          key={v}
                          x={fmtDayMonth(date)}
                          stroke={cosmicTokens.orbit}
                          strokeDasharray="4 3"
                          label={{ value: `v${v}`, position: 'insideTopLeft', fill: cosmicTokens.secondaryText, fontSize: 10 }}
                        />
                      ) : null,
                    )}
                    {SERIES.filter((series) => !hidden.has(series.key)).map((series) => (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={t(series.label)}
                        stroke={series.color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          {stats && <TemplateRecipients templateId={templateId} days={days} version={version} stats={stats} />}
        </>
      )}
    </div>
  )
}

function Fact({
  label,
  value,
  dot,
  strong,
  children,
}: {
  label: string
  value: string
  dot?: string
  strong?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <dt className={cn('flex items-center gap-2', dot && 'pl-1', strong ? 'font-medium' : 'text-[var(--text-secondary)]')}>
          {dot && <i className="size-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden />}
          {label}
        </dt>
        <dd className={cn('tabular-nums', strong && 'font-semibold')}>{value}</dd>
      </div>
      {children}
    </div>
  )
}
