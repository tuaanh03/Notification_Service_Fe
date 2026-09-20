'use client'
import { useState } from 'react'
import { CredentialDialog } from '@/components/apps/credential-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { approvalApp, DEMO_API_KEY, requestedGrant, type ApprovalGrant } from '@/lib/mock-data'
import { AdjustForm, GrantDiff } from './adjust-form'

type Decision = '' | 'approved' | 'adjusted' | 'rejected'

/** UC-001 §C — Super Admin rà soát hồ sơ; Duyệt → mở modal credential show-once (§D). */
export function ApprovalReview({ id }: { id: string }) {
  const [decision, setDecision] = useState<Decision>('')
  const [issued, setIssued] = useState(false)
  const requested = requestedGrant(approvalApp)
  // "Duyệt có điều chỉnh": grant sau khi Super Admin sửa — null = form chưa lưu
  const [adjusted, setAdjusted] = useState<{ grant: ApprovalGrant; reason: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejected, setRejected] = useState(false)
  const [credentialClosed, setCredentialClosed] = useState(false)
  return (
    <>
      <PageHeader
        title="Duyệt hồ sơ app"
        subtitle="Rà soát yêu cầu đăng ký trước khi cấp quyền"
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{approvalApp.name}</h2>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                {approvalApp.slug} · {approvalApp.app_id}
              </p>
            </div>
            <StatusPill status={issued ? 'active' : rejected ? 'draft' : 'pending_approval'} />
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--text-muted)]">topic_namespace</dt>
              <dd className="mt-1 font-mono text-[var(--starlight)]">{approvalApp.namespace}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Người liên hệ kỹ thuật</dt>
              <dd className="mt-1">{approvalApp.technical_contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Kênh xin cấp</dt>
              <dd className="mt-1 font-mono text-xs">{approvalApp.granted_channels.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Quota đề xuất</dt>
              <dd className="mt-1 font-mono tabular-nums">{approvalApp.quota}/min</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-[var(--orbit)] pt-5">
            <h3 className="text-sm font-semibold">Topics</h3>
            {approvalApp.submitted_topics.map((t) => (
              <div key={t} className="mt-3 rounded-lg border border-[var(--orbit)] p-3">
                <p className="font-mono text-xs text-[var(--starlight)]">{t}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Topic này hiện 0 subscriber.</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="h-fit p-5 lg:sticky lg:top-5">
          <h2 className="text-sm font-semibold">Quyết định</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Duyệt sẽ cấp app_id và app_secret một lần.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              disabled={issued || rejected}
              onClick={() => {
                setDecision('approved')
                setIssued(true)
              }}
            >
              Duyệt
            </Button>
            <Button variant="secondary" onClick={() => setDecision('adjusted')} disabled={issued || rejected}>
              Duyệt có điều chỉnh
            </Button>
            <Button variant="destructive" onClick={() => setDecision('rejected')} disabled={issued || rejected}>
              Từ chối
            </Button>
          </div>
          {decision === 'adjusted' && !adjusted && (
            <AdjustForm requested={requested} onSubmit={(grant, reason) => setAdjusted({ grant, reason })} />
          )}
          {decision === 'adjusted' && adjusted && (
            <>
              <GrantDiff
                requested={requested}
                granted={adjusted.grant}
                reason={adjusted.reason}
                topicKeys={approvalApp.submitted_topics}
              />
              {!issued && (
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAdjusted(null)}>
                    Sửa lại
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setIssued(true)}>
                    Duyệt với grant này
                  </Button>
                </div>
              )}
            </>
          )}
          {decision === 'rejected' && !rejected && (
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (rejectNote.trim()) setRejected(true)
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="rej-reason" className="text-xs">
                  Lý do từ chối
                </Label>
                <NativeSelect id="rej-reason" className="w-full">
                  <NativeSelectOption>Thiếu ip_allowlist</NativeSelectOption>
                  <NativeSelectOption>Namespace trùng app khác</NativeSelectOption>
                  <NativeSelectOption>Kênh xin cấp không phù hợp</NativeSelectOption>
                  <NativeSelectOption>Khác</NativeSelectOption>
                </NativeSelect>
              </div>
              <Textarea
                placeholder="Ghi chú cho App Owner"
                required
                className="min-h-24"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)]">Hồ sơ trở về draft, dữ liệu giữ nguyên.</p>
              <Button type="submit" variant="destructive" className="w-full" disabled={!rejectNote.trim()}>
                Từ chối hồ sơ
              </Button>
            </form>
          )}
          {rejected && (
            <Alert className="mt-4 border-[var(--orbit)] bg-transparent">
              <AlertDescription className="text-[var(--text-secondary)]">
                Đã từ chối. Hồ sơ trở về <span className="font-mono">draft</span>, App Owner nhận ghi chú và có thể gửi lại.
              </AlertDescription>
            </Alert>
          )}
          {issued && credentialClosed && (
            <Alert className="mt-4 border-[var(--aurora)]/30 bg-[var(--aurora)]/[.06]">
              <AlertDescription className="text-[var(--aurora)]">
                Hồ sơ đã được duyệt. Credential đã cấp một lần — không hiện lại.
              </AlertDescription>
            </Alert>
          )}
        </Panel>
      </div>
      <CredentialDialog app={approvalApp} apiKey={DEMO_API_KEY} open={issued && !credentialClosed} onClose={() => setCredentialClosed(true)} />
    </>
  )
}
