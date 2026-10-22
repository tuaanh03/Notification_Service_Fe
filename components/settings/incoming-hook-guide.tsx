'use client'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TABLE_HEADER_CLASS } from '@/lib/theme'
import { loadTemplateVariablesAction, previewIncomingHookAction } from '@/app/settings/webhooks/actions'
import { CodeBlock } from '@/components/code-block'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Field = { name: string; required: boolean; example: string; description: string | null }

/** Tên trường trong body = tên biến bỏ tiền tố `payload.` (`payload.title` -> `title`). */
const fieldOf = (variable: string) => variable.slice('payload.'.length)

/**
 * "Body mẫu" của một incoming webhook (ADR-0030 của backend) theo khuôn chuẩn EWS — không gắn công cụ nào:
 * `POST`, `Content-Type: application/json`, body có trường TRÙNG TÊN biến của template (giá trị mẫu + mô tả
 * lấy từ template). Kèm curl (URL để chỗ trống — URL lấy bằng nút "Sao chép URL") và thư mẫu (backend đổ
 * body mẫu qua `preview`, không gửi gì).
 */
export function IncomingHookGuide({ appId, topicId, templateId }: { appId: string; topicId: string; templateId: string }) {
  const t = useTranslations('incoming')
  const [fields, setFields] = useState<Field[] | null>(null)
  const [published, setPublished] = useState(true)
  const [mail, setMail] = useState<{ subject: string; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setFields(null)
    setMail(null)
    void (async () => {
      const vars = await loadTemplateVariablesAction(appId, templateId)
      if (!alive) return
      if (!vars.ok) return setError(vars.message)
      setPublished(vars.data.version !== null)
      const list = vars.data.variables.map((v) => ({
        name: fieldOf(v.name),
        required: v.required,
        example: v.sample?.trim() ? v.sample : t('exampleValue', { field: fieldOf(v.name) }),
        description: v.description?.trim() ? v.description : null,
      }))
      setFields(list)
      if (vars.data.version === null) return
      const preview = await previewIncomingHookAction(appId, {
        config: { name: 'guide', topicId, templateId, mappings: [], dedupePath: null, condition: null },
        sample: Object.fromEntries(list.map((f) => [f.name, f.example])),
      })
      if (alive && preview.ok && preview.data.rendered) {
        setMail({ subject: preview.data.rendered.subject, text: preview.data.rendered.text })
      }
    })()
    return () => {
      alive = false
    }
  }, [appId, topicId, templateId, t])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (fields === null) return null

  const sample = Object.fromEntries(fields.map((f) => [f.name, f.example]))
  const hasMeaning = fields.some((f) => f.description !== null)
  const curl = `curl -X POST '${t('urlPlaceholder')}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(sample)}'`

  return (
    <div className="space-y-3 text-xs">
      <p className="font-mono text-[var(--text-secondary)]">POST · Content-Type: application/json</p>
      {!published && (
        <Alert>
          <AlertDescription>{t('guideUnpublished')}</AlertDescription>
        </Alert>
      )}
      <CodeBlock language="json" value={JSON.stringify(sample, null, 2)} />
      {fields.length === 0 ? (
        <p className="text-[var(--text-secondary)]">{t('noFields')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-2">{t('colField')}</TableHead>
                <TableHead className="px-2" />
                {hasMeaning && <TableHead className="px-2">{t('colMeaning')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.name} className="border-[var(--orbit)]">
                  <TableCell className="px-2 font-mono text-[var(--starlight)]">{f.name}</TableCell>
                  <TableCell className="px-2 text-[var(--text-muted)]">{f.required ? t('required') : t('optional')}</TableCell>
                  {hasMeaning && <TableCell className="px-2 whitespace-normal text-[var(--text-secondary)]">{f.description ?? '—'}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Collapsible>
        <CollapsibleTrigger className="group/curl flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-foreground">
          <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]/curl:rotate-90" />
          curl
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2">
            <CodeBlock language="bash" value={curl} />
          </div>
        </CollapsibleContent>
      </Collapsible>
      {mail && (
        <div className="rounded-lg border border-[var(--orbit)] p-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">{t('mailTitle')}</p>
          <p className="mt-1 font-medium">{mail.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--text-secondary)]">{mail.text}</pre>
        </div>
      )}
    </div>
  )
}
