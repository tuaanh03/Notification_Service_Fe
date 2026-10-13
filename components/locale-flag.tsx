'use client'

import { useId } from 'react'
import type { Locale } from '@/i18n/locales'
import { cn } from '@/lib/utils'

/**
 * Cờ của ngôn ngữ giao diện — SVG viết tay, không dùng emoji: Windows không có glyph cờ nên
 * 🇻🇳 hiện thành hai chữ "VN". `vi` = cờ Việt Nam, `en` = cờ Anh. Chỉ trang trí (`aria-hidden`),
 * tên ngôn ngữ luôn đi kèm bằng chữ.
 */
export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  // `useId` có ký tự `:` / `«»` — bỏ đi để `url(#…)` chắc chắn khớp.
  const id = `flag${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg
      viewBox={locale === 'vi' ? '0 0 30 20' : '0 0 60 30'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn('h-3 w-[18px] shrink-0 rounded-[2px] ring-1 ring-black/10', className)}
    >
      {locale === 'vi' ? (
        <>
          <rect width="30" height="20" fill="#DA251D" />
          <polygon
            fill="#FFFF00"
            points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"
          />
        </>
      ) : (
        <>
          <clipPath id={`${id}-t`}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </>
      )}
    </svg>
  )
}
