'use client'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Activity, AlertTriangle, BellRing, CheckCircle2, PlugZap, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { loadOverviewAction, type OverviewView } from '@/app/actions'
import { AppLink } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Panel } from '@/components/panel'
import { StatPill } from '@/components/stat-pill'
import { StatusPill } from '@/components/status-pill'
import { AuditTrail } from '@/components/audit-trail'
import { EmptyState } from '@/components/empty-state'
import { EXCLUSION_LABEL, outcomeOf } from '@/components/notifications/notification-outcome'
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
  { key: 'sent', label: 'đã gửi', color: cosmicTokens.aurora },
  { key: 'failed', label: 'lỗi', color: cosmicTokens.supernova },
  { key: 'blocked', label: 'bị chặn', color: cosmicTokens.mutedText },
] as const

const num = (n: number) => n.toLocaleString('vi-VN')

/** % so với 24 giờ trước. Hôm trước không gửi gì thì không có mốc để so. */
function deltaOf({ total, previousTotal }: AppOverviewDto['sends']): string | undefined {
  if (previousTotal === 0) return undefined
  return `${(((total - previousTotal) / previousTotal) * 100).toFixed(1)}%`
}

type Alert = { text: string; href?: string }

/** "Cần chú ý" — luật đơn giản trên chính số liệu của màn này, không có nguồn nào khác. */
function alertsOf(o: AppOverviewDto, now: number): Alert[] {
  const alerts: Alert[] = []
  if (o.topics.active === 0) {
    alerts.push({ text: 'App chưa có chủ đề nào đang hoạt động — app service chưa gửi được thư.', href: '/topics' })
  }
  const failed = o.byStatus.failed ?? 0
  if (failed > 0) alerts.push({ text: `${num(failed)} lần gửi lỗi trong 24 giờ qua.`, href: '/notifications' })
  const oldest = o.queue.oldestCreatedAt
  if (oldest !== null && now - Date.parse(oldest) > QUEUE_WARN_MS) {
    alerts.push({
      text: `Hàng chờ đang dài: ${num(o.queue.waiting)} thư, thư cũ nhất chờ từ ${fmtDateTime(oldest)}. Tốc độ gửi là giới hạn chung của hộp thư gửi, chia cho mọi app.`,
    })
  }
  const noChannel = o.blocked.no_channel ?? 0
  if (noChannel > 0) {
    alerts.push({
      text: `${num(noChannel)} thư bị chặn vì người nhận chưa có email — app service chưa đồng bộ email cho họ.`,
      href: '/users',
    })
  }
  const r = o.recipients
  const unusable = r.total - r.emailActive
  if (r.total > 0 && unusable > 0) {
    const missing = unusable - r.emailUnsubscribed - r.emailInvalid
    alerts.push({
      text: `${num(unusable)}/${num(r.total)} người nhận không có email dùng được (chưa khai ${num(missing)} · tự ngắt ${num(r.emailUnsubscribed)} · địa chỉ hỏng ${num(r.emailInvalid)}).`,
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
      setLoadError(`${result.message} (mã: ${result.code})`)
    }
  }, [appId])

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
        title="Tổng quan"
        subtitle={`Sức khỏe gửi thư của ${app.slug} · 24 giờ gần nhất`}
        actions={
          <Button variant="outline" disabled={pending} onClick={() => startTransition(load)}>
            <RefreshCw className={pending ? 'animate-spin' : undefined} />
            Làm mới
          </Button>
        }
      />
      {loadError ? (
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title="Không đọc được dữ liệu từ API" description={loadError} />
        </Panel>
      ) : view ? (
        <Overview view={view} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 flex-1" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      )}
    </>
  )
}

function Overview({ view }: { view: OverviewView }) {
  const { overview: o, recent, activity } = view
  const distribution = MVP_STATUSES.map((status) => ({ name: status, value: o.byStatus[status] ?? 0 }))
  const windowTotal = distribution.reduce((n, d) => n + d.value, 0)
  const chart = o.hourly.map((h) => ({ ...h, label: fmtHour(h.hour) }))
  const alerts = alertsOf(o, Date.parse(o.generatedAt))
  const blockedReasons = Object.entries(o.blocked).filter(([, n]) => n > 0)

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <StatPill
          label="Lần gửi 24h"
          value={num(o.sends.total)}
          delta={deltaOf(o.sends)}
          trend={o.hourly.map((h) => h.sent + h.failed + h.blocked + h.pending)}
        />
        <StatPill label="Gửi lỗi 24h" value={num(o.byStatus.failed ?? 0)} trend={o.hourly.map((h) => h.failed)} />
        <StatPill label="Đang chờ gửi" value={num(o.queue.waiting)} />
        <StatPill
          label="Người nhận có email dùng được"
          value={`${num(o.recipients.emailActive)}/${num(o.recipients.total)}`}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5" glow>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Lần gửi theo giờ</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">24 giờ gần nhất · theo giờ app gọi · kết cục hiện tại</p>
            </div>
            <div className="flex gap-4 text-[11px]">
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <i className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
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
                    name={s.label}
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
            <Activity className="size-4 text-[var(--pulsar)]" />
            <h2 className="text-sm font-semibold">Trạng thái lần gửi</h2>
          </div>
          {windowTotal === 0 ? (
            <p className="py-16 text-center text-xs text-[var(--text-muted)]">Chưa có lần gửi nào trong 24 giờ qua.</p>
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
                    <span className="font-mono text-[var(--text-secondary)]">{d.name}</span>
                    <b className="font-mono tabular-nums">{num(d.value)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
          {blockedReasons.length > 0 && (
            <div className="mt-4 border-t border-[var(--orbit)] pt-3">
              <p className="mb-2 text-[11px] text-[var(--text-muted)]">Vì sao bị chặn — hệ thống làm đúng, không phải lỗi</p>
              <div className="space-y-1">
                {blockedReasons.map(([reason, n]) => (
                  <div key={reason} className="flex justify-between gap-3 text-[11px]">
                    <span className="text-[var(--text-secondary)]">{EXCLUSION_LABEL[reason] ?? reason}</span>
                    <b className="font-mono tabular-nums">{num(n)}</b>
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
            <h2 className="text-sm font-semibold">Cần chú ý</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 className="size-4 text-[var(--aurora)]" />
              Không có gì bất thường trong 24 giờ qua.
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
                      Xem →
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
            <h2 className="text-sm font-semibold">Hoạt động gần đây của app</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Chưa có hoạt động nào.</p>
          ) : (
            <AuditTrail entries={activity} />
          )}
        </Panel>
      </div>
      <Panel className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--orbit)] p-5">
          <div>
            <h2 className="text-sm font-semibold">Lần gửi gần đây</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">5 lần app service gọi gần nhất</p>
          </div>
          <Button variant="link" size="sm" render={<AppLink href="/notifications" />}>
            Xem tất cả →
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="p-5 text-xs text-[var(--text-muted)]">App chưa gửi thư nào.</p>
        ) : (
          <div className="divide-y divide-[var(--orbit)]">
            {recent.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 px-5 py-3 text-xs">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden shrink-0 font-mono text-[var(--text-muted)] sm:inline">{fmtDateTime(n.createdAt)}</span>
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
