import { PlugZap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { LoginSecurityPanel } from '@/components/admin/login-security-panel'
import { PatAdminPanel } from '@/components/admin/pat-admin-panel'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { describeError } from '@/lib/api/error-message'
import { listLoginLocks } from '@/lib/api/login-security'
import { ApiError } from '@/lib/api/problem'
import { getSystemSettings } from '@/lib/api/system-settings'
import { searchAudit } from '@/lib/api/audit'
import { listAllTokens } from '@/lib/api/tokens'
import type { SecurityActivity } from '@/components/admin/login-security-panel'

/**
 * Theo dõi & Bảo mật (ADR-0039 của backend) — quy tắc chặn đăng nhập sai (cài đặt hệ thống nhóm `auth.*`) và các
 * khoá đang giữ. Đọc ở server bằng phiên của Super Admin.
 */
export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const [settings, locks, activity, tokens] = await Promise.all([getSystemSettings(), listLoginLocks(), securityActivity(), activeTokens()])
    return (
      <>
        <LoginSecurityPanel initialSettings={settings} initialLocks={locks} activity={activity} />
        <PatAdminPanel initial={tokens.ok ? tokens.data : []} error={tokens.ok ? null : tokens.error} />
      </>
    )
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

/**
 * Khối "24 giờ qua": số lần khoá tạm / khoá hẳn / mở khoá + 5 dòng gần nhất, đọc từ nhật ký chung. Nhật ký hỏng thì
 * trả `null` — màn vẫn mở được bảng khoá và quy tắc (khối này chỉ để theo dõi, không chặn việc mở khoá).
 */
async function securityActivity(): Promise<SecurityActivity | null> {
  const from = new Date(Date.now() - 864e5).toISOString()
  const count = async (action: string) => (await searchAudit({ actions: [action], from, limit: 1 })).total
  try {
    const [locked, permanent, unlocked, recent] = await Promise.all([
      count('LoginLocked'),
      count('AdminLocked'),
      count('LoginUnlocked'),
      searchAudit({ actions: ['LoginLocked', 'AdminLocked', 'LoginUnlocked'], from, limit: 5 }),
    ])
    return { locked, permanent, unlocked, recent: recent.items }
  } catch {
    return null
  }
}

/**
 * PAT đang hoạt động của mọi người (ADR-0041 §9). Hỏng thì khối PAT hiện mã lỗi, phần khoá đăng nhập vẫn dùng được —
 * dập token lộ và mở khoá đăng nhập là hai việc độc lập.
 */
async function activeTokens(): Promise<{ ok: true; data: Awaited<ReturnType<typeof listAllTokens>> } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await listAllTokens('active') }
  } catch (err) {
    if (!(err instanceof ApiError)) throw err
    return { ok: false, error: await describeError(err) }
  }
}
