import { PlugZap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AppLink } from './app-link'
import { CosmicBackground } from './cosmic-background'
import { EmptyState } from './empty-state'
import { Panel } from './panel'
import { Button } from '@/components/ui/button'

/**
 * Không có app nào để quản trị, hoặc không đọc được `/admin/apps`.
 *
 * Cố ý KHÔNG render `<AppShell>`: mọi màn bên trong đều cần một app đang chọn, nên một
 * shell đầy đủ với bảng trống sẽ khiến người trực tưởng dữ liệu rỗng chứ không phải
 * hỏng kết nối. Lỗi hạ tầng phải nói ra, không nuốt.
 *
 * Nút "Đăng ký app đầu tiên" CHỈ hiện khi `error === null`. Đang lỗi mà vẫn mời tạo app là mời
 * tạo trùng: danh sách rỗng lúc đó không có nghĩa là tổ chức chưa có app, chỉ nghĩa là chưa đọc
 * được. Đây cũng là lý do `error` quyết định màn hình chứ không chỉ quyết định dòng chữ.
 */
export function NoAppsScreen({ error }: { error: string | null }) {
  const t = useTranslations('noApps')
  return (
    <>
      <CosmicBackground />
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <Panel className="w-full max-w-md px-6">
          <EmptyState
            icon={PlugZap}
            title={error ? t('errorTitle') : t('emptyTitle')}
            description={
error ?? t('emptyBody')
            }
            action={
              error ? undefined : (
                <Button render={<AppLink href="/apps/new" />}>{t('registerFirst')}</Button>
              )
            }
          />
        </Panel>
      </div>
    </>
  )
}
