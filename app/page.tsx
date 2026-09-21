'use client'
import { Activity, AlertTriangle, BellRing, CheckCircle2, CircleDashed, Send } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { AppLink } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/panel'
import { StatPill } from '@/components/stat-pill'
import { StatusPill } from '@/components/status-pill'
import { AuditTrail } from '@/components/audit-trail'
import { alerts, auditEntries, chartData, notifications, statTrends } from '@/lib/mock-data'
import { useApp } from '@/components/app-context'
import { cosmicTokens, notificationStatuses, statusColors } from '@/lib/theme'
/* donut colours come from statusColors so they always match <StatusPill> */ const colors =
  notificationStatuses.map((s) => statusColors[s])
const distribution = notificationStatuses.map((name, i) => ({
  name,
  value: i === 5 ? 42 : i === 3 ? 18 : i === 10 ? 3 : Math.max(1, 10 - i),
}))
export default function Page() {
  const { app } = useApp()
  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle={`Theo dõi sức khỏe gửi thông báo của ${app.slug}`}
        actions={
          <Button render={<AppLink href="/compose" />}>
            <Send />
            Soạn thông báo
          </Button>
        }
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <StatPill label="Lần gửi 24h" value="1,284" delta="12.4%" trend={statTrends.sends24h} />
        <StatPill label="Người nhận thật" value="8,492" delta="8.2%" trend={statTrends.recipients} />
        <StatPill label="Tỉ lệ bounce" value="0.8%" delta="-0.3%" trend={statTrends.bounceRate} />
        <StatPill label="Topic đang rỗng" value="1" trend={statTrends.emptyTopics} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5" glow>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Lần gửi theo giờ</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">24 giờ gần nhất · theo origin</p>
            </div>
            <div className="flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[var(--starlight)]" />
                api
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[var(--pulsar)]" />
                dashboard
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cosmicTokens.starlight} stopOpacity={0.28} />
                    <stop offset="1" stopColor={cosmicTokens.starlight} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="violet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={cosmicTokens.pulsar} stopOpacity={0.24} />
                    <stop offset="1" stopColor={cosmicTokens.pulsar} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: cosmicTokens.mutedText, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
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
                <Area
                  type="monotone"
                  dataKey="api"
                  stroke={cosmicTokens.starlight}
                  fill="url(#cyan)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="dashboard"
                  stroke={cosmicTokens.pulsar}
                  fill="url(#violet)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="size-4 text-[var(--pulsar)]" />
            <h2 className="text-sm font-semibold">Trạng thái lần gửi</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-52 w-1/2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={distribution} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={2}>
                    {distribution.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {distribution.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-[11px]">
                  <i className="size-1.5 rounded-full" style={{ backgroundColor: colors[i] }} />
                  <span className="font-mono text-[var(--text-secondary)]">{d.name}</span>
                  <b className="font-mono tabular-nums">{d.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--solar)]" />
            <h2 className="text-sm font-semibold">Cần chú ý</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={a}
                className="flex items-start gap-3 rounded-lg border border-[var(--orbit)] bg-[var(--orbit)]/40 p-3 text-xs"
              >
                <span className="mt-0.5 font-mono text-[var(--solar)]">0{i + 1}</span>
                <span className="text-[var(--text-secondary)]">{a}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="size-4 text-[var(--starlight)]" />
              <h2 className="text-sm font-semibold">Hoạt động gần đây</h2>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">LIVE</span>
          </div>
          <AuditTrail entries={auditEntries} />
        </Panel>
      </div>
      <Panel className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--orbit)] p-5">
          <div>
            <h2 className="text-sm font-semibold">Lần gửi gần đây</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Các sự kiện mới nhất trong app</p>
          </div>
          <Button variant="link" size="sm" render={<AppLink href="/notifications" />}>
            Xem tất cả →
          </Button>
        </div>
        <div className="divide-y divide-[var(--orbit)]">
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-4 px-5 py-3 text-xs">
              <div className="flex min-w-0 items-center gap-3">
                <CircleDashed className="size-4 shrink-0 text-[var(--text-muted)]" />
                <span className="truncate font-mono text-[var(--text-secondary)]">{n.topic_key}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden font-mono text-[var(--text-muted)] sm:inline">{n.origin}</span>
                <StatusPill status={n.status} />
                <span className="w-14 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                  {n.recipients}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
