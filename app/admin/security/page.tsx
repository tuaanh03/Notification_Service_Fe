import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { LoginSecurityPanel } from '@/components/admin/login-security-panel'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { describeError } from '@/lib/api/error-message'
import { listLoginLocks } from '@/lib/api/login-security'
import { ApiError } from '@/lib/api/problem'
import { getSystemSettings } from '@/lib/api/system-settings'

/**
 * Theo dõi & Bảo mật (ADR-0039 của backend) — quy tắc chặn đăng nhập sai (cài đặt hệ thống nhóm `auth.*`) và các
 * khoá đang giữ. Đọc ở server bằng phiên của Super Admin.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const [settings, locks] = await Promise.all([getSystemSettings(), listLoginLocks()])
    return <LoginSecurityPanel initialSettings={settings} initialLocks={locks} />
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    const t = await getTranslations('security')
    return (
      <>
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel className="overflow-hidden">
          <EmptyState icon={PlugZap} title={t('loadFailed')} description={await describeError(err)} />
        </Panel>
      </>
    )
  }
}
