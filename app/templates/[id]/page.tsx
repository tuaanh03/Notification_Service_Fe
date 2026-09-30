import { TemplateEditor } from '@/components/templates/template-editor'

// Server page: await params rồi render client component (CLAUDE.md §2).
// `key` theo app + id: đổi template là dựng lại từ đầu, không mang nội dung đang soạn của template trước sang.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ app?: string | string[] }>
}) {
  const { id } = await params
  const { app } = await searchParams
  const templateId = decodeURIComponent(id)
  const appSlug = typeof app === 'string' ? app : null
  return <TemplateEditor key={`${appSlug}:${templateId}`} templateId={templateId} />
}
