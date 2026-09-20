'use client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { appBySlug, apps } from '@/lib/mock-data'

/** 05 §B Middle pane — preview theo sample: trang trắng hoàn toàn render trực tiếp HTML. */
export function PreviewPane({ ed }: { ed: TemplateEditorState }) {
  // §H: action_url ngoài allowed_origins → chặn lúc gửi, nêu tên domain
  const app = apps.find((a) => a.namespace === ed.base.namespace) ?? appBySlug('')
  const urlVar = ed.schema.find((v) => v.type === 'url')
  const urlValue = urlVar ? ed.values[urlVar.name] : ''
  let offendingDomain: string | null = null
  try {
    if (urlValue && app.allowed_origins?.length) {
      const origin = new URL(urlValue).origin
      if (!app.allowed_origins.includes(origin)) offendingDomain = new URL(urlValue).hostname
    }
  } catch {
    offendingDomain = null
  }

  const rawHtml =
    ed.previewHtml ||
    '<p style="color: #94a3b8; font-family: sans-serif; font-size: 14px;">(chưa có nội dung)</p>'
  const scrollbarHideStyle = `<style>
    html, body {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  </style>`

  let docHtml = ''
  if (rawHtml.includes('<html') || rawHtml.includes('<!doctype') || rawHtml.includes('<!DOCTYPE')) {
    if (rawHtml.includes('<head>')) {
      docHtml = rawHtml.replace('<head>', `<head>${scrollbarHideStyle}`)
    } else if (rawHtml.includes('<head ')) {
      docHtml = rawHtml.replace(/<head[^>]*>/, `$&${scrollbarHideStyle}`)
    } else {
      docHtml = `${scrollbarHideStyle}${rawHtml}`
    }
  } else {
    docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${scrollbarHideStyle}<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; margin: 24px; padding: 0; background: #ffffff; } a { color: #2563eb; } h1, h2, h3 { margin-top: 0; color: #0f172a; }</style></head><body>${rawHtml}</body></html>`
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white" data-testid="preview-pane">
      {ed.unresolved.length > 0 && (
        <Alert variant="destructive" className="mx-4 mt-2 shrink-0 border-[var(--supernova)]/40 bg-[var(--supernova)]/10" data-testid="unresolved-banner">
          <AlertDescription className="text-[var(--supernova)]">
            Còn {ed.unresolved.length} biến chưa render: <span className="font-mono">{ed.unresolved.map((v) => `{{${v}}}`).join(' ')}</span> — Xuất bản bị khoá.
          </AlertDescription>
        </Alert>
      )}

      {offendingDomain && (
        <Alert className="mx-4 mt-2 shrink-0 border-[var(--solar)]/30 bg-[var(--solar)]/[.06]" data-testid="origin-warning">
          <AlertDescription className="text-[var(--solar)]">
            Sẽ bị chặn lúc gửi: <span className="font-mono">{urlVar?.name}</span> trỏ tới <span className="font-mono">{offendingDomain}</span> ngoài allowed_origins ({app.allowed_origins?.join(', ')}).
          </AlertDescription>
        </Alert>
      )}

      {/* Trang trắng hoàn toàn — Full Bleed Canvas, không viền bo ngoài, không scrollbar thô */}
      <div className="flex-1 min-h-0 w-full h-full overflow-hidden bg-white">
        <iframe
          srcDoc={docHtml}
          title="HTML Preview"
          sandbox="allow-same-origin"
          className="h-full w-full border-0 bg-white"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      {ed.demoHtmlValue && (
        <p className="shrink-0 px-4 py-1 text-xs text-slate-500">
          Giá trị chứa thẻ HTML hiện như chữ — <span className="font-mono">custom_data</span> là data, không phải markup.
        </p>
      )}
    </div>
  )
}
