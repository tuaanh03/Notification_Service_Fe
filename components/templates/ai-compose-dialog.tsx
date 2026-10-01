'use client'
import { useEffect, useState } from 'react'
import { RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import type { AiComposeResultDto } from '@/lib/api/types'
import { renderPreview } from '@/lib/template-syntax'
import { useIssueText } from './issue-text'
import { EmailPreviewFrame } from './preview-pane'

const MAX_INSTRUCTION = 2000

type Stage = { kind: 'input' } | { kind: 'loading' } | { kind: 'result'; result: AiComposeResultDto }

/**
 * "Nhờ AI soạn" (ADR-0020 §7 của backend). AI chạy ở BACKEND; hộp thoại chỉ gửi mô tả + biến đã khai
 * (+ nội dung đang soạn khi Sửa) rồi hiện ĐỀ XUẤT: xem thử + lỗi kiểm tra. "Dùng bản này" mới điền vào
 * khung soạn — không lưu, không xuất bản; người soạn tự làm hai việc đó như với mọi nội dung.
 */
export function AiComposeDialog({ open, ed, onClose }: { open: boolean; ed: TemplateEditorState; onClose: () => void }) {
  const t = useTranslations('aiCompose')
  const tc = useTranslations('common')
  const hasContent = Boolean(ed.subject.trim() || ed.html.trim())
  const [instruction, setInstruction] = useState('')
  const [mode, setMode] = useState<'new' | 'revise'>(hasContent ? 'revise' : 'new')
  const [stage, setStage] = useState<Stage>({ kind: 'input' })
  const [error, setError] = useState<{ message: string; code: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (stage.kind !== 'loading') return
    setElapsed(0)
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [stage.kind])

  const compose = async () => {
    setError(null)
    setStage({ kind: 'loading' })
    const result = await ed.aiCompose(instruction.trim(), mode)
    if (result.ok) {
      setStage({ kind: 'result', result: result.data })
    } else {
      setError({ message: result.message, code: result.code })
      setStage({ kind: 'input' })
    }
  }

  const close = () => {
    if (stage.kind === 'loading') return
    setStage({ kind: 'input' })
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="z-[100] max-h-[90vh] max-w-3xl grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-2xl p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="size-4 text-[var(--pulsar)]" /> {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {stage.kind === 'result' ? (
          <ResultView result={stage.result} ed={ed} />
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-[var(--supernova)]/10">
                <TriangleAlert />
                <AlertTitle>{error.message}</AlertTitle>
                <AlertDescription className="font-mono text-xs">{t('code', { code: error.code })}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ai-instruction" className="text-xs font-semibold">{t('instruction')}</Label>
              <Textarea
                id="ai-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value.slice(0, MAX_INSTRUCTION))}
                className="min-h-28"
                disabled={stage.kind === 'loading'}
                placeholder={mode === 'new' ? t('placeholderNew') : t('placeholderRevise')}
              />
              <p className="text-right font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                {instruction.length}/{MAX_INSTRUCTION}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[mode]}
                onValueChange={(v) => v[0] && setMode(v[0] as 'new' | 'revise')}
                disabled={stage.kind === 'loading'}
                aria-label={t('modeLabel')}
              >
                <ToggleGroupItem value="new">{t('modeNew')}</ToggleGroupItem>
                <ToggleGroupItem value="revise" disabled={!hasContent}>{t('modeRevise')}</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-[var(--text-secondary)]">{t('onlyDeclared')}</p>
              {ed.variables.length ? (
                <div className="flex flex-wrap gap-1">
                  {ed.variables.map((v) => (
                    <Badge key={v.name} variant="outline" className="font-mono text-[10px]">{`{{ ${v.name} }}`}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">{t('noVariables')}</p>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {mode === 'revise' ? t('sentToProviderRevise') : t('sentToProvider')}
            </p>
            {stage.kind === 'loading' && (
              <p className="flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)]" data-testid="ai-generating">
                <span className="size-3 animate-spin rounded-full border-2 border-[var(--orbit)] border-t-[var(--pulsar)]" />
                {t('generating', { seconds: elapsed })}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={stage.kind === 'loading'}>{tc('cancel')}</Button>
          {stage.kind === 'result' ? (
            <>
              <Button variant="outline" onClick={() => setStage({ kind: 'input' })}>
                <RotateCcw /> {t('retry')}
              </Button>
              <Button
                onClick={() => {
                  ed.applyAi(stage.result)
                  close()
                }}
              >
                {t('use')}
              </Button>
            </>
          ) : (
            <Button onClick={() => void compose()} disabled={stage.kind === 'loading' || !instruction.trim()}>
              <Sparkles /> {stage.kind === 'loading' ? t('composing') : t('compose')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Đề xuất: lỗi kiểm tra (nếu có) trước, rồi tiêu đề + xem thử bằng giá trị mẫu của bảng biến. */
function ResultView({ result, ed }: { result: AiComposeResultDto; ed: TemplateEditorState }) {
  const t = useTranslations('aiCompose')
  const issueText = useIssueText()
  return (
    <div className="min-w-0 space-y-3" data-testid="ai-result">
      {result.issues.length > 0 ? (
        <Alert className="bg-[var(--solar)]/10">
          <TriangleAlert className="text-[var(--solar)]" />
          <AlertTitle>{t('issues', { count: result.issues.length })}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-0.5 text-xs">
              {result.issues.map((issue, i) => (
                <li key={i}>
                  {issue.path && <span className="font-mono">{issue.path}: </span>}
                  {issueText(issue)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-[var(--aurora)]">{t('passes')}</p>
      )}
      <div className="rounded-xl border border-[var(--orbit)]">
        <div className="border-b border-[var(--orbit)] px-4 py-2 text-xs">
          <span className="text-[var(--text-muted)]">{t('subject')}</span>
          <span className="font-medium">{renderPreview(result.subject, ed.variables, { escape: false })}</span>
        </div>
        <EmailPreviewFrame html={renderPreview(result.html, ed.variables, { escape: true })} className="h-[45vh] w-full rounded-b-xl border-0 bg-white" />
      </div>
    </div>
  )
}
