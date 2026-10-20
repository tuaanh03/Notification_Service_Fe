'use client'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Bảng màu gợi ý cho THƯ — đây là dữ liệu người soạn chọn (hex lưu trong thư), không phải màu giao diện console,
 * nên được viết hex ở đây (ngoại lệ đã ghi trong CLAUDE.md: "màu trong THƯ là dữ liệu").
 */
export const PALETTES = {
  text: ['#0f172a', '#334155', '#64748b', '#2563eb', '#059669', '#e11d48'],
  accent: ['#2563eb', '#0284c7', '#059669', '#d97706', '#e11d48', '#0f172a'],
  background: ['#ffffff', '#f8fafc', '#f1f5f9', '#e0f2fe', '#ecfdf5', '#fef3c7'],
  line: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#2563eb', '#0f172a', '#e11d48'],
} as const

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Chọn màu bằng 6 ô gợi ý + "màu khác" (bộ chọn màu của trình duyệt). Không hiện mã hex — mã chỉ ở "Nâng cao"
 * (`showHex`). Ô đang chọn có vòng viền (không chỉ dựa vào màu).
 */
export function ColorField({
  label,
  value,
  palette,
  onChange,
  showHex = false,
  testId,
}: {
  label: string
  value: string | undefined
  palette: readonly string[]
  onChange: (color: string) => void
  showHex?: boolean
  testId?: string
}) {
  const t = useTranslations('visualEditor')
  const current = (value ?? '').toLowerCase()
  const custom = HEX_RE.test(current) && !palette.includes(current)
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
        {palette.map((color) => {
          const selected = current === color
          return (
            <Button
              key={color}
              variant="outline"
              size="icon-sm"
              role="radio"
              aria-checked={selected}
              aria-label={t('colorSwatch', { index: palette.indexOf(color) + 1 })}
              onClick={() => onChange(color)}
              // Màu của ô là màu dữ liệu đang chọn — giá trị động nên dùng style (CLAUDE.md mục 2).
              style={{ backgroundColor: color }}
              className={cn('size-7 rounded-full p-0', selected && 'ring-2 ring-[var(--starlight)] ring-offset-2')}
            />
          )
        })}
        <label
          className={cn(
            'relative inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--text-muted)] text-[var(--text-secondary)]',
            custom && 'ring-2 ring-[var(--starlight)] ring-offset-2',
          )}
          style={custom ? { backgroundColor: current } : undefined}
          title={t('colorOther')}
        >
          {!custom && <Plus className="size-3.5" aria-hidden />}
          <span className="sr-only">{t('colorOther')}</span>
          <Input
            type="color"
            value={HEX_RE.test(current) ? current : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      {showHex && (
        // Gõ tự do, chỉ áp khi đúng `#rrggbb` (rời ô hoặc Enter); `key` theo giá trị để ô cập nhật khi đổi bằng ô màu.
        <Input
          key={value ?? ''}
          defaultValue={value ?? ''}
          onBlur={(e) => HEX_RE.test(e.target.value.trim()) && onChange(e.target.value.trim())}
          onKeyDown={(e) => e.key === 'Enter' && HEX_RE.test(e.currentTarget.value.trim()) && onChange(e.currentTarget.value.trim())}
          className="h-7 w-28 font-mono text-xs"
          aria-label={t('colorHex', { field: label })}
        />
      )}
    </div>
  )
}
