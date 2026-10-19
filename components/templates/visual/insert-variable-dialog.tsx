'use client'
import { useState } from 'react'
import { Braces } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import { cn } from '@/lib/utils'
import { FORBIDDEN_DEFAULT_RE } from './chip-plugin'

/** Tên biến mới người soạn gõ (phần sau `payload.`) — cùng luật `INVALID_VARIABLE_NAME` của backend. */
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Hộp "Chèn biến" (bản đơn giản của UX-2; bản đẹp theo phác thảo là UX-3): chọn một biến đã khai hoặc khai
 * biến mới, tuỳ chọn "giá trị khi thiếu". Biến không bắt buộc PHẢI có giá trị khi thiếu (backend báo
 * `OPTIONAL_VARIABLE_WITHOUT_DEFAULT` lúc xuất bản) — hộp đòi luôn ở đây.
 */
export function InsertVariableDialog({
  open,
  ed,
  onInsert,
  onClose,
  onClosed,
}: {
  open: boolean
  ed: TemplateEditorState
  onInsert: (path: string, fallback: string | null) => void
  onClose: () => void
  /** Hộp đã đóng hẳn — lúc này mới trả con trỏ về khung thư (hộp giữ focus khi còn mở). */
  onClosed: () => void
}) {
  const t = useTranslations('visualEditor')
  const [path, setPath] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [fallback, setFallback] = useState('')

  const reset = () => {
    setPath(null)
    setNewKey('')
    setFallback('')
  }
  const isNew = path === null && newKey.trim() !== ''
  const chosen = isNew ? `payload.${newKey.trim()}` : path
  const variable = ed.variables.find((v) => v.name === chosen)
  const needsFallback = variable ? !variable.required : false
  const badKey = isNew && !KEY_RE.test(newKey.trim())
  const badFallback = FORBIDDEN_DEFAULT_RE.test(fallback)
  const disabled = !chosen || badKey || badFallback || (needsFallback && !fallback.trim())

  return (
    <ConfirmDialog
      open={open}
      icon={Braces}
      title={t('insertTitle')}
      description={t('insertBody')}
      confirmLabel={t('insertConfirm')}
      confirmDisabled={disabled}
      onConfirm={() => {
        if (!chosen) return
        if (isNew && !ed.variables.some((v) => v.name === chosen)) ed.declareVar(chosen)
        onInsert(chosen, fallback.trim() || null)
        reset()
      }}
      onCancel={() => {
        reset()
        onClose()
      }}
      onClosed={onClosed}
    >
      <div className="space-y-4">
        {ed.variables.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="listbox" aria-label={t('insertDeclared')}>
            {ed.variables.map((v) => (
              <Button
                key={v.name}
                variant="outline"
                size="sm"
                role="option"
                aria-selected={path === v.name}
                onClick={() => {
                  setPath(v.name)
                  setNewKey('')
                }}
                className={cn(
                  'h-auto rounded-full px-3 py-1 text-xs font-normal',
                  path === v.name && 'bg-[var(--nebula-indigo)] text-[var(--starlight)] ring-2 ring-[var(--starlight)]',
                )}
                data-testid={`insert-var-${v.name}`}
              >
                <span className="font-medium">{v.description?.trim() || v.name.replace(/^(payload|user)\./, '')}</span>
                <span className="ml-1 font-mono text-[10px] text-[var(--text-muted)]">{v.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">{t('insertNoVariables')}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="insert-var-new" className="text-xs font-semibold">{t('insertNew')}</Label>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-[var(--text-muted)]">payload.</span>
            <Input
              id="insert-var-new"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value)
                if (e.target.value.trim()) setPath(null)
              }}
              placeholder="ten_khach"
              className="font-mono text-xs"
              aria-invalid={badKey}
            />
          </div>
          {badKey && <p className="text-[11px] text-[var(--supernova)]">{t('insertBadKey')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insert-var-default" className="text-xs font-semibold">
            {needsFallback ? t('insertFallbackRequired') : t('insertFallback')}
          </Label>
          <Input id="insert-var-default" value={fallback} onChange={(e) => setFallback(e.target.value)} maxLength={200} aria-invalid={badFallback} />
          {badFallback && <p className="text-[11px] text-[var(--supernova)]">{t('insertBadFallback')}</p>}
        </div>
      </div>
    </ConfirmDialog>
  )
}
