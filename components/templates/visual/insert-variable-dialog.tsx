'use client'
import { useMemo, useState } from 'react'
import { Braces, ChevronRight, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TemplateEditorState } from '@/hooks/use-template-editor'
import type { TemplateVariableDto } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { FORBIDDEN_DEFAULT_RE, slugifyKey, VARIABLE_KEY_RE, variableLabel } from '@/lib/variable-labels'

/** Biến EWS tự điền — luôn có trong danh sách, chọn thì tự khai vào bảng biến (backend: `user.external_id`). */
const BUILT_IN = 'user.external_id'

/**
 * Hộp "Chèn biến" (bản phác ChenBien): tìm, danh sách biến (nhãn + ví dụ + bắt buộc / có sẵn), "+ Thêm biến mới"
 * (tên dễ đọc -> mã `payload.xxx` tự đặt, ví dụ, chữ hiện khi app không gửi, app bắt buộc gửi). Mã biến chỉ hiện mờ.
 *
 * Biến KHÔNG bắt buộc phải có chữ hiện khi thiếu (backend báo `OPTIONAL_VARIABLE_WITHOUT_DEFAULT` lúc xuất bản) —
 * hộp đòi luôn ở đây. Chữ đó cấm `" ' < > { } |` (phá cú pháp biến / thư). Biến mới vào bảng Biến ngay
 * (`ed.addVariable`): mô tả = tên dễ đọc, giá trị mẫu = ví dụ.
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
  onClosed?: () => void
}) {
  const t = useTranslations('visualEditor')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [fallback, setFallback] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newSample, setNewSample] = useState('')
  const [newRequired, setNewRequired] = useState(true)

  const builtIn: TemplateVariableDto = { name: BUILT_IN, source: 'user', required: true, description: t('builtInRecipientId') }
  const all = useMemo(() => {
    const list = [...ed.variables]
    if (!list.some((v) => v.name === BUILT_IN)) list.push(builtIn)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps -- builtIn chỉ đổi theo ngôn ngữ
  }, [ed.variables, t])
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((v) => variableLabel(v).toLowerCase().includes(q) || v.name.toLowerCase().includes(q)) : all

  const reset = () => {
    setQuery('')
    setPicked(null)
    setFallback('')
    setAdding(false)
    setNewLabel('')
    setNewSample('')
    setNewRequired(true)
  }

  const newKey = slugifyKey(newLabel)
  const newPath = `payload.${newKey}`
  const newTaken = adding && all.some((v) => v.name === newPath)
  const newBad = adding && newLabel.trim() !== '' && !VARIABLE_KEY_RE.test(newKey)
  const chosen = adding ? (newLabel.trim() && !newBad && !newTaken ? newPath : null) : picked
  const chosenVar = adding ? null : all.find((v) => v.name === picked) ?? null
  const needsFallback = adding ? !newRequired : chosenVar ? !chosenVar.required : false
  const badFallback = FORBIDDEN_DEFAULT_RE.test(fallback)
  const disabled = !chosen || badFallback || (needsFallback && !fallback.trim())
  const chosenLabel = adding ? newLabel.trim() : chosenVar ? variableLabel(chosenVar) : ''

  return (
    <ConfirmDialog
      open={open}
      icon={Braces}
      title={t('insertTitle')}
      description={t('insertBody')}
      confirmLabel={chosenLabel ? t('insertConfirmNamed', { name: chosenLabel }) : t('insertConfirm')}
      confirmDisabled={disabled}
      onConfirm={() => {
        if (!chosen) return
        if (adding) {
          ed.addVariable({
            name: newPath,
            source: 'payload',
            required: newRequired,
            description: newLabel.trim(),
            ...(newSample.trim() ? { sample: newSample.trim() } : {}),
          })
        } else if (chosen === BUILT_IN && !ed.variables.some((v) => v.name === BUILT_IN)) {
          ed.addVariable(builtIn)
        }
        onInsert(chosen, fallback.trim() || null)
        reset()
      }}
      onCancel={() => {
        reset()
        onClose()
      }}
      onClosed={onClosed}
    >
      <div className="space-y-3" data-testid="insert-variable-dialog">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('insertSearch')}
            aria-label={t('insertSearch')}
            className="pl-9"
          />
        </div>
        <div className="max-h-56 space-y-0.5 overflow-y-auto" role="listbox" aria-label={t('insertDeclared')}>
          {shown.map((v) => {
            const selected = !adding && picked === v.name
            return (
              <Button
                key={v.name}
                variant="ghost"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setPicked(v.name)
                  setAdding(false)
                }}
                className={cn('h-auto w-full justify-start gap-3 px-3 py-2 text-left font-normal', selected && 'bg-[var(--nebula-indigo)]/60')}
                data-testid={`insert-var-${v.name}`}
              >
                <span className="shrink-0 rounded-full border border-[var(--starlight)]/30 bg-[var(--nebula-indigo)] px-2.5 py-0.5 text-xs font-medium text-[var(--starlight)]">
                  {variableLabel(v)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">
                  {v.sample ? t('insertExample', { value: v.sample }) : null}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                  {v.source === 'user' ? t('insertBuiltIn') : v.required ? t('insertRequired') : t('insertOptional')}
                </span>
              </Button>
            )
          })}
          {shown.length === 0 && <p className="px-3 py-2 text-xs text-[var(--text-muted)]">{t('insertNoMatch')}</p>}
        </div>

        <Collapsible
          open={adding}
          onOpenChange={(next) => {
            setAdding(next)
            if (next) setPicked(null)
          }}
          className="border-t border-[var(--orbit)] pt-3"
        >
          <CollapsibleTrigger className="group/new flex items-center gap-1 text-sm font-semibold text-[var(--starlight)]" data-testid="insert-new-toggle">
            <ChevronRight className="size-4 transition-transform group-data-[panel-open]/new:rotate-90" />
            {t('insertNew')}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="var-new-label" className="text-xs font-semibold">{t('insertNewLabel')}</Label>
                <Input id="var-new-label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={80} placeholder={t('insertNewLabelPlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="var-new-sample" className="text-xs font-semibold">{t('insertNewSample')}</Label>
                <Input id="var-new-sample" value={newSample} onChange={(e) => setNewSample(e.target.value)} maxLength={200} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="var-new-required" checked={newRequired} onCheckedChange={(c) => setNewRequired(c === true)} />
                <Label htmlFor="var-new-required" className="text-xs">{t('insertNewRequired')}</Label>
              </div>
            </div>
            {newLabel.trim() && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {newTaken ? (
                  <span className="text-[var(--supernova)]">{t('insertNewTaken')}</span>
                ) : newBad ? (
                  <span className="text-[var(--supernova)]">{t('insertBadKey')}</span>
                ) : (
                  t.rich('insertNewCode', { code: () => <span className="font-mono text-[var(--text-secondary)]">{newPath}</span> })
                )}
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {(needsFallback || fallback) && (
          <div className="space-y-1.5">
            <Label htmlFor="var-fallback" className="text-xs font-semibold">{t('insertFallbackRequired')}</Label>
            <Input id="var-fallback" value={fallback} onChange={(e) => setFallback(e.target.value)} maxLength={200} aria-invalid={badFallback} placeholder={t('insertFallbackPlaceholder')} />
            {badFallback && <p className="text-[11px] text-[var(--supernova)]">{t('insertBadFallback')}</p>}
          </div>
        )}
      </div>
    </ConfirmDialog>
  )
}
