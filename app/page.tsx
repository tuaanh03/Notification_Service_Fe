'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Activity, AlertTriangle, BellRing, CheckCircle2, PlugZap, RefreshCw } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { loadOverviewAction, type OverviewView } from '@/app/actions'
import { AppLink } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/components/panel'
import { StatPill } from '@/components/stat-pill'
import { StatusPill, useStatusLabel } from '@/components/status-pill'
import { AuditTrail } from '@/components/audit-trail'
import { EmptyState } from '@/components/empty-state'
import { SetupGuide } from '@/components/setup-guide'
import { useExclusionLabel, useOutcomeOf } from '@/components/notifications/notification-outcome'
import { useApp } from '@/components/app-context'
import type { AppOverviewDto } from '@/lib/api/types'
import { fmtDateTime, fmtHour } from '@/lib/time'
import { cosmicTokens, statusColors } from '@/lib/theme'

/** Năm trạng thái đường gửi trực tiếp của MVP thật sự tạo ra — sáu trạng thái kia chưa có (CLAUDE.md mục 2.8). */
const MVP_STATUSES = ['queued', 'sending', 'sent', 'no_recipient', 'failed'] as const

/** Thư chờ quá lâu thì báo — hàng chờ dùng chung giới hạn tốc độ của hộp thư gửi cho MỌI app. */
const QUEUE_WARN_MS = 10 * 60_000

/** Ba đường của biểu đồ theo giờ. `pending` không vẽ: thư đang chờ rồi sẽ sang một trong ba cột này. */
const SERIES = [
  { key: 'sent', label: 'seriesSent', color: cosmicTokens.aurora },
  { key: 'failed', label: 'seriesFailed', color: cosmicTokens.supernova },
  { key: 'blocked', label: 'seriesBlocked', color: cosmicTokens.mutedText },
] as const

/** Định dạng số theo ngôn ngữ đang chọn (`1.234` / `1,234`). */
function useNum(): (n: number) => string {
  const format = useFormatter()
  return (n) => format.number(n)
}

type OverviewT = ReturnType<typeof useTranslations<'overview'>>

/** % so với 24 giờ trước. Hôm trước không gửi gì thì không có mốc để so. */
function deltaOf({ total, previousTotal }: AppOverviewDto['sends']): string | undefined {
  if (previousTotal === 0) return undefined
  return `${(((total - previousTotal) / previousTotal) * 100).toFixed(1)}%`
}

type Alert = { text: string; href?: string }

/** "Cần chú ý" — luật đơn giản trên chính số liệu của màn này, không có nguồn nào khác. */
/** Tỉ lệ mở (ADR-0031 của backend): đã mở / thư có chèn ảnh. Chưa có thư nào được theo dõi -> "—". */
function openRate(opens: AppOverviewDto['opens']): string {
  if (!opens || opens.tracked === 0) return '—'
  return `${Math.round((opens.opened / opens.tracked) * 100)}%`
}

function alertsOf(o: AppOverviewDto, now: number, t: OverviewT, num: (n: number) => string): Alert[] {
  const alerts: Alert[] = []
  if (o.topics.active === 0) {
    alerts.push({ text: t('alertNoTopic'), href: '/topics' })
  }
  const failed = o.byStatus.failed ?? 0
  if (failed > 0) alerts.push({ text: t('alertFailed', { count: num(failed) }), href: '/notifications' })
  const oldest = o.queue.oldestCreatedAt
  if (oldest !== null && now - Date.parse(oldest) > QUEUE_WARN_MS) {
    alerts.push({
      text: t('alertQueue', { waiting: num(o.queue.waiting), oldest: fmtDateTime(oldest) }),
    })
  }
  const noChannel = o.blocked.no_channel ?? 0
  if (noChannel > 0) {
    alerts.push({
      text: t('alertNoChannel', { count: num(noChannel) }),
      href: '/users',
    })
  }
  const r = o.recipients
  const unusable = r.total - r.emailActive
  if (r.total > 0 && unusable > 0) {
    const missing = unusable - r.emailUnsubscribed - r.emailInvalid
    alerts.push({
      text: t('alertUnusable', {
        unusable: num(unusable),
        total: num(r.total),
        missing: num(missing),
        unsubscribed: num(r.emailUnsubscribed),
        invalid: num(r.emailInvalid),
      }),
      href: '/users',
    })
  }
  return alerts
}

