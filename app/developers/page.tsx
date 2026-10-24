import { Code2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { DevelopersPage } from '@/components/developers/developers-page'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { describeError } from '@/lib/api/error-message'
import { getOpenApi } from '@/lib/api/openapi'
import { ApiError } from '@/lib/api/problem'

/**
 * `/developers` — danh sách API dựng từ spec OpenAPI của backend (ADR-0042), theo Cosmic, không nhúng Swagger UI.
 * Không thuộc app nào (`isAccountRoute`). Server Component đọc spec bằng phiên; tìm / mở rộng chạy ở client.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    return <DevelopersPage spec={await getOpenApi()} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('developers')
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel className="overflow-hidden">
          <EmptyState icon={Code2} title={t('loadFailed')} description={await describeError(err)} />
        </Panel>
      </>
    )
  }
}
