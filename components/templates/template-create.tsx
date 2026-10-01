'use client'
import { useState, useTransition } from 'react'
import { FilePlus2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const tt = useTranslations('templates')
  const te = useTranslations('errors')
  const { app } = useApp()
  const router = useAppRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const create = () =>
    startTransition(async () => {
      const result = await createTemplateAction(app.app_id, { name: name.trim() })
      if (result.ok) router.replace(`/templates/${result.data.id}`)
      else setError(te('withCode', { message: result.message, code: result.code }))
    })

  return (
    <>
      <PageHeader
        title={tt('newTitle')}
        breadcrumb={[{ label: tt('title'), href: '/templates' }, { label: tt('newCrumb') }]}
      />
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
            <Label htmlFor="new-tpl-name" className="text-xs font-semibold">{tt('name')}</Label>
            <Input
              id="new-tpl-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              maxLength={200}
              placeholder={tt('namePlaceholder')}
              autoFocus
            />
            <p className="text-[11px] text-[var(--text-muted)]">{tt('nameHint')}</p>
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            <FilePlus2 /> {pending ? tt('creating') : tt('createAndEdit')}
          </Button>
        </form>
      </Panel>
    </>
  )
}
