'use client'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { CodeBlock } from '@/components/code-block'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/app-context'

const testSendResponse = `202 Accepted
{ "notification_id": "ntf_01HZ...", "recipients": 0, "status": "no_recipient" }`

/** UC-001 §A (App Owner view) + §G Gửi thử. */
export function SettingsProfile() {
  const { app } = useApp()
  return (
    <>
      <PageHeader
        title="Hồ sơ app"
        subtitle={`Thông tin đăng ký của ${app.slug}`}
        actions={
          <Button variant="outline" render={<Link href="/apps/new" />}>
            Đăng ký app khác
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-5" glow>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{app.name}</h2>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                {app.slug} · {app.app_id}
              </p>
            </div>
            <StatusPill status={app.status} />
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">topic_namespace</dt>
              <dd className="mt-1 font-mono text-[var(--starlight)]">{app.namespace}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Người liên hệ kỹ thuật</dt>
              <dd className="mt-1">{app.technical_contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Kênh được cấp</dt>
              <dd className="mt-1 font-mono text-xs">{app.granted_channels.join(' · ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Quota</dt>
              <dd className="mt-1 font-mono tabular-nums">{app.quota} lần/phút</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-sm font-semibold">Gửi thử</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Mô phỏng API call đầu tiên trên topic mới.</p>
          <div className="mt-4">
            <CodeBlock language="http" value={testSendResponse} />
          </div>
          {/* UC-001 BR-6: 0 người nhận ở đường API là bình thường — màu trung tính, không đỏ */}
          <Alert className="mt-4 border-[var(--orbit)] bg-transparent">
            <AlertDescription className="text-[var(--text-secondary)]">
              0 người nhận là đúng như mong đợi: topic vừa tạo chưa có subscriber. Đây không phải lỗi.
            </AlertDescription>
          </Alert>
          <Button variant="link" className="mt-3 px-0" render={<Link href="/topics" />}>
            Quản lý subscriber <ExternalLink data-icon="inline-end" />
          </Button>
        </Panel>
      </div>
    </>
  )
}
