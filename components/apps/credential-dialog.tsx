'use client'
import { Copy, Eye, EyeOff, Rocket } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CodeBlock } from '@/components/code-block'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { configSnippetFor, sendSnippetFor, type App } from '@/lib/mock-data'

/**
 * UC-001 BR-4 — credential chỉ hiển thị một lần. Dùng chung cho /settings/credentials (khoá thật
 * từ `POST /admin/apps/:appId/secrets`), /admin/approvals/[id] và wizard step 4 (hai màn này còn
 * mock — truyền `DEMO_API_KEY`). Đóng chỉ khi đã tick "đã lưu"; chưa copy mà đóng → confirm lần hai.
 *
 * `apiKey` chỉ sống trong state của component này: backend không lưu plaintext, đóng modal là mất.
 */
export function CredentialDialog({
  app,
  apiKey,
  open,
  onClose,
}: {
  app: App
  /** Khoá plaintext, chỉ có đúng một lần trong response lúc cấp. */
  apiKey: string
  open: boolean
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const copy = (value: string) => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    toast.success('Đã sao chép')
  }
  const requestClose = () => (copied ? onClose() : setConfirmClose(true))
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && saved && requestClose()}>
        <DialogContent
          showCloseButton={false}
          // grid-cols-[minmax(0,1fr)]: <DialogContent> là grid, cột `auto` phình theo max-content
          // của <pre> trong <CodeBlock> (khoá API 80 ký tự không xuống dòng). Cột phình > hộp
          // -> dialog tự cuộn ngang khi focus nút "Sao chép", nội dung trôi sang trái và bị cắt.
          className="orbit-ring z-[100] grid-cols-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto rounded-2xl p-6 shadow-[var(--glow-panel)] ring-0 sm:max-w-2xl"
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)] shadow-[var(--glow-starlight-lg)]">
              <Rocket className="size-6" />
            </div>
            <DialogTitle className="font-heading text-2xl">Chỉ hiển thị một lần</DialogTitle>
            <DialogDescription>Lưu app_secret vào secret store trước khi đóng.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--orbit)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                <span className="font-mono">app_id</span> · Công khai — được phép nhúng vào config app
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-xs text-[var(--starlight)]">{app.app_id}</code>
                <Button variant="ghost" size="icon-sm" aria-label="Sao chép app_id" onClick={() => copy(app.app_id)}>
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--supernova)]/30 p-4">
              <p className="text-xs text-[var(--text-muted)]">
                <span className="font-mono">app_secret</span> · Bí mật — hệ thống chỉ lưu hash, không có bản gốc để
                hiện lại
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-xs text-[var(--supernova)]">
                  {visible ? apiKey : `ews_${'•'.repeat(32)}`}
                </code>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff /> : <Eye />}
                    {visible ? 'Ẩn' : 'Hiện'}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Sao chép app_secret" onClick={() => copy(apiKey)}>
                    <Copy />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Tabs defaultValue="config">
            <TabsList>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="token">Gọi API</TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="mt-3">
              <CodeBlock language="env" value={configSnippetFor(app, apiKey)} />
            </TabsContent>
            <TabsContent value="token" className="mt-3">
              <CodeBlock language="http" value={sendSnippetFor(apiKey)} />
            </TabsContent>
          </Tabs>
          <div className="flex items-center gap-2">
            <Checkbox id="secret-saved" checked={saved} onCheckedChange={(c) => setSaved(c === true)} />
            <Label htmlFor="secret-saved" className="text-xs">
              Tôi đã lưu app_secret vào secret store
            </Label>
          </div>
          <Button variant="outline" disabled={!saved} onClick={requestClose} className="w-full">
            Đóng
          </Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        tone="blocking"
        title="Đóng đi thì không lấy lại được. Vẫn đóng?"
        description="Bạn chưa bấm sao chép app_secret. Sau khi đóng, hệ thống chỉ còn hash."
        confirmLabel="Vẫn đóng"
        cancelLabel="Quay lại"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          onClose()
        }}
      />
    </>
  )
}
