'use client'
import type { TemplateEditorState } from '@/hooks/use-template-editor'

const SCROLLBAR_HIDE = `<style>
  html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
  html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
</style>`

/** Khung thư mặc định khi nội dung chỉ là mảnh HTML (không có `<html>`). Màu thư là màu của THƯ, không phải token console. */
const FRAGMENT_SHELL = (body: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8">${SCROLLBAR_HIDE}<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; margin: 24px; padding: 0; background: #ffffff; } a { color: #2563eb; } h1, h2, h3 { margin-top: 0; color: #0f172a; }</style></head><body>${body}</body></html>`

/** HTML thư -> tài liệu cho iframe: mảnh HTML thì bọc khung thư mặc định, đủ `<html>` thì giữ nguyên. */
function emailDocument(html: string): string {
  const raw = html || '<p style="color: #94a3b8; font-family: sans-serif; font-size: 14px;">(chưa có nội dung)</p>'
  if (!/<html|<!doctype/i.test(raw)) return FRAGMENT_SHELL(raw)
  return /<head[^>]*>/i.test(raw) ? raw.replace(/<head[^>]*>/i, `$&${SCROLLBAR_HIDE}`) : `${SCROLLBAR_HIDE}${raw}`
}

/**
 * Khung thư xem thử — nguồn duy nhất, dùng chung khung soạn và hộp thoại "Nhờ AI soạn".
 * iframe `sandbox` không cho chạy script: HTML của người soạn / của AI không đụng được tới console.
 */
export function EmailPreviewFrame({ html, className }: { html: string; className?: string }) {
  return (
    <iframe srcDoc={emailDocument(html)} title="Xem thử thư" sandbox="allow-same-origin" className={className ?? 'h-full w-full border-0 bg-white'} />
  )
}

/**
 * Xem thử bằng GIÁ TRỊ MẪU của bảng biến (không có thì `| default:`), escape như backend.
 * Biến chưa có giá trị nào hiện nguyên `{{ ... }}` — đúng chỗ backend sẽ từ chối lúc gửi.
 */
export function PreviewPane({ ed }: { ed: TemplateEditorState }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white" data-testid="preview-pane">
      <div className="shrink-0 border-b border-[var(--orbit)] px-4 py-2 text-xs">
        <span className="text-[var(--text-muted)]">Tiêu đề: </span>
        <span className="font-medium text-[var(--text-primary)]">{ed.previewSubject || '(trống)'}</span>
      </div>
      <div className="h-full min-h-0 w-full flex-1 overflow-hidden bg-white">
        <EmailPreviewFrame html={ed.previewHtml} />
      </div>
      <p className="shrink-0 px-4 py-1 text-[11px] text-[var(--text-muted)]">
        Xem thử trên trình duyệt bằng giá trị mẫu. Kiểm tra chính thức chạy lúc Xuất bản.
      </p>
    </div>
  )
}
