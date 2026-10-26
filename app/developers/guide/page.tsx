import { getLocale, getTranslations } from 'next-intl/server'
import { GUIDE_EN } from '@/components/developers/guide/guide-en'
import { GUIDE_VI } from '@/components/developers/guide/guide-vi'
import { GuidePage } from '@/components/developers/guide/guide-page'
import { toLocale } from '@/i18n/locales'

/**
 * `/developers/guide` — hướng dẫn tích hợp cho đội app: API `/v1`, webhook gửi đi / nhận vào, PAT. Nội dung tĩnh viết
 * trong code (mỗi ngôn ngữ một file, cùng `id` mục), không gọi backend. Không thuộc app nào (`isAccountRoute`).
 */
export default async function Page() {
  const locale = toLocale(await getLocale())
  const t = await getTranslations('developers')
  return <GuidePage doc={locale === 'en' ? GUIDE_EN : GUIDE_VI} labels={{ reference: t('toReference'), tokens: t('toTokens') }} />
}
