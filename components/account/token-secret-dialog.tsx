'use client'
import { Copy, Eye, EyeOff, KeyRound } from 'lucide-react'
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
import type { IssuedPersonalAccessTokenDto } from '@/lib/api/types'
import { fmtDateTime } from '@/lib/time'
import { PUBLIC_API_BASE } from '@/lib/openapi'

/**
 * Token `ewspat_…` hiện MỘT lần (ADR-0044 của backend — chỉ lưu băm). Cùng luật với `<CredentialDialog>` /
 * `<WebhookSecretDialog>` (UC-001 BR-4): tick "đã lưu" mới đóng, chưa sao chép mà đóng thì hỏi lại. Một nút Hiện / Ẩn
 * điều khiển cả dòng token lẫn lệnh curl mẫu.
 */
export function TokenSecretDialog({ issued, onClose }: { issued: IssuedPersonalAccessTokenDto; onClose: () => void }) {
  const t = useTranslations('account')
  const tc = useTranslations('common')
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const { token, secret } = issued
  const copy = () => {
    void navigator.clipboard?.writeText(secret)
    setCopied(true)
    toast.success(tc('copied'))
  }
  const requestClose = () => (copied ? onClose() : setConfirmClose(true))
  const curl = `curl ${PUBLIC_API_BASE}/admin/me \\\n  -H 'Authorization: Bearer ${secret}'`

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && saved && requestClose()}>
        <DialogContent
          showCloseButton={false}
          // Chuỗi mono dài không xuống dòng làm cột grid phình — như <CredentialDialog> (CLAUDE.md mục 6).
          className="orbit-ring z-[100] grid-cols-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto rounded-2xl p-6 shadow-[var(--glow-panel)] ring-0 sm:max-w-2xl"
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)]">
              <KeyRound className="size-5" />
            </div>
            <DialogTitle className="font-heading text-xl">{t('secretTitle')}</DialogTitle>
            <DialogDescription>{t('secretBody')}</DialogDescription>
          </DialogHeader>
          <p className="text-center text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-foreground">{token.name}</span> · <span className="font-mono">{token.scope}</span> ·{' '}
            {t('expiresOn', { at: fmtDateTime(token.expiresAt) })}
          </p>
          <div className="rounded-lg border border-[var(--supernova)]/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <code className="break-all font-mono text-xs text-[var(--supernova)]">
                <SecretText value={secret} visible={visible} />
              </code>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
                  {visible ? <EyeOff /> : <Eye />}
                  {visible ? t('hide') : t('show')}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={t('copySecret')} onClick={copy}>
                  <Copy />
                </Button>
              </div>
            </div>
          </div>
          <CodeBlock language="bash" value={curl} secret={{ value: secret, visible }} />
          <div className="flex items-center gap-2">
            <Checkbox id="pat-secret-saved" checked={saved} onCheckedChange={(c) => setSaved(c === true)} />
            <Label htmlFor="pat-secret-saved" className="text-xs">
              {t('secretSaved')}
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
        title={t('secretConfirmTitle')}
        description={t('secretConfirmBody')}
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
