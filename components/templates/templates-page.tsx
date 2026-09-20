'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus2, Sparkles, TerminalSquare } from 'lucide-react'
import { CodeBlock } from '@/components/code-block'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/app-context'
import { AiComposeDialog } from './ai-compose-dialog'
import { TemplatesTable } from './templates-table'

const IMPORT_API = `POST /v1/templates
Authorization: Bearer <access_token>
{ "key": "vm_high_load", "subject": "…", "html": "…", "schema": [ … ] }
→ 201 { "template_id": "tpl_…", "version": "v1", "status": "draft" }
API chỉ tạo draft — người thật vẫn phải xem thử và Xuất bản.`

/** UC-006 §A — 3 action: Tạo template / Nhờ AI soạn / Import từ API (read-only). */
export function TemplatesPage() {
  const router = useRouter()
  const { app } = useApp()
  const [ai, setAi] = useState(false)
  const [apiInfo, setApiInfo] = useState(false)
  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Template ≠ Version ≠ Variable Schema ≠ Binding — không bao giờ gửi email còn {{ }} chưa render"
        actions={
          <>
            <Button onClick={() => router.push('/templates/new?new=1')}>
              <FilePlus2 /> Tạo template
            </Button>
            <Button variant="outline" onClick={() => setAi(true)}>
              <Sparkles /> Nhờ AI soạn
            </Button>
            <Button variant="outline" onClick={() => setApiInfo(true)}>
              <TerminalSquare /> Import từ API
            </Button>
          </>
        }
      />
      <TemplatesTable />
      <AiComposeDialog open={ai} namespace={app.namespace} onClose={() => setAi(false)} onResult={(r) => { setAi(false); router.push(`/templates/ai_draft?ai=${encodeURIComponent(r.prompt)}`) }} />
      <ConfirmDialog open={apiInfo} title="Import từ API" description="Read-only — app service tạo template qua API, dashboard chỉ xem." confirmLabel="Đã hiểu" onConfirm={() => setApiInfo(false)} onCancel={() => setApiInfo(false)}>
        <CodeBlock language="http" value={IMPORT_API} />
      </ConfirmDialog>
    </>
  )
}
