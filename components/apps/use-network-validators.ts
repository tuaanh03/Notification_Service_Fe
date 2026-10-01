'use client'

import { useTranslations } from 'next-intl'
import { ipError, originError } from './wizard-types'

/** `ipError` / `originError` kèm câu lỗi theo ngôn ngữ đang chọn — dùng ở wizard tạo app và `/settings/origins`. */
export function useNetworkValidators(): {
  validateIp: (v: string) => string | null
  validateOrigin: (v: string) => string | null
} {
  const t = useTranslations('validation')
  return {
    validateIp: (v) => {
      const code = ipError(v)
      return code && t(code)
    },
    validateOrigin: (v) => {
      const code = originError(v)
      return code && t(code)
    },
  }
}
