import { PlugZap } from 'lucide-react'
import { CosmicBackground } from './cosmic-background'
import { EmptyState } from './empty-state'
import { Panel } from './panel'

/**
 * Không có app nào để quản trị, hoặc không đọc được `/admin/apps`.
 *
 * Cố ý KHÔNG render `<AppShell>`: mọi màn bên trong đều cần một app đang chọn, nên một
 * shell đầy đủ với bảng trống sẽ khiến người trực tưởng dữ liệu rỗng chứ không phải
 * hỏng kết nối. Lỗi hạ tầng phải nói ra, không nuốt.
 */
export function NoAppsScreen({ error }: { error: string | null }) {
  return (
    <>
      <CosmicBackground />
      <div className="relative flex min-h-dvh items-center justify-center px-4">
        <Panel className="w-full max-w-md px-6">
          <EmptyState
            icon={PlugZap}
            title={error ? 'Không đọc được danh sách app' : 'Chưa có app nào'}
            description={
              error ??
              'Org này chưa có app service nào. Đăng ký app đầu tiên để bắt đầu quản trị EWS Notification Service.'
            }
          />
        </Panel>
      </div>
    </>
  )
}
