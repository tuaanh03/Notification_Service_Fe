import { TemplateEditor } from '@/components/templates/template-editor'

// Server page: await params/searchParams rồi render client component (CLAUDE.md §2).
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ ai?: string; new?: string }>
}) {
  const { key } = await params
  const { ai, new: isNewParam } = await searchParams
  const decodedKey = decodeURIComponent(key)
  return (
    <TemplateEditor
      templateKey={decodedKey}
      aiPrompt={ai}
      isNew={decodedKey === 'new' || isNewParam === '1'}
    />
  )
}
