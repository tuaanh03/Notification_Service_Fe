'use client'
import { useRef } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { parseVariable } from '@/lib/template-syntax'
import { cn } from '@/lib/utils'

/** Tách `{{ ... }}` ra khỏi dòng (nhóm bắt để `split` giữ lại token). */
const TOKEN_RE = /(\{\{[^}]+\}\})/g
const isToken = (part: string) => part.startsWith('{{') && part.endsWith('}}')
const nameOf = (tok: string) => parseVariable(tok.slice(2, -2)).path

/** Tô sáng `{{ }}` trong một dòng: cyan nếu đã khai trong bảng biến, rose nếu chưa. */
export function Highlight({ text, declared }: { text: string; declared: string[] }) {
  return (
    <>
      {text.split(TOKEN_RE).map((part, i) =>
        isToken(part) ? (
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

/**
 * Khung soạn HTML (CodeMirror). Nút AI chỉ MỞ hộp thoại "Nhờ AI soạn" (`onAi`) — AI chạy ở backend,
 * khung này không gọi ra ngoài.
 */
export function EditorPane({ ed, locked, onAi }: { ed: TemplateEditorState; locked: boolean; onAi: () => void }) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)

  const jumpToToken = (tok: string) => {
    const view = cmRef.current?.view
    if (!view) return
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = new RegExp(`\\{\\{\\s*${escaped}\\s*(\\|[^}]*)?\\}\\}`).exec(view.state.doc.toString())
    if (match) {
      view.dispatch({ selection: { anchor: match.index, head: match.index + match[0].length }, scrollIntoView: true })
      view.focus()
    }
  }

  return (
    <div className="flex h-full flex-col space-y-3 overflow-hidden" data-testid="editor-pane">
      <div
        className="relative h-full min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--orbit)] bg-[#1e1e1e] shadow-lg transition-colors focus-within:border-[var(--starlight)]/60"
        data-testid="code-highlight"
      >
        {!locked && (
          <div className="absolute top-2.5 right-3 z-10">
            <Button
              size="xs"
              variant="outline"
              onClick={onAi}
              className="h-7 border-[var(--pulsar)]/50 bg-[var(--void)]/85 text-[var(--pulsar)] backdrop-blur-md hover:border-[var(--pulsar)] hover:bg-[var(--pulsar)]/20"
            >
              <Sparkles className="mr-1.5 size-3.5" /> Nhờ AI soạn
            </Button>
          </div>
        )}
        {/* Khung trống: gợi ý nhờ AI. Lớp phủ không chặn bấm vào khung soạn — chỉ nút mới nhận chuột. */}
        {!ed.html.trim() && !locked && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
            <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--orbit)] bg-[var(--void)]/80 p-6 shadow-xl backdrop-blur-md">
              <Sparkles className="size-6 text-[var(--pulsar)]" />
              <p className="text-xs text-[var(--text-secondary)]">Khung soạn đang trống. Gõ HTML trực tiếp, hoặc nhờ AI soạn từ một câu mô tả.</p>
              <Button size="sm" onClick={onAi} className="border border-[var(--pulsar)]/50 bg-[var(--pulsar)]/20 text-[var(--pulsar)] hover:bg-[var(--pulsar)]/30">
                <Sparkles className="mr-2 size-4" /> Nhờ AI soạn
              </Button>
            </div>
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
          className="h-full font-mono text-xs [&_.cm-editor]:h-full [&_.cm-editor]:max-h-full [&_.cm-scroller]:overflow-x-auto [&_.cm-scroller]:overflow-y-auto"
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
              title={`Nhảy tới biến {{ ${tok} }} trong khung soạn`}
            >
              &#123;&#123; {tok} &#125;&#125; →
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
