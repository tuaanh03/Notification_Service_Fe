'use client'
import { Copy, Eye, EyeOff, Webhook } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from '@/lib/api/types'

/** next-intl coi dấu `.` là tầng lồng — khoá câu dịch không chứa tên sự kiện nguyên văn. */
export const EVENT_LABEL = {
  'notification.sent': 'eventSent',
  'notification.failed': 'eventFailed',
  'notification.no_recipient': 'eventNoRecipient',
} as const satisfies Record<WebhookEventType, string>

/** Chỉ kiểm hình dạng để khoá nút — luật thật (không IP nội bộ, không user:pass…) ở backend. */
const looksLikeHttps = (url: string) => /^https:\/\/[^\s/]+/i.test(url.trim())

/**
 * Hộp thêm URL (`mode = 'create'`) hoặc đổi sự kiện của URL có sẵn (`'edit'` — URL không đổi được,
 * muốn đổi URL thì xoá rồi thêm mới). Bọc `<ConfirmDialog>`; nơi gọi PHẢI truyền `key` theo mục tiêu
 * để ô nhập không giữ giá trị của lần mở trước (CLAUDE.md mục 6).
 */
export function WebhookFormDialog({
  open,
  mode,
  initialUrl = '',
  initialEvents = [...WEBHOOK_EVENT_TYPES],
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initialUrl?: string
  initialEvents?: WebhookEventType[]
  pending: boolean
  /** Câu lỗi đã dịch của lần gửi vừa rồi — hiện ngay trong hộp, không đóng hộp. */
  error: string | null
  onCancel: () => void
  onSubmit: (input: { url: string; events: WebhookEventType[] }) => void
}) {
  const t = useTranslations('webhooks')
  const [url, setUrl] = useState(initialUrl)
  const [events, setEvents] = useState<WebhookEventType[]>(initialEvents)
  const valid = (mode === 'edit' || looksLikeHttps(url)) && events.length > 0
  const toggle = (event: WebhookEventType, on: boolean) =>
    setEvents((current) => (on ? [...current, event] : current.filter((e) => e !== event)))

  return (
    <ConfirmDialog
      open={open}
      title={mode === 'create' ? t('addTitle') : t('editTitle')}
      description={mode === 'create' ? t('addBody') : t('editBody')}
      confirmLabel={pending ? t('saving') : mode === 'create' ? t('add') : t('save')}
      confirmDisabled={pending || !valid}
      onCancel={onCancel}
      onConfirm={() => onSubmit({ url: url.trim(), events: WEBHOOK_EVENT_TYPES.filter((e) => events.includes(e)) })}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="webhook-url" className="text-xs">
            {t('urlLabel')}
          </Label>
          <Input
            id="webhook-url"
            value={url}
            disabled={mode === 'edit'}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://app.example.com/ews-webhook"
            className="font-mono text-xs"
            autoComplete="off"
          />
          {mode === 'create' && <p className="text-[11px] text-[var(--text-muted)]">{t('urlHint')}</p>}
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-medium">{t('eventsLabel')}</legend>
          {WEBHOOK_EVENT_TYPES.map((event) => (
            <label key={event} htmlFor={`webhook-event-${event}`} className="flex items-start gap-2 text-xs">
              <Checkbox
                id={`webhook-event-${event}`}
                checked={events.includes(event)}
                onCheckedChange={(c) => toggle(event, c === true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-mono text-[var(--starlight)]">{event}</span>
                <span className="block text-[var(--text-secondary)]">{t(EVENT_LABEL[event])}</span>
              </span>
            </label>
          ))}
          {events.length === 0 && <p className="text-[11px] text-[var(--supernova)]">{t('eventsRequired')}</p>}
        </fieldset>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </ConfirmDialog>
  )
}

/**
 * Giá trị bí mật hiện ĐÚNG MỘT LẦN — backend không lưu, đóng hộp là mất. Cùng cách với
 * `<CredentialDialog>` của khoá API: phải tick "đã lưu" mới đóng được, chưa sao chép mà đóng thì hỏi lại.
 *
 *   variant `secret`  — secret `whsec_…` của URL outgoing webhook (tạo URL / đổi secret)
 *   variant `hookUrl` — URL incoming webhook `…/hooks/ewshk_…` (tạo hook / đổi URL, ADR-0030)
 */
export function WebhookSecretDialog({
  url,
  secret,
  rotated,
  variant = 'secret',
  onClose,
}: {
  /** Dòng phụ dưới tiêu đề: URL outgoing, hoặc tên hook. */
  url: string
  /** Giá trị bí mật cần sao chép. */
  secret: string
  /** true = vừa đổi (giá trị cũ đã hết hiệu lực) — câu mở đầu khác. */
  rotated: boolean
  variant?: 'secret' | 'hookUrl'
  onClose: () => void
}) {
  const t = useTranslations('webhooks')
  const tc = useTranslations('common')
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(secret)
    setCopied(true)
    toast.success(tc('copied'))
  }
  const requestClose = () => (copied ? onClose() : setConfirmClose(true))

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && saved && requestClose()}>
        <DialogContent
          showCloseButton={false}
          // Cùng lý do với <CredentialDialog>: chuỗi mono dài không xuống dòng làm cột grid phình.
          className="orbit-ring z-[100] grid-cols-[minmax(0,1fr)] max-h-[calc(100vh-2rem)] max-w-xl overflow-x-hidden overflow-y-auto rounded-2xl p-6 shadow-[var(--glow-panel)] ring-0 sm:max-w-xl"
        >
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-[var(--starlight)] text-[var(--starlight)]">
              <Webhook className="size-5" />
            </div>
            <DialogTitle className="font-heading text-xl">
              {variant === 'hookUrl'
                ? rotated
                  ? t('hookUrlRotatedTitle')
                  : t('hookUrlTitle')
                : rotated
                  ? t('secretRotatedTitle')
                  : t('secretTitle')}
            </DialogTitle>
            <DialogDescription>{variant === 'hookUrl' ? t('hookUrlBody') : t('secretBody')}</DialogDescription>
          </DialogHeader>
          <p className="break-all text-center font-mono text-xs text-[var(--text-secondary)]">{url}</p>
          <div className="rounded-lg border border-[var(--supernova)]/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <code className="break-all font-mono text-xs text-[var(--supernova)]">
                {visible ? secret : variant === 'hookUrl' ? `${secret.slice(0, secret.indexOf('ewshk_') + 6)}${'•'.repeat(32)}` : `whsec_${'•'.repeat(32)}`}
              </code>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
                  {visible ? <EyeOff /> : <Eye />}
                  {visible ? t('hide') : t('show')}
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={variant === 'hookUrl' ? t('copyHookUrl') : t('copySecret')} onClick={copy}>
                  <Copy />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.rich(variant === 'hookUrl' ? 'hookUrlUsage' : 'secretUsage', { mono: (c) => <span className="font-mono">{c}</span> })}
          </p>
          <div className="flex items-center gap-2">
            <Checkbox id="webhook-secret-saved" checked={saved} onCheckedChange={(c) => setSaved(c === true)} />
            <Label htmlFor="webhook-secret-saved" className="text-xs">
              {variant === 'hookUrl' ? t('hookUrlSaved') : t('secretSaved')}
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
        title={variant === 'hookUrl' ? t('hookUrlConfirmTitle') : t('secretConfirmTitle')}
        description={variant === 'hookUrl' ? t('hookUrlConfirmBody') : t('secretConfirmBody')}
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
