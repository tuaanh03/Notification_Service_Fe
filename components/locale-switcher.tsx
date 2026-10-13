'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { setLocaleAction } from '@/i18n/actions'
import { LOCALES, type Locale } from '@/i18n/locales'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LocaleFlag } from './locale-flag'

/**
 * Đổi ngôn ngữ giao diện: ghi cookie ở server rồi `refresh()` để cây server component dựng lại
 * bằng bộ câu chữ mới. Chỉ `refresh` — không đổi đường dẫn, nên dùng `useRouter` của Next thay vì
 * `useAppRouter` (trang đăng nhập không nằm trong `<AppProvider>`); `?app=` hiện tại giữ nguyên.
 */
export function useLocaleSwitch() {
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const change = (next: Locale) => {
    if (next === locale) return
    startTransition(async () => {
      await setLocaleAction(next)
      router.refresh()
    })
  }
  return { locale, change, pending }
}

/** Nút VI / EN cho trang đăng nhập — trong console thì đổi ở menu tài khoản (`<AppShell>`). */
export function LocaleToggle() {
  const t = useTranslations('locale')
  const { locale, change, pending } = useLocaleSwitch()
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[locale]}
      onValueChange={(v) => {
        const next = LOCALES.find((l) => l === v[0])
        if (next) change(next)
      }}
      disabled={pending}
      aria-label={t('label')}
    >
      {LOCALES.map((l) => (
        <ToggleGroupItem key={l} value={l} aria-label={t(l)} className="gap-1.5 font-mono text-xs uppercase">
          <LocaleFlag locale={l} />
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
