'use client'

import { TriangleAlert } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MISSING_PARAM, NEXT_PARAM, safeNext } from '@/lib/app-routes'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Tham số `<AppGate>` gắn khi đưa người dùng sang trang Tổ chức chọn app (`chooseAppPath`):
 * `next` = màn định mở (đã lọc qua `safeNext`), `query` = chuỗi để chuyển tiếp nguyên trạng từ
 * bảng org sang bảng app của một org.
 */
export function useChooseAppParams(): { next: string; query: string } {
  const params = useSearchParams()
  const pass = new URLSearchParams()
  for (const key of [NEXT_PARAM, MISSING_PARAM]) {
    const value = params.get(key)
    if (value !== null) pass.set(key, value)
  }
  const query = pass.toString()
  return { next: safeNext(params.get(NEXT_PARAM)), query: query ? `?${query}` : '' }
}

/** Link mang `?app=` sai (gõ nhầm, app đã mất quyền xem) -> nói rõ trước khi bắt chọn lại. */
export function ChooseAppNotice() {
  const t = useTranslations('orgs')
  const missing = useSearchParams().get(MISSING_PARAM)
  if (missing === null) return null
  return (
    <Alert className="mb-4 bg-[var(--solar)]/10">
      <TriangleAlert className="text-[var(--solar)]" />
      <AlertDescription>
        {t.rich('missingApp', { app: missing, mono: (chunks) => <span className="font-mono">{chunks}</span> })}
      </AlertDescription>
    </Alert>
  )
}
