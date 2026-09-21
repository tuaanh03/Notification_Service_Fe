'use client'
import { useState } from 'react'
import { Eye, FlaskConical, Save, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { TestSendDialog, type TestSendMode } from '@/components/compose/test-send-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/components/app-context'
import { useTemplateEditor } from '@/hooks/use-template-editor'
import { EditorPane, Highlight } from './editor-pane'
import { PreviewPane } from './preview-pane'
import { SchemaPane } from './schema-pane'
import { useAppRouter } from '@/components/app-link'
import { cn } from '@/lib/utils'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** UC-006 §B — editor 3 pane + toolbar; §C version; §E hợp đồng biến; §G lưu trữ; §H exception. */
export function TemplateEditor({
  templateKey,
  aiPrompt,
  isNew = false,
}: {
  templateKey: string
  aiPrompt?: string
  isNew?: boolean
}) {
  const router = useAppRouter()
  const { app } = useApp()
  const isCreation = isNew || templateKey === 'new'
  const [nameInput, setNameInput] = useState(isCreation ? '' : (templateKey === 'new' ? '' : templateKey))
  const [keyInput, setKeyInput] = useState(templateKey === 'new' ? '' : templateKey)
  const [keyTouched, setKeyTouched] = useState(false)
  const keyOk = /^[a-z][a-z0-9_]{2,}$/.test(keyInput)

  const ai = aiPrompt !== undefined ? { prompt: aiPrompt, subject: '[{{alert_title}}] {{vm_name}} cần xử lý', html: `<h2>{{alert_title}}</h2>\n<p>${aiPrompt || 'Máy ảo {{vm_name}} vượt ngưỡng {{threshold}}%.'}</p>\n<p>Mức hiện tại: {{current_usage}}% · Chủ sở hữu: {{owner}}</p>\n<p><a href="{{action_url}}">Xử lý</a></p>` } : null
  const ed = useTemplateEditor(templateKey, app.namespace, ai)
  const [test, setTest] = useState<TestSendMode>(null)
  const [publishWarn, setPublishWarn] = useState(false)
  const locked = ed.status !== 'draft' || ed.archived

  const declared = ed.schema.map((v) => v.name)

  const validateForm = () => {
    if (isCreation) {
      if (!nameInput.trim()) {
        toast.error('Vui lòng nhập Tên template', {
          description: 'Tên template giúp nhận biết mục đích của mẫu email.',
        })
        document.getElementById('tpl-name')?.focus()
        return false
      }
      if (!keyOk) {
        toast.error('Mã template (key) chưa hợp lệ', {
          description: 'Key phải khớp ^[a-z][a-z0-9_]{2,}$ (bắt đầu bằng chữ thường, chỉ gồm chữ, số và gạch dưới, từ 3 ký tự).',
        })
        document.getElementById('tpl-key')?.focus()
        return false
      }
      ed.base.name = nameInput.trim()
      ed.base.key = keyInput
    }
    return true
  }

  const doPublish = () => {
    if (!validateForm()) return
    ed.publish()
    setPublishWarn(false)
    toast.success(`Đã xuất bản ${ed.version}`, { description: `${ed.base.key} ${ed.version} phục vụ mọi lần gửi từ giờ.` })
    if (isCreation && keyInput !== templateKey) {
      router.replace(`/templates/${keyInput}`)
    }
  }

  const onPublish = () => {
    if (!validateForm()) return
    if (!ed.canPublish) return
    // §C: thêm biến bắt buộc mới → app chưa gửi biến này → mọi event 422 → dialog chặn
    if (ed.newRequired.length > 0) setPublishWarn(true)
    else doPublish()
  }

  const onSaveDraft = () => {
    if (!validateForm()) return
    if (ed.saveDraft()) {
      toast.success('Đã lưu nháp', { description: `${ed.base.key} ${ed.version}` })
      if (isCreation && keyInput !== templateKey) {
        router.replace(`/templates/${keyInput}`)
      }
    }
  }

  return (
    <>
      <PageHeader
        title={isCreation ? 'Tạo template mới' : ed.base.key}
        subtitle={`${ed.base.namespace ?? app.namespace} · ${isCreation ? (nameInput || 'Bản nháp mới') : (ed.base.name ?? 'template')} · ${ed.version}`}
        actions={
          <>
            <StatusPill status={ed.archived ? 'archived' : ed.status} />
            <Button variant="outline" onClick={() => document.querySelector('[data-testid=preview-pane]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              <Eye /> Xem thử
            </Button>
            <Button variant="outline" onClick={() => setTest('me')}>
              <FlaskConical /> Gửi thử cho tôi
            </Button>
            <Button variant="outline" disabled={locked || !ed.canSave} onClick={onSaveDraft}>
              <Save /> Lưu nháp
            </Button>
            <Button disabled={!ed.canPublish || ed.archived} onClick={onPublish} data-testid="publish-btn">
              <UploadCloud /> Xuất bản {ed.version}
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        {ed.aiBanner && (
          <Alert className="border-[var(--pulsar)]/40 bg-[var(--pulsar)]/10" data-testid="ai-banner">
            <Sparkles />
            <AlertDescription className="text-[var(--pulsar)]">
              Bản nháp do AI sinh. Người thật phải xem thử và bấm Xuất bản. AI không bao giờ tự xuất bản.
            </AlertDescription>
          </Alert>
        )}
        {ed.links.length > 0 && (
          <Alert variant="destructive" className="border-[var(--supernova)]/40 bg-[var(--supernova)]/10" data-testid="scheme-error">
            <AlertDescription className="text-[var(--supernova)]">
              Chỉ chấp nhận scheme <span className="font-mono">https</span> và <span className="font-mono">mailto</span>. Bị chặn lúc xuất bản: <span className="font-mono">{ed.links.join(', ')}</span>
            </AlertDescription>
          </Alert>
        )}
        {locked && !ed.archived && (
          <Alert className="border-[var(--orbit)] bg-transparent" data-testid="locked-notice">
            <AlertDescription className="text-[var(--text-secondary)]">
              {ed.version} đã xuất bản — không sửa tại chỗ. Bấm <em>Sửa</em> ở Phiên bản để tạo draft mới.
            </AlertDescription>
          </Alert>
        )}

        {/* Khối Thông tin định danh Template (Metadata Grid) theo chuẩn thiết kế form */}
        {isCreation && (
          <Panel className="min-w-0 p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">1. Thông tin chung</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Cột 1: Tên template */}
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name" className="text-xs font-semibold text-[var(--text-primary)]">
                  Tên template <span className="text-[var(--supernova)]">*</span>
                </Label>
                <Input
                  id="tpl-name"
                  value={nameInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setNameInput(val)
                    if (!keyTouched) setKeyInput(slugify(val))
                  }}
                  placeholder="vd: Cảnh báo quá tải RAM, Chào mừng khách hàng..."
                  className="text-sm"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Tên hiển thị nội bộ để nhận biết mục đích mẫu email.
                </p>
              </div>

              {/* Cột 2: Mã định danh API (key) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tpl-key" className="text-xs font-semibold text-[var(--text-primary)]">
                    Mã template (key) <span className="text-[var(--supernova)]">*</span>
                  </Label>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    ^[a-z][a-z0-9_]&#123;2,&#125;$
                  </span>
                </div>
                <Input
                  id="tpl-key"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyTouched(true)
                    setKeyInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                  }}
                  className={cn(
                    "font-mono text-sm",
                    keyInput && !keyOk && "border-[var(--supernova)]/60 focus-visible:ring-[var(--supernova)]"
                  )}
                  placeholder="vd: vm_ram_alert, user_welcome"
                />
                {keyInput && !keyOk ? (
                  <p className="font-mono text-[11px] text-[var(--supernova)]">
                    Bắt đầu bằng chữ thường, chỉ gồm chữ thường, số và gạch dưới (từ 3 ký tự).
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Mã định danh trong API: <span className="font-mono text-[11px]">POST /v1/templates/:key</span>
                  </p>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* Khối: Variable Schema rộng toàn hàng */}
        <Panel className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {isCreation ? '2. Variable Schema' : 'Variable Schema'}
          </h2>
          <div className="mt-3"><SchemaPane ed={ed} locked={locked} /></div>
        </Panel>

        {/* Khối: Subject (Tiêu đề email) trải dài toàn hàng */}
        <Panel className="min-w-0 p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-subject" className="text-xs font-semibold text-[var(--text-primary)]">
                {isCreation ? '3. Subject (Tiêu đề email)' : 'Subject'}
              </Label>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Tiêu đề email · hỗ trợ biến &#123;&#123;name&#125;&#125;
              </span>
            </div>
            <Input
              id="tpl-subject"
              value={ed.subject}
              onChange={(e) => ed.setSubject(e.target.value)}
              className="font-mono text-sm"
              disabled={locked}
              placeholder="Nhập subject của email..."
            />
            <p className="font-mono text-xs" data-testid="subject-highlight">
              <Highlight text={ed.subject || '(trống)'} declared={declared} />
            </p>
          </div>
        </Panel>

        {/* Khối 3: Resizable Split Pane — Tin nhắn và Xem thử song song 1:1, cố định chiều cao */}
        <ResizablePanelGroup
          orientation="horizontal"
          style={{ height: '650px', maxHeight: '650px' }}
          className="cosmic-surface rounded-2xl border border-[var(--orbit)] shadow-xs overflow-hidden"
        >
          <ResizablePanel defaultSize={50} minSize={30} className="min-w-0 h-full overflow-hidden" style={{ overflow: 'hidden' }}>
            <div className="flex h-full flex-col min-w-0 p-5 overflow-hidden">
              <EditorPane ed={ed} locked={locked} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30} className="min-w-0 h-full overflow-hidden bg-white" style={{ overflow: 'hidden' }}>
            <div className="flex h-full flex-col min-w-0 overflow-hidden bg-white">
              <PreviewPane ed={ed} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <TestSendDialog mode={test} subject={ed.previewSubject} onClose={() => setTest(null)} />
      {/* §C: xuất bản thêm biến bắt buộc → 3 lựa chọn, không có đường tắt */}
      <ConfirmDialog
        open={publishWarn}
        tone="blocking"
        title="Biến bắt buộc mới — app chưa gửi"
        description={`Biến ${ed.newRequired.join(', ')} là bắt buộc nhưng app chưa gửi biến này — mọi event sẽ 422.`}
        facts={[['biến mới', ed.newRequired.join(', ')], ['version', ed.version], ['hệ quả', '422 missing_variable']]}
        confirmLabel="Vẫn xuất bản"
        onConfirm={doPublish}
        onCancel={() => setPublishWarn(false)}
      >
        <Button
          variant="outline"
          onClick={() => {
            ed.newRequired.forEach((n) => ed.updateVar(n, { required: false, defaultValue: '—' }))
            setPublishWarn(false)
            toast.success('Đã đặt required = false kèm mặc định', { description: 'Xuất bản lại khi sẵn sàng.' })
          }}
        >
          Đặt required = false kèm mặc định
        </Button>
      </ConfirmDialog>
    </>
  )
}
