'use client'
import { useState, useTransition } from 'react'
import { FilePlus2 } from 'lucide-react'
import { createTemplateAction } from '@/app/templates/actions'
import { useApp } from '@/components/app-context'
import { useAppRouter } from '@/components/app-link'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Tạo template: chỉ cần TÊN. Backend tạo kèm bản nháp v1 rỗng, trả `id` — soạn tiếp ở màn chi tiết.
 * Không có ô "mã template (key)": app gửi bằng `templateId` do hệ thống sinh (ADR-0020).
 */
export function TemplateCreate() {
  const { app } = useApp()
  const router = useAppRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const create = () =>
    startTransition(async () => {
      const result = await createTemplateAction(app.app_id, { name: name.trim() })
      if (result.ok) router.replace(`/templates/${result.data.id}`)
      else setError(`${result.message} (mã: ${result.code})`)
    })

  return (
    <>
      <PageHeader title="Tạo template" breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: 'Tạo mới' }]} />
      <Panel className="max-w-xl space-y-4 p-5">
        {error && (
          <Alert variant="destructive" className="bg-[var(--supernova)]/10">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) create()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-tpl-name" className="text-xs font-semibold">Tên template</Label>
            <Input
              id="new-tpl-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              maxLength={200}
              placeholder="vd: Cảnh báo VM quá tải"
              autoFocus
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Không trùng với template khác trong app — kể cả chỉ khác hoa thường hoặc dấu. Mã để app gửi do hệ thống sinh.
            </p>
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            <FilePlus2 /> {pending ? 'Đang tạo…' : 'Tạo và soạn nội dung'}
          </Button>
        </form>
      </Panel>
    </>
  )
}
