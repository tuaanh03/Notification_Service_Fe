'use client'
import { LockKeyhole, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { App } from '@/lib/mock-data'
import type { IssuedAppSecretDto } from '@/lib/api/types'
import { CredentialDialog } from './credential-dialog'
import type { GrantDraft } from './wizard-types'
import type { RegisterStop } from '@/app/apps/new/actions'

/**
 * Bước 4 — app đã nằm trong hệ thống, đang chờ duyệt.
 *
 * Duyệt là hành động RIÊNG, không phải phần đuôi của việc tạo: đây mới là chỗ quyết định app
 * được gửi kênh nào và trần bao nhiêu. Console hiện chỉ có một `ADMIN_TOKEN` duy nhất nên người
 * tạo cũng chính là người duyệt — phân vai thật sự phải đợi đăng nhập + phân quyền
 * (`implementation_plan.md` mục 12.4).
 */
export function StepWaiting({
  app,
  created,
  grant,
  onGrantChange,
  pending,
  error,
  stop,
  secret,
  onApprove,
  onCloseSecret,
}: {
  app: App
  created: { rulesAdded: number; topicsCreated: number; stoppedAt: RegisterStop | null }
  grant: GrantDraft
  onGrantChange: (next: GrantDraft) => void
  pending: boolean
  error: string | null
  stop: RegisterStop | null
  secret: IssuedAppSecretDto | null
  onApprove: () => void
  onCloseSecret: () => void
}) {
  const active = app.status === 'active'

  return (
    <div className="py-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)] shadow-[var(--glow-starlight-lg)]">
          <LockKeyhole className="size-6" />
        </div>
        <StatusPill status={app.status} />
        <h2 className="mt-4 text-2xl font-semibold">{app.name}</h2>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{app.app_id}</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-[var(--text-secondary)]">
          Đã tạo {created.topicsCreated} chủ đề và {created.rulesAdded} dòng allowlist.
        </p>
      </div>

      {created.stoppedAt && (
        <Alert variant="destructive" className="mt-6">
          <TriangleAlert />
          <AlertTitle>App đã tạo, nhưng dừng ở bước «{created.stoppedAt.step}»</AlertTitle>
          <AlertDescription>
            {created.stoppedAt.message} App đang ở trạng thái{' '}
            <span className="font-mono">{app.status}</span> — đừng bấm tạo lại (sẽ trùng slug), vào{' '}
            <Link href="/admin/apps" className="underline">Danh sách app</Link> làm nốt.
          </AlertDescription>
        </Alert>
      )}

      {!active && !created.stoppedAt && (
        <div className="mx-auto mt-8 max-w-lg space-y-4 rounded-xl border border-[var(--orbit)] p-5">
          <div>
            <h3 className="text-sm font-semibold">Duyệt và cấp khoá</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Duyệt là lúc app nhận quyền. MVP chỉ gửi được email nên kênh cố định là{' '}
              <span className="font-mono">email</span>.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wz-rate" className="text-xs">rate_limit_per_minute</Label>
              <Input
                id="wz-rate"
                type="number"
                min={1}
                value={grant.rateLimitPerMinute}
                onChange={(e) => onGrantChange({ ...grant, rateLimitPerMinute: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wz-recipients" className="text-xs">max_recipients_per_event</Label>
              <Input
                id="wz-recipients"
                type="number"
                min={1}
                value={grant.maxRecipientsPerEvent}
                onChange={(e) => onGrantChange({ ...grant, maxRecipientsPerEvent: Number(e.target.value) })}
                className="font-mono"
              />
            </div>
          </div>
          <Alert className="bg-[var(--solar)]/10">
            <TriangleAlert className="text-[var(--solar)]" />
            <AlertDescription>
              Hai con số này hiện được <strong>lưu nhưng chưa ai đối chiếu</strong> — app vượt hạn
              mức không bị từ chối. Quota theo app nằm ở kế hoạch mục 12.5.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" disabled={pending} onClick={onApprove}>
            {pending ? 'Đang duyệt…' : 'Duyệt và cấp khoá đầu tiên'}
          </Button>
        </div>
      )}

      {active && (
        <div className="mx-auto mt-8 max-w-lg text-center">
          {stop ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Đã duyệt, nhưng chưa cấp được khoá</AlertTitle>
              <AlertDescription>
                {stop.message} App đã <span className="font-mono">active</span> — vào{' '}
                <Link href="/settings/credentials" className="underline">Khoá API</Link> cấp lại.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              App đã hoạt động. Chủ đề vừa tạo còn ở <span className="font-mono">draft</span> — sang{' '}
              <Link href="/topics" className="underline">Chủ đề</Link> kích hoạt trước khi app gửi được thư.
            </p>
          )}
        </div>
      )}

      {secret && <CredentialDialog app={app} apiKey={secret.apiKey} open onClose={onCloseSecret} />}
    </div>
  )
}
