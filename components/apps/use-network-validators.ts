'use client'

import { useTranslations } from 'next-intl'
import { ipError } from './wizard-types'

/** `ipError` kèm câu lỗi theo ngôn ngữ đang chọn — dùng ở màn Giới hạn IP (Quản trị EWS). */
export function useNetworkValidators(): { validateIp: (v: string) => string | null } {
  const t = useTranslations('validation')
  return {
    validateIp: (v) => {
      const code = ipError(v)
      return code && t(code)
    },
  }
}
