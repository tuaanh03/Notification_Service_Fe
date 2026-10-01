import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Khung email nền sáng (mô phỏng hộp thư Outlook) — nguồn duy nhất cho Composer block 3,
 * chi tiết lần gửi (07 §B4) và Template editor (05 §B). Token --mail-* khai một lần ở globals.css.
 * Footer opt-out do hệ thống chèn (UC-006 BR-10) — hiện read-only có khoá, template không tự lo.
 * `bodyHtml` = HTML đã sanitize + escape (từ renderHtmlPreview) — chỉ editor dùng; mặc định `body` là text.
 */
export function MailFrame({
  subject,
  body,
  bodyHtml,
  device = 'desktop',
  header = 'EWS Notification Service',
  footerNote,
  className,
}: {
  subject: string
  body?: string
  bodyHtml?: string
  device?: 'desktop' | 'mobile'
  /** dải đầu thư: tên hệ thống hoặc `template_id · version` */
  header?: React.ReactNode
  /** tooltip trên ổ khoá footer (editor: giải thích footer do hệ thống chèn) */
  footerNote?: string
  className?: string
}) {
  const t = useTranslations('mail')
  // Chân thư bên dưới ("Thông báo nội bộ · …") là NỘI DUNG THƯ mô phỏng, không phải chữ giao diện — không dịch.
  const lock = <Lock className="size-3" aria-label={t('footerLock')} />
  return (
    <div
      data-slot="mail-frame"
      className={cn(
        'mx-auto rounded-[24px] border-4 border-[var(--mail-frame)] bg-[var(--deep)] p-2 shadow-2xl',
        device === 'mobile' ? 'w-full max-w-[375px]' : 'max-w-md',
        className,
      )}
    >
      <div className="rounded-2xl bg-[var(--mail-bg)] p-5 text-[var(--mail-text)]">
        <div className="border-b border-[var(--mail-line)] pb-3 font-mono text-xs text-[var(--mail-muted)]">{header}</div>
        <h3 className="py-4 text-lg font-bold break-words">{subject}</h3>
        {bodyHtml !== undefined ? (
          <div className="mail-body text-sm leading-6 break-words" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        ) : (
          <p className="text-sm leading-6 break-words">{body}</p>
        )}
        <div
          className="mt-6 flex items-center gap-1.5 border-t border-[var(--mail-line)] pt-3 text-xs text-[var(--mail-muted)]"
          data-slot="mail-footer"
        >
          {footerNote ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{lock}</TooltipTrigger>
              <TooltipContent>{footerNote}</TooltipContent>
            </Tooltip>
          ) : (
            lock
          )}
          Thông báo nội bộ · Quản lý đăng ký · Opt-out
        </div>
      </div>
    </div>
  )
}
