'use client'
import { useState, type ReactNode } from 'react'
import { Loader2, Monitor, Smartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { cn } from '@/lib/utils'

const SCROLLBAR_HIDE = `<style>
  html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
</style>`

/** Khung thư mặc định khi nội dung chỉ là mảnh HTML (không có `<html>`). Màu thư là màu của THƯ, không phải token console. */
const FRAGMENT_SHELL = (body: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8">${SCROLLBAR_HIDE}<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; margin: 24px; padding: 0; background: #ffffff; } a { color: #2563eb; } h1, h2, h3 { margin-top: 0; color: #0f172a; }</style></head><body>${body}</body></html>`

/** HTML thư -> tài liệu cho iframe: mảnh HTML thì bọc khung thư mặc định, đủ `<html>` thì giữ nguyên. */
export function emailDocument(html: string, emptyText: string): string {
  const raw = html || `<p style="color: #94a3b8; font-family: sans-serif; font-size: 14px;">${emptyText}</p>`
  if (!/<html|<!doctype/i.test(raw)) return FRAGMENT_SHELL(raw)
  return /<head[^>]*>/i.test(raw) ? raw.replace(/<head[^>]*>/i, `$&${SCROLLBAR_HIDE}`) : `${SCROLLBAR_HIDE}${raw}`
}

/**
 * Khung thư xem thử — nguồn duy nhất, dùng chung khung soạn và hộp thoại "Nhờ AI soạn".
 * iframe `sandbox` không cho chạy script: HTML của người soạn / của AI không đụng được tới console.
 */
export function EmailPreviewFrame({ html, className }: { html: string; className?: string }) {
  const t = useTranslations('previewPane')
  return (
    <iframe srcDoc={emailDocument(html, t('noContent'))} title={t('frameTitle')} sandbox="allow-same-origin" className={className ?? 'h-full w-full border-0 bg-white'} />
  )
}

/** Rộng khung xem trước theo thiết bị: máy tính = cả khung, điện thoại = 375px. */
const DEVICES = ['desktop', 'mobile'] as const
type Device = (typeof DEVICES)[number]

/**
 * Khung xem trước có tiêu đề + nút Máy tính / Điện thoại — dùng chung màn soạn (`PreviewPane`) và hộp xem
 * trước mẫu dựng sẵn. `loading` = đang dựng bản xem trước (hộp mẫu biên dịch MJML), `notice` hiện ngay dưới
 * thanh trên, `footer` ở đáy.
 */
export function DevicePreview({
  subject,
  html,
  loading = false,
  notice,
  footer,
  className,
}: {
  subject: string
  html: string
  loading?: boolean
  notice?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const t = useTranslations('previewPane')
  const [device, setDevice] = useState<Device>('desktop')
  return (
    <div className={cn('flex h-full flex-col overflow-hidden bg-white', className)}>
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--orbit)] px-4 py-2 text-xs">
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[var(--text-muted)]">{t('subject')}</span>
          <span className="font-medium text-[var(--text-primary)]">{subject || t('empty')}</span>
        </div>
        {loading && <Loader2 className="size-3.5 animate-spin text-[var(--text-muted)]" aria-label={t('updating')} />}
        <ToggleGroup variant="outline" size="sm" value={[device]} onValueChange={(v) => {
          const next = DEVICES.find((d) => d === v[0])
          if (next) setDevice(next)
        }} aria-label={t('device')}>
          <ToggleGroupItem value="desktop" aria-label={t('desktop')} className="gap-1 text-[11px]" data-testid="preview-desktop">
            <Monitor className="size-3.5" /> {t('desktop')}
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" aria-label={t('mobile')} className="gap-1 text-[11px]" data-testid="preview-mobile">
            <Smartphone className="size-3.5" /> {t('mobile')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {notice}
      <div className={cn('h-full min-h-0 w-full flex-1 overflow-hidden', device === 'mobile' ? 'flex justify-center bg-[var(--void)] py-3' : 'bg-white')}>
        <EmailPreviewFrame
          html={html}
          className={device === 'mobile' ? 'h-full w-[375px] max-w-full rounded-xl border border-[var(--orbit)] bg-white shadow-sm' : undefined}
        />
      </div>
      {footer}
    </div>
  )
}

/**
 * Xem thử bằng GIÁ TRỊ MẪU của bảng biến (không có thì `| default:`), escape như backend.
 * Biến chưa có giá trị nào hiện nguyên `{{ ... }}` — đúng chỗ backend sẽ từ chối lúc gửi.
 */
export function PreviewPane({ ed }: { ed: TemplateEditorState }) {
  const t = useTranslations('previewPane')
  return (
    <div className="h-full" data-testid="preview-pane">
      <DevicePreview
        subject={ed.previewSubject}
        html={ed.previewHtml}
        footer={<p className="shrink-0 px-4 py-1 text-[11px] text-[var(--text-muted)]">{t('hint')}</p>}
      />
    </div>
  )
}
