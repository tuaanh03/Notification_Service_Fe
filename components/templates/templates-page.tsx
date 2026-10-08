'use client'
import { FilePlus2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAppRouter } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useRole } from '@/components/role-context'
import { useApp } from '@/components/app-context'
import { TemplatesTable } from './templates-table'

/**
 * Danh sách template của app (ADR-0020). Admin soạn và xuất bản ở đây; app service chỉ gửi thư bằng
 * `templateId` của bản đã xuất bản — không có đường nào để app tạo / sửa template, nên không có
 * "Import từ API". "Nhờ AI" nằm trong màn soạn (sinh HTML thật), không phải ở danh sách.
 */
export function TemplatesPage() {
  const tt = useTranslations('templates')
  const router = useAppRouter()
  const { app } = useApp()
  const writable = useRole().canManage(app)
  return (
    <>
      <PageHeader
        title={tt('title')}
        subtitle={tt('subtitle')}
        actions={
          writable ? (
            <Button onClick={() => router.push('/templates/new')}>
              <FilePlus2 /> {tt('create')}
            </Button>
          ) : undefined
        }
      />
      <TemplatesTable />
    </>
  )
}