/**
 * Tổng quan của MỘT app — số thật từ `GET /admin/apps/:appId/overview`, 5 lần gửi gần nhất và nhật ký
 * của app (CLAUDE.md mục 2.11).
 *
 * Không có tỉ lệ bounce: thư trả về chưa được EWS xử lý (ADR-0018 của backend), hiện số đó là bịa.
 * Tải khi mở màn / đổi app và khi bấm Làm mới — không tự cập nhật liên tục.
 */
export default function Page() {
  const t = useTranslations('overview')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const { app } = useApp()
  const appId = app.app_id
  const [view, setView] = useState<OverviewView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const result = await loadOverviewAction(appId)
    if (result.ok) {
      setView(result.data)
      setLoadError(null)
    } else {
      setView(null)
      setLoadError(te('withCode', { message: result.message, code: result.code }))
    }
  }, [appId, te])

  useEffect(() => {
    startTransition(load)
  }, [load])

  // Đổi app thì bỏ số của app cũ ngay — không hiện số của app A dưới tên app B trong lúc tải.
  const [lastAppId, setLastAppId] = useState(appId)
  if (lastAppId !== appId) {
    setLastAppId(appId)
    setView(null)
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { app: app.slug })}
        actions={
          <Button variant="outline" disabled={pending} onClick={() => startTransition(load)}>
            <RefreshCw className={pending ? 'animate-spin' : undefined} />
            {tc('refresh')}
          </Button>
        }
      />
      {loadError ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={tc('loadErrorTitle')} description={loadError} />
        </Panel>
      ) : view ? (
        <Overview view={view} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={i === 4 ? 'h-24 sm:col-span-2 xl:col-span-1' : 'h-24'} />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      )}
    </>
  )
}

