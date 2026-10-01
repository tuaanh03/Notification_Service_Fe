'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Ô nhập lặp (origin, IP…): Input + "Thêm" → chip mono có nút bỏ. Enter cũng thêm.
 * `validate` trả chuỗi lỗi → hiện dưới ô, không thêm.
 */
export function RepeatableInput({
  id,
  values,
  onChange,
  placeholder,
  validate,
  invalid,
  className,
}: {
  id: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  validate?: (value: string) => string | null
  /** aria-invalid từ ngoài (ví dụ required mà rỗng) */
  invalid?: boolean
  className?: string
}) {
  const t = useTranslations('repeatable')
  const tv = useTranslations('validation')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const add = () => {
    const v = draft.trim()
    if (!v) return
    const err = validate?.(v) ?? (values.includes(v) ? tv('duplicate') : null)
    if (err) {
      setError(err)
      return
    }
    onChange([...values, v])
    setDraft('')
    setError(null)
  }
  return (
    <div className={cn('space-y-2', className)} data-slot="repeatable-input">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-invalid={invalid || Boolean(error)}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className="font-mono"
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label={t('add')} disabled={!draft.trim()}>
          <Plus />
        </Button>
      </div>
      {error && <p className="font-mono text-xs text-[var(--supernova)]">{error}</p>}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v}>
              <Badge variant="outline" className="gap-1 font-mono">
                {v}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="-mr-1 size-4"
                  aria-label={t('remove', { value: v })}
                  onClick={() => onChange(values.filter((x) => x !== v))}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
