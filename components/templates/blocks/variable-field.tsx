'use client'
import { useRef } from 'react'
import { Braces } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Ô chữ có nút "Chèn biến": chèn `{{ <biến đã khai> }}` vào đúng chỗ con trỏ. Chỉ liệt kê biến trong bảng
 * biến — muốn biến mới thì khai ở bảng biến trước (biến là khuôn body app phải gửi).
 */
export function VariableField({
  id,
  label,
  value,
  onChange,
  variables,
  disabled,
  multiline,
  placeholder,
  hint,
  invalid,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  variables: readonly string[]
  disabled?: boolean
  multiline?: boolean
  placeholder?: string
  hint?: string
  invalid?: boolean
}) {
  const t = useTranslations('blockEditor')
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  const insert = (name: string) => {
    const el = ref.current
    const token = `{{ ${name} }}`
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const common = {
    id,
    value,
    disabled,
    placeholder,
    'aria-invalid': invalid || undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    className: 'text-xs',
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[11px] font-semibold">{label}</Label>
        {!disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="xs" className="h-5 px-1.5 text-[11px] text-[var(--starlight)]" data-testid={`insert-var-${id}`}>
                  <Braces /> {t('insertVariable')}
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="z-[100] w-56 rounded-xl border border-border bg-popover p-1 shadow-md">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px]">{t('insertVariable')}</DropdownMenuLabel>
                {variables.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs">{t('noVariables')}</DropdownMenuItem>
                ) : (
                  variables.map((name) => (
                    <DropdownMenuItem key={name} className="cursor-pointer font-mono text-xs" onClick={() => insert(name)}>
                      {name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {multiline ? <Textarea ref={ref} rows={4} {...common} /> : <Input ref={ref} {...common} />}
      {hint && <p className={invalid ? 'text-[11px] text-[var(--supernova)]' : 'text-[11px] text-[var(--text-muted)]'}>{hint}</p>}
    </div>
  )
}
