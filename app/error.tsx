'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { unstable_isUnrecognizedActionError } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

/**
 * Lỗi chưa ai bắt trong một trang (gồm lỗi ném từ Server Action trong `startTransition`) — hiện trong khung console
 * thay cho trang trắng "This page couldn't load" của Next.
 *
 * Trường hợp hay gặp nhất: tab mở TỪ TRƯỚC lượt deploy gọi Server Action theo ID của bản cũ, server mới không còn ID
 * đó (`Failed to find Server Action`). Thử lại vô ích — phải tải lại trang để lấy bản mới.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('pageError')
  const stale = unstable_isUnrecognizedActionError(error)
  useEffect(() => {
    if (!stale) console.error(error)
  }, [error, stale])
  return (
    <EmptyState
      icon={stale ? RefreshCw : AlertTriangle}
      title={stale ? t('staleTitle') : t('failedTitle')}
      description={stale ? t('staleBody') : t('failedBody')}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {!stale && (
            <Button variant="outline" onClick={reset}>
              {t('retry')}
            </Button>
          )}
          <Button onClick={() => window.location.reload()}>{t('reload')}</Button>
        </div>
      }
    />
  )
}
