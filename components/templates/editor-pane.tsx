'use client'
import { useEffect, useRef, useState } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { cn } from '@/lib/utils'

const TOKEN_RE = /(\{\{\s*[a-zA-Z0-9_]+\s*\}\})/g
const nameOf = (tok: string) => tok.replace(/[{}\s]/g, '')

/** Tô sáng `{{ }}` trong một dòng: cyan nếu đã khai schema, rose nếu chưa. */
export function Highlight({ text, declared }: { text: string; declared: string[] }) {
  return (
    <>
      {text.split(TOKEN_RE).map((part, i) =>
        TOKEN_RE.test(part) ? (
          <span
            key={i}
            className={cn(
              declared.includes(nameOf(part))
                ? 'text-[var(--starlight)]'
                : 'text-[var(--supernova)] underline decoration-wavy',
            )}
            data-token={nameOf(part)}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** 05 §B Left pane — Tin nhắn (Body HTML) với CodeMirror highlight HTML, số dòng, code folding. */
export function EditorPane({ ed, locked }: { ed: TemplateEditorState; locked: boolean }) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isGenerating) {
      setElapsedSec(0)
      interval = setInterval(() => {
        setElapsedSec((prev) => +(prev + 0.1).toFixed(1))
      }, 100)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  const handleGenerateHtml = async () => {
    if (locked || isGenerating) return
    setIsGenerating(true)
    const startTime = Date.now()

    try {
      const basePath =
        typeof process.env.BASE_PATH === 'string'
          ? process.env.BASE_PATH
          : ''
      const res = await fetch(`${basePath}/api/ai/generate-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            'Tạo layout HTML email thông báo responsive hiện đại, phong cách clean và trang nhã, bao gồm logo header, nội dung chính, bảng thông tin nổi bật, nút hành động CTA, và footer bản quyền.',
        }),
      })

      const data = await res.json()
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (data.success && data.html) {
        ed.setHtml(data.html)
        ed.setAiBanner?.(true)
        if (data.isMock) {
          toast.success('Đã tạo layout HTML mẫu (Chế độ mô phỏng)', {
            description: `Chưa cấu hình AI_API_KEY trong file .env · Độ trễ: ${duration}s`,
          })
        } else {
          toast.success('Đã sinh layout HTML thành công!', {
            description: `Model: ${data.model} · Thời gian phản hồi: ${duration}s`,
          })
        }
      } else {
        toast.error('Lỗi khi sinh HTML từ AI', {
          description: data.error || 'Vui lòng kiểm tra lại cấu hình AI_API_KEY trong file .env.',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ'
      toast.error('Không thể gọi API', { description: msg })
    } finally {
      setIsGenerating(false)
    }
  }

  const jumpToToken = (tok: string) => {
    const view = cmRef.current?.view
    if (!view) return
    const doc = view.state.doc
    const text = doc.toString()
    const regex = new RegExp(`\\{\\{\\s*${tok}\\s*\\}\\}`, 'i')
    const match = regex.exec(text)
    if (match) {
      view.dispatch({
        selection: { anchor: match.index, head: match.index + match[0].length },
        scrollIntoView: true,
      })
      view.focus()
    }
  }

  return (
    <div className="flex h-full flex-col space-y-3 overflow-hidden" data-testid="editor-pane">
      {/* Trình soạn thảo CodeMirror — toàn màn hình panel, cuộn dọc nội bộ */}
      <div
        className="relative flex-1 min-h-0 h-full overflow-hidden rounded-xl border border-[var(--orbit)] bg-[#1e1e1e] shadow-lg transition-colors focus-within:border-[var(--starlight)]/60"
        data-testid="code-highlight"
      >
        {/* Nút floating AI góc trên bên phải */}
        <div className="absolute top-2.5 right-3 z-10">
          <Button
            size="xs"
            variant="outline"
            onClick={handleGenerateHtml}
            disabled={locked || isGenerating}
            className="h-7 border-[var(--pulsar)]/50 bg-[var(--void)]/85 text-[var(--pulsar)] backdrop-blur-md hover:bg-[var(--pulsar)]/20 hover:border-[var(--pulsar)] transition-all shadow-[0_0_12px_-2px_rgba(168,85,247,0.35)]"
            title="Nhờ AI tạo nhanh khung HTML template"
          >
            {isGenerating ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
            {isGenerating ? 'Đang sinh HTML…' : 'AI Soạn HTML'}
          </Button>
        </div>

        {/* Empty State khi chưa có nội dung */}
        {!ed.html?.trim() && !isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--orbit)] bg-[var(--void)]/80 p-6 backdrop-blur-md max-w-sm shadow-xl">
              <span className="relative flex size-12 items-center justify-center rounded-full bg-[var(--pulsar)]/15 border border-[var(--pulsar)]/35">
                <Sparkles className="size-6 text-[var(--pulsar)] animate-pulse" />
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Trình soạn thảo đang trống</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Bấm để nhờ AI tạo nhanh khung HTML email responsive chuẩn sẵn sàng kiểm thử
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateHtml}
                disabled={locked || isGenerating}
                className="mt-1 border border-[var(--pulsar)]/50 bg-[var(--pulsar)]/20 text-[var(--pulsar)] hover:bg-[var(--pulsar)]/30 hover:border-[var(--pulsar)] shadow-[0_0_16px_-3px_rgba(168,85,247,0.4)]"
              >
                <Sparkles className="size-4 mr-2" /> Sinh layout HTML mẫu
              </Button>
            </div>
          </div>
        )}

        {/* Loading Overlay khi đang gọi API */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#1e1e1e]/90 backdrop-blur-xs select-none">
            <span className="relative size-12">
              <span className="absolute inset-0 rounded-full border border-[var(--orbit)]" />
              <span className="absolute inset-0 animate-[spin_2s_linear_infinite] rounded-full border-t-2 border-[var(--pulsar)]" />
              <Sparkles className="absolute inset-0 m-auto size-4 text-[var(--pulsar)]" />
            </span>
            <p className="font-mono text-xs text-[var(--starlight)]">Đang kết nối API & sinh layout HTML…</p>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              Đang nhận diện layout responsive ({elapsedSec.toFixed(1)}s)
            </p>
          </div>
        )}
        <CodeMirror
          id="tpl-html"
          ref={cmRef}
          value={ed.html}
          height="100%"
          maxHeight="100%"
          theme={vscodeDark}
          extensions={[html()]}
          editable={!locked}
          readOnly={locked}
          onChange={(val) => ed.setHtml(val)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
          }}
          className="h-full font-mono text-xs [&_.cm-editor]:h-full [&_.cm-editor]:max-h-full [&_.cm-scroller]:overflow-y-auto [&_.cm-scroller]:overflow-x-auto"
        />
      </div>

      {ed.undeclared.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[var(--supernova)]">Biến chưa khai báo:</span>
          {ed.undeclared.map((tok) => (
            <Button
              key={tok}
              variant="outline"
              size="xs"
              className="h-5 border-[var(--supernova)]/40 px-1.5 font-mono text-[11px] text-[var(--supernova)] hover:bg-[var(--supernova)]/10"
              onClick={() => jumpToToken(tok)}
              title={`Nhảy tới biến {{${tok}}} trong editor`}
            >
              &#123;&#123;{tok}&#125;&#125; →
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
