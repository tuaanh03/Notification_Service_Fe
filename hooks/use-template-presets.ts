'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadTemplatePresetsAction } from '@/app/templates/actions'
import type { Locale } from '@/i18n/locales'
import type { TemplatePresetDto } from '@/lib/api/types'

type LoadState = { presets: TemplatePresetDto[] } | { error: { message: string; code: string } } | 'loading'

/**
 * Thư viện mẫu dựng sẵn (ADR-0035 của backend), nạp theo NGÔN NGỮ THƯ và giữ lại theo từng ngôn ngữ: thẻ mẫu
 * dùng ngôn ngữ màn hình, hộp xem trước đổi sang ngôn ngữ khác thì chỉ nạp thêm một lần.
 */
export function useTemplatePresets(initial: Locale) {
  const [state, setState] = useState<Partial<Record<Locale, LoadState>>>({})
  const requested = useRef(new Set<Locale>())

  const load = useCallback((locale: Locale, force = false) => {
    if (requested.current.has(locale) && !force) return
    requested.current.add(locale)
    setState((s) => ({ ...s, [locale]: 'loading' }))
    void loadTemplatePresetsAction(locale).then((result) => {
      setState((s) => ({
        ...s,
        [locale]: result.ok ? { presets: result.data } : { error: { message: result.message, code: result.code } },
      }))
      // Lỗi thì cho nạp lại ở lần hỏi sau.
      if (!result.ok) requested.current.delete(locale)
    })
  }, [])

  useEffect(() => load(initial), [initial, load])

  return { state, load }
}

export const presetsOf = (s: LoadState | undefined): TemplatePresetDto[] | null =>
  s !== undefined && s !== 'loading' && 'presets' in s ? s.presets : null
export const presetErrorOf = (s: LoadState | undefined) => (s !== undefined && s !== 'loading' && 'error' in s ? s.error : null)