function Overview({ view }: { view: OverviewView }) {
  const t = useTranslations('overview')
  const tc = useTranslations('common')
  const num = useNum()
  const exclusion = useExclusionLabel()
  const outcomeOf = useOutcomeOf()
  const statusLabel = useStatusLabel()
  const { overview: o, recent, activity } = view
  const distribution = MVP_STATUSES.map((status) => ({ name: status, value: o.byStatus[status] ?? 0 }))
  const windowTotal = distribution.reduce((n, d) => n + d.value, 0)
  const chart = o.hourly.map((h) => ({ ...h, label: fmtHour(h.hour) }))
  const alerts = alertsOf(o, Date.parse(o.generatedAt), t, num)
  const blockedReasons = Object.entries(o.blocked).filter(([, n]) => n > 0)

  return (
    <>
      <SetupGuide
        steps={[
          { key: 'topic', done: o.topics.active > 0, href: '/topics' },
          { key: 'recipient', done: o.recipients.total > 0, href: '/users' },
          { key: 'send', done: recent.length > 0, href: '/compose' },
        ]}
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatPill
          label={t('statSends')}
          value={num(o.sends.total)}
          delta={deltaOf(o.sends)}
          trend={o.hourly.map((h) => h.sent + h.failed + h.blocked + h.pending)}
          hint={t('hintSends')}
        />
        <StatPill
          label={t('statFailed')}
          value={num(o.byStatus.failed ?? 0)}
          trend={o.hourly.map((h) => h.failed)}
          hint={t('hintFailed')}
        />
        <StatPill label={t('statWaiting')} value={num(o.queue.waiting)} hint={t('hintWaiting')} />
        <StatPill
          label={t('statRecipients')}
          value={`${num(o.recipients.emailActive)}/${num(o.recipients.total)}`}
          hint={t('hintRecipients')}
        />
        {/* Ô thứ 5: hai cột thì trải cả hàng, khỏi nằm lẻ nửa hàng. */}
        <div className="flex sm:col-span-2 xl:col-span-1">
          <StatPill
            label={t('statOpenRate')}
            value={openRate(o.opens)}
            hint={o.opens && o.opens.tracked > 0 ? t('hintOpenRate') : t('hintOpenRateNone')}
          />
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{t('hourlyTitle')}</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('hourlySubtitle')}</p>
            </div>
            <div className="flex gap-4 text-[11px]">
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <i className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {t(s.label)}
                </span>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={s.color} stopOpacity={0.24} />
                      <stop offset="1" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: cosmicTokens.mutedText, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: cosmicTokens.mutedText, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: cosmicTokens.deep,
                    border: `1px solid ${cosmicTokens.orbit}`,
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={t(s.label)}
                    stroke={s.color}
                    fill={`url(#fill-${s.key})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="size-4 text-[var(--starlight)]" />
            <h2 className="text-sm font-semibold">{t('statusTitle')}</h2>
          </div>
          {windowTotal === 0 ? (
            <p className="py-16 text-center text-xs text-[var(--text-muted)]">{t('noSends24h')}</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-52 w-1/2">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={distribution} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={2}>
                      {distribution.map((d) => (
                        <Cell key={d.name} fill={statusColors[d.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px]">
                    <i className="size-1.5 rounded-full" style={{ backgroundColor: statusColors[d.name] }} />
                    <span className="text-[var(--text-secondary)]">{statusLabel(d.name)}</span>
                    <b className="tabular-nums">{num(d.value)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
          {blockedReasons.length > 0 && (
            <div className="mt-4 border-t border-[var(--orbit)] pt-3">
              <p className="mb-2 text-[11px] text-[var(--text-muted)]">{t('blockedWhy')}</p>
              <div className="space-y-1">
                {blockedReasons.map(([reason, n]) => (
                  <div key={reason} className="flex justify-between gap-3 text-[11px]">
                    <span className="text-[var(--text-secondary)]">{exclusion(reason)}</span>
                    <b className="tabular-nums">{num(n)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--solar)]" />
            <h2 className="text-sm font-semibold">{t('attention')}</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 className="size-4 text-[var(--aurora)]" />
              {t('allClear')}
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div
                  key={a.text}
                  className="flex items-start gap-3 rounded-lg border border-[var(--orbit)] bg-[var(--orbit)]/40 p-3 text-xs"
                >
                  <span className="mt-0.5 font-mono text-[var(--solar)]">0{i + 1}</span>
                  <span className="flex-1 text-[var(--text-secondary)]">{a.text}</span>
                  {a.href && (
                    <AppLink href={a.href} className="shrink-0 text-[var(--starlight)] hover:underline">
                      {tc('view')}
                    </AppLink>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="size-4 text-[var(--starlight)]" />
            <h2 className="text-sm font-semibold">{t('activityTitle')}</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">{t('noActivity')}</p>
          ) : (
            <AuditTrail entries={activity} />
          )}
        </Panel>
      </div>
      <Panel className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--orbit)] p-5">
          <div>
            <h2 className="text-sm font-semibold">{t('recentTitle')}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t('recentSubtitle')}</p>
          </div>
          <Button nativeButton={false} variant="link" size="sm" render={<AppLink href="/notifications" />}>
            {tc('viewAll')}
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="p-5 text-xs text-[var(--text-muted)]">{t('noSends')}</p>
        ) : (
          <div className="divide-y divide-[var(--orbit)]">
            {recent.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 px-5 py-3 text-xs">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden shrink-0 tabular-nums text-[var(--text-muted)] sm:inline">{fmtDateTime(n.createdAt)}</span>
                  <span className="truncate font-mono text-[var(--text-secondary)]">{n.topic || '—'}</span>
                  <span className="truncate font-mono text-[var(--text-muted)]">{n.externalId ?? '—'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden text-[var(--text-muted)] md:inline">{outcomeOf(n)}</span>
                  <StatusPill status={n.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
