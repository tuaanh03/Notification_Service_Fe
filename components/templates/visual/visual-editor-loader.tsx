'use client'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

function Loading() {
  const t = useTranslations('visualEditor')
  return <p className="grid h-full place-items-center text-sm text-[var(--text-muted)]">{t('loading')}</p>
}

/**
 * Bộ soạn trực quan nạp ĐỘNG, chỉ ở trình duyệt: GrapesJS + grapesjs-mjml (~650 KB nén) không vào gói của trang
 * khác, và không chạy lúc render phía server (GrapesJS cần `window`).
 */
export const VisualEditorLoader = dynamic(() => import('./visual-editor'), { ssr: false, loading: Loading })
