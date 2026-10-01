'use client'

import { TriangleAlert } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { isPreviewRoute } from '@/lib/preview-routes'

/**
 * Dải băng cho màn CHƯA đấu backend — số trên màn là mock (`lib/mock-data.ts`).
 *
 * Vì sao cần: console là công cụ vận hành, một màn quản trị hiện số giả mà không nói gì thì tệ
 * hơn là không có màn đó (ĐX-0002 Việc 1). CỐ Ý không có nút tắt: tắt được là tắt xong quên mất.
 *
 * Render đúng một lần trong `<AppShell>`, tự ẩn ở route đã đấu — page không tự gắn.
 */
export function PreviewBanner() {
  const pathname = usePathname()
  const t = useTranslations('preview')
  if (!isPreviewRoute(pathname)) return null

  return (
    <Alert className="mb-5 border-[var(--solar)]/40 bg-[var(--solar)]/10">
      <TriangleAlert className="text-[var(--solar)]" />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription>{t('body')}</AlertDescription>
    </Alert>
  )
}
