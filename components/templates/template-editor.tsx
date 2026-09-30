'use client'
import { useEffect, useState } from 'react'
import { Archive, Copy, FileWarning, Pencil, Save, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { useApp } from '@/components/app-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Textarea } from '@/components/ui/textarea'
import { useTemplateEditor, type EditorError } from '@/hooks/use-template-editor'
import { TEMPLATE_ISSUE_MESSAGES } from '@/lib/api/problem'
import { AiComposeDialog } from './ai-compose-dialog'
import { ContractPanel } from './contract-panel'
import { EditorPane, Highlight } from './editor-pane'
import { PreviewPane } from './preview-pane'
import { SchemaPane } from './schema-pane'
import { VersionsPanel } from './versions-panel'

/**
 * Màn soạn một template (ADR-0020). Thứ tự khối theo việc người soạn làm: tên + mã cho đội app →
 * bảng biến → tiêu đề → nội dung + xem thử → lịch sử phiên bản → hợp đồng gửi.
 *
 * Không có "Gửi thử": backend chưa có đường gửi thử. Xuất bản = lưu nháp rồi xuất bản (một action).
 */
export function TemplateEditor({ templateId }: { templateId: string }) {
  const { app } = useApp()
  const ed = useTemplateEditor(app.app_id, templateId)
  const [name, setName] = useState('')
  const [publishWarn, setPublishWarn] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  /** Mỗi lần mở hộp thoại AI là dựng lại từ đầu — không mang mô tả / đề xuất của lần trước. */
  const [aiRound, setAiRound] = useState(0)

  const savedName = ed.detail?.name ?? ''
  useEffect(() => setName(savedName), [savedName])

  if (ed.loadError) {
    return (
      <>
        <PageHeader title="Template" breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: templateId }]} />
        <EmptyState
          icon={FileWarning}
          title={ed.loadError.code === 'NOT_FOUND' ? 'Không có template này trong app' : 'Không tải được template'}
          description={`${ed.loadError.message} (mã: ${ed.loadError.code})`}
          action={<Button variant="outline" onClick={() => void ed.reload()}>Thử lại</Button>}
        />
      </>
    )
  }
  if (!ed.detail) {
    return <PageHeader title="Đang tải…" breadcrumb={[{ label: 'Templates', href: '/templates' }]} />
  }

  const detail = ed.detail
  const shown = ed.shown
  const nextVersion = Math.max(0, ...detail.versions.map((v) => v.version)) + 1

  const doPublish = async () => {
    setPublishWarn(false)
    const version = ed.draft?.version
    if (await ed.publish()) {
      toast.success(`Đã xuất bản v${version}`, { description: 'Từ lần gửi kế tiếp, app dùng bản này.' })
    }
  }
  const onPublish = () => (ed.newRequired.length > 0 ? setPublishWarn(true) : void doPublish())
  const onSave = async () => {
    if (await ed.saveDraft()) toast.success(`Đã lưu nháp v${ed.draft?.version ?? nextVersion}`)
  }

  return (
    <>
      <PageHeader
        title={detail.name}
        breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: detail.name }]}
        subtitle={shown ? `v${shown.version} · ${ed.locked ? 'chỉ đọc' : 'bản nháp đang soạn'}${ed.dirty ? ' · chưa lưu' : ''}` : undefined}
        actions={
          <>
            <StatusPill status={ed.archived ? 'archived' : (shown?.status ?? 'draft')} />
            {!ed.archived && ed.draft && (
              <>
                <Button variant="outline" disabled={ed.pending} onClick={() => void onSave()}>
                  <Save /> Lưu nháp
                </Button>
                <Button disabled={ed.pending} onClick={onPublish} data-testid="publish-btn">
                  <UploadCloud /> Xuất bản v{ed.draft.version}
                </Button>
              </>
            )}
            {!ed.archived && !ed.draft && ed.published && (
              <Button disabled={ed.pending} onClick={() => void ed.draftFrom(ed.published!.version)}>
                <Pencil /> Sửa (tạo nháp v{nextVersion})
              </Button>
            )}
            {!ed.archived && (
              <Button variant="outline" disabled={ed.pending} onClick={() => setArchiveConfirm(true)}>
                <Archive /> Lưu trữ
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-5">
        {ed.error && <ErrorAlert error={ed.error} />}
        {ed.aiBanner && (
          <Alert className="bg-[var(--pulsar)]/10" data-testid="ai-banner">
            <Sparkles className="text-[var(--pulsar)]" />
            <AlertDescription>Nội dung do AI soạn, CHƯA lưu. Đọc lại, xem thử rồi tự Lưu nháp / Xuất bản — AI không bao giờ tự làm hai việc đó.</AlertDescription>
          </Alert>
        )}
        {ed.archived && (
          <Alert data-testid="archived-notice">
            <Archive />
            <AlertDescription>Template đã lưu trữ: không sửa, không xuất bản, app gửi bằng mã này sẽ bị <span className="font-mono">TEMPLATE_ARCHIVED</span>.</AlertDescription>
          </Alert>
        )}
        {!ed.archived && ed.locked && ed.published && (
          <Alert data-testid="locked-notice">
            <AlertDescription className="text-[var(--text-secondary)]">
              v{ed.published.version} đang được dùng để gửi — không sửa tại chỗ. Bấm <em>Sửa</em> để tạo bản nháp mới.
            </AlertDescription>
          </Alert>
        )}

        <Panel className="min-w-0 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="text-xs font-semibold">Tên template</Label>
              <div className="flex gap-2">
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} disabled={ed.archived} className="text-sm" />
                <Button
                  variant="outline"
                  disabled={ed.archived || ed.pending || !name.trim() || name.trim() === savedName}
                  onClick={() => void ed.rename(name.trim()).then((ok) => ok && toast.success('Đã đổi tên'))}
                >
                  Đổi tên
                </Button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Chỉ để người đọc nhận ra. Đổi tên không ảnh hưởng việc gửi.</p>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-semibold">Mã template (templateId)</Label>
              <Button
                variant="outline"
                className="w-full justify-between font-mono text-xs"
                onClick={() => {
                  navigator.clipboard?.writeText(detail.id)
                  toast.success('Đã sao chép', { description: detail.id })
                }}
              >
                <span className="truncate">{detail.id}</span>
                <Copy />
              </Button>
              <p className="text-[11px] text-[var(--text-muted)]">Đưa mã này cho đội app. Máy thử và máy thật có mã khác nhau.</p>
            </div>
          </div>
        </Panel>

        <Panel className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Biến</h2>
          <div className="mt-3">
            <SchemaPane ed={ed} locked={ed.locked} />
          </div>
        </Panel>

        <Panel className="min-w-0 space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="tpl-subject" className="text-xs font-semibold">Tiêu đề</Label>
            <Input
              id="tpl-subject"
              value={ed.subject}
              onChange={(e) => ed.setSubject(e.target.value)}
              className="font-mono text-sm"
              disabled={ed.locked}
              placeholder="[Cảnh báo] {{ payload.vm_name }} vượt ngưỡng"
            />
            <p className="font-mono text-xs" data-testid="subject-highlight">
              <Highlight text={ed.subject || '(trống)'} declared={ed.declared} />
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-text" className="text-xs font-semibold">Bản chữ thường (tuỳ chọn)</Label>
            <Textarea
              id="tpl-text"
              value={ed.text}
              onChange={(e) => ed.setText(e.target.value)}
              className="min-h-20 font-mono text-xs"
              disabled={ed.locked}
              placeholder="Cho hộp thư không hiển thị HTML. Để trống thì chỉ gửi HTML."
            />
          </div>
        </Panel>

        <ResizablePanelGroup
          orientation="horizontal"
          style={{ height: '650px', maxHeight: '650px' }}
          className="cosmic-surface overflow-hidden rounded-2xl border border-[var(--orbit)] shadow-xs"
        >
          <ResizablePanel defaultSize={50} minSize={30} className="h-full min-w-0 overflow-hidden">
            <div className="flex h-full min-w-0 flex-col overflow-hidden p-5">
              <EditorPane
                ed={ed}
                locked={ed.locked}
                onAi={() => {
                  setAiRound((n) => n + 1)
                  setAiOpen(true)
                }}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30} className="h-full min-w-0 overflow-hidden bg-white">
            <PreviewPane ed={ed} />
          </ResizablePanel>
        </ResizablePanelGroup>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="min-w-0 p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Phiên bản</h2>
            <VersionsPanel ed={ed} />
          </Panel>
          <Panel className="min-w-0 p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Gửi bằng template này</h2>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              {ed.published
                ? `Theo bản đang xuất bản v${ed.published.version}.`
                : 'Chưa xuất bản — app gọi lúc này sẽ nhận TEMPLATE_NOT_PUBLISHED. Mẫu dưới theo bản nháp.'}
            </p>
            <ContractPanel templateId={detail.id} variables={ed.published?.variables ?? ed.variables} />
          </Panel>
        </div>
      </div>

      <AiComposeDialog key={aiRound} open={aiOpen} ed={ed} onClose={() => setAiOpen(false)} />
      {/* Biến bắt buộc mới: từ lúc xuất bản, app chưa gửi biến đó thì mọi lần gửi bị từ chối. */}
      <ConfirmDialog
        open={publishWarn}
        tone="blocking"
        title="Có biến bắt buộc mới"
        description={`App đang gửi theo v${ed.published?.version} chưa gửi các biến này — từ lúc xuất bản, mọi lần gửi thiếu chúng bị từ chối với MISSING_VARIABLE. Thống nhất với đội app trước.`}
        facts={[
          ['biến mới', ed.newRequired.join(', ')],
          ['bản sẽ xuất bản', `v${ed.draft?.version ?? ''}`],
          ['lỗi app sẽ gặp', '422 MISSING_VARIABLE'],
        ]}
        confirmLabel="Vẫn xuất bản"
        onConfirm={() => void doPublish()}
        onCancel={() => setPublishWarn(false)}
      />
      <ConfirmDialog
        open={archiveConfirm}
        tone="blocking"
        title={`Lưu trữ "${detail.name}"?`}
        description="Không có đường bỏ lưu trữ. Từ lúc này app gửi bằng mã template này sẽ bị từ chối. Các phiên bản vẫn giữ để tra lịch sử gửi."
        facts={[
          ['templateId', detail.id],
          ['bản đang xuất bản', ed.published ? `v${ed.published.version}` : '—'],
          ['lỗi app sẽ gặp', '422 TEMPLATE_ARCHIVED'],
        ]}
        confirmLabel="Lưu trữ vĩnh viễn"
        onConfirm={() => {
          setArchiveConfirm(false)
          void ed.archive().then((ok) => ok && toast.success('Đã lưu trữ template'))
        }}
        onCancel={() => setArchiveConfirm(false)}
      />
    </>
  )
}

/** Lỗi của lệnh ghi. Xuất bản bị 422 thì liệt kê TỪNG vi phạm, kèm biến / ô bị sai. */
function ErrorAlert({ error }: { error: EditorError }) {
  return (
    <Alert variant="destructive" className="bg-[var(--supernova)]/10" data-testid="editor-error">
      <FileWarning />
      <AlertTitle>{error.issues.length ? `Chưa xuất bản được — ${error.issues.length} lỗi` : error.message}</AlertTitle>
      <AlertDescription>
        {error.issues.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-xs">
            {error.issues.map((issue, i) => (
              <li key={i}>
                {issue.path && <span className="font-mono">{issue.path}: </span>}
                {TEMPLATE_ISSUE_MESSAGES[issue.code] ?? issue.message ?? issue.code}{' '}
                <span className="font-mono text-[var(--text-muted)]">({issue.code})</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="font-mono text-xs">mã: {error.code}</span>
        )}
      </AlertDescription>
    </Alert>
  )
}
