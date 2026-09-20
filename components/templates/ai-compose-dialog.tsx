'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usedVariableNames } from '@/lib/mock-data'

export type AiResult = { prompt: string; subject: string; html: string }

/** UC-006 §D — Nhờ AI soạn: AI thấy sẵn biến đang dùng để không bịa tên; kết quả luôn là draft. */
export function AiComposeDialog({ open, namespace, onClose, onResult }: { open: boolean; namespace?: string; onClose: () => void; onResult: (r: AiResult) => void }) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const vars = usedVariableNames(namespace)
  const generate = () => {
    setGenerating(true)
    // mock: "AI" ghép từ biến có sẵn, không bịa tên mới
    window.setTimeout(() => {
      onResult({
        prompt,
        subject: '[{{alert_title}}] {{vm_name}} cần xử lý',
        html: `<h2>{{alert_title}}</h2>\n<p>${prompt.trim() || 'Máy ảo {{vm_name}} vượt ngưỡng {{threshold}}%.'}</p>\n<p>Mức hiện tại: {{current_usage}}% · Chủ sở hữu: {{owner}}</p>\n<p><a href="{{action_url}}">Xử lý</a></p>`,
      })
      setGenerating(false)
      setPrompt('')
    }, 1500)
  }
  return (
    <ConfirmDialog
      open={open}
      title="Nhờ AI soạn"
      description="Kết quả vào editor dưới dạng draft. AI không bao giờ tự xuất bản."
      confirmLabel={generating ? 'Đang soạn…' : 'Soạn nháp'}
      confirmDisabled={generating || !prompt.trim()}
      onConfirm={generate}
      onCancel={() => !generating && onClose()}
    >
      {generating ? (
        <div className="flex flex-col items-center gap-3 py-6" data-testid="ai-generating">
          {/* orbit spinner chậm — không skeleton */}
          <span className="relative size-12">
            <span className="absolute inset-0 rounded-full border border-[var(--orbit)]" />
            <span className="absolute inset-0 animate-[spin_2.4s_linear_infinite] rounded-full border-t-2 border-[var(--starlight)]" />
            <Sparkles className="absolute inset-0 m-auto size-4 text-[var(--starlight)]" />
          </span>
          <p className="font-mono text-xs text-[var(--text-secondary)]">đang soạn bản nháp…</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ai-prompt" className="text-xs">Mô tả email bạn muốn</Label>
            <Textarea id="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-24" placeholder="Ví dụ: cảnh báo VM quá tải, giọng ngắn gọn, có nút xử lý" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">Biến app đang dùng ở template khác</p>
            <div className="flex flex-wrap gap-1" data-testid="ai-vars">
              {vars.map((v) => (
                <Badge key={v} variant="outline" className="font-mono text-[10px]">{`{{${v}}}`}</Badge>
              ))}
            </div>
          </div>
          <Alert className="border-[var(--orbit)] bg-transparent">
            <AlertDescription className="text-[var(--text-secondary)]">AI được cấp sẵn danh sách biến này để không bịa tên biến mới.</AlertDescription>
          </Alert>
        </div>
      )}
    </ConfirmDialog>
  )
}
