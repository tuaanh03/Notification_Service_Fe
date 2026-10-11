'use client'
import { Copy, Eye, EyeOff, Rocket } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { CodeBlock } from '@/components/code-block'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SecretText } from '@/components/secret-text'
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
  const t = useTranslations('credentialDialog')
  const tc = useTranslations('common')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const copy = (value: string) => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    toast.success(tc('copied'))
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
          // max-w-4xl: khoá 80 ký tự nằm trên MỘT dòng, kể cả dòng `Authorization: Bearer <khoá>`.
          className="orbit-ring z-[100] grid-cols-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] max-w-4xl overflow-x-hidden overflow-y-auto rounded-2xl p-6 shadow-[var(--glow-panel)] ring-0 sm:max-w-4xl"
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)] shadow-[var(--glow-starlight-lg)]">
              <Rocket className="size-6" />
            </div>
            <DialogTitle className="font-heading text-2xl">{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--orbit)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                {t.rich('appIdNote', { mono })}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-xs text-[var(--starlight)]">{app.app_id}</code>
                <Button variant="ghost" size="icon-sm" aria-label={t('copyAppId')} onClick={() => copy(app.app_id)}>
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--supernova)]/30 p-4">
              <p className="text-xs text-[var(--text-muted)]">
                {t.rich('secretNote', { mono })}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="break-all font-mono text-xs text-[var(--supernova)]">
                  <SecretText value={apiKey} visible={visible} />
                </code>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff /> : <Eye />}
                    {visible ? t('hide') : t('show')}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t('copySecret')} onClick={() => copy(apiKey)}>
                    <Copy />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Tabs defaultValue="config">
            <TabsList>
              <TabsTrigger value="config">{t('tabConfig')}</TabsTrigger>
              <TabsTrigger value="token">{t('tabCall')}</TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="mt-3">
              <CodeBlock language="env" value={configSnippetFor(app, apiKey)} secret={{ value: apiKey, visible }} />
            </TabsContent>
            <TabsContent value="token" className="mt-3">
              <CodeBlock language="http" value={sendSnippetFor(apiKey)} secret={{ value: apiKey, visible }} />
            </TabsContent>
          </Tabs>
          <div className="flex items-center gap-2">
            <Checkbox id="secret-saved" checked={saved} onCheckedChange={(c) => setSaved(c === true)} />
            <Label htmlFor="secret-saved" className="text-xs">
              {t('saved')}
            </Label>
          </div>
          <Button variant="outline" disabled={!saved} onClick={requestClose} className="w-full">
            {t('close')}
          </Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        tone="blocking"
        title={t('confirmTitle')}
        description={t('confirmBody')}
        confirmLabel={t('closeAnyway')}
        cancelLabel={t('back')}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          onClose()
        }}
      />
    </>
  )
}
