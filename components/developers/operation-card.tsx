'use client'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CodeBlock } from '@/components/code-block'
import { Panel } from '@/components/panel'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  bodySampleOf,
  curlOf,
  errorsOf,
  fieldRows,
  jsonSchemaOf,
  parametersOf,
  responsesOf,
  typeLabel,
  type Constraint,
  type FieldRow,
  type OpenApiDoc,
  type Operation,
} from '@/lib/openapi'
import { TABLE_HEADER_CLASS } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Màu phương thức — token Cosmic: đọc xanh, tạo lục, sửa vàng, xoá đỏ. */
const METHOD_COLOR: Record<string, string> = {
  get: 'var(--starlight)',
  head: 'var(--starlight)',
  post: 'var(--aurora)',
  put: 'var(--solar)',
  patch: 'var(--solar)',
  delete: 'var(--supernova)',
}

/**
 * Một route của spec: dòng đầu (phương thức · đường dẫn · quyền · scope PAT) mở ra tham số, body (bảng field + JSON
 * mẫu), response, mã lỗi và lệnh curl. Phần thân chỉ dựng khi mở — trang có vài trăm route.
 */
export function OperationCard({ spec, operation: o }: { spec: OpenApiDoc; operation: Operation }) {
  const t = useTranslations('developers')
  const permission = o.op['x-ews-permission']
  const scope = o.op['x-ews-pat-scope']
  const sessionOnly = o.op['x-ews-session-only'] === true
  return (
    <Panel className="overflow-hidden">
      <Collapsible>
        <CollapsibleTrigger className="group/op flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-[var(--orbit)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--starlight)]">
          <ChevronRight className="size-4 shrink-0 text-[var(--text-secondary)] transition-transform group-data-[panel-open]/op:rotate-90" />
          <MethodBadge method={o.method} />
          <code className={cn('min-w-0 break-all font-mono text-xs', o.op.deprecated && 'line-through')}>{o.path}</code>
          {o.op.summary && <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)] max-sm:basis-full">{o.op.summary}</span>}
          <span className="ml-auto flex shrink-0 flex-wrap gap-1.5">
            {sessionOnly && <Tag tone="var(--solar)">{t('sessionOnly')}</Tag>}
            {!sessionOnly && scope && <Tag mono>{`pat:${scope}`}</Tag>}
            {permission && <Tag mono>{permission}</Tag>}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <OperationBody spec={spec} operation={o} />
        </CollapsibleContent>
      </Collapsible>
    </Panel>
  )
}

function OperationBody({ spec, operation: o }: { spec: OpenApiDoc; operation: Operation }) {
  const t = useTranslations('developers')
  const params = parametersOf(spec, o.op)
  const bodySchema = jsonSchemaOf(o.op.requestBody?.content)
  const body = bodySampleOf(spec, o.op)
  const responses = responsesOf(spec, o.op)
  const success = responses.filter((r) => r.status.startsWith('2'))
  const errors = errorsOf(o.op)
  const dto = o.op['x-ews-dto']
  return (
    <div className="space-y-5 border-t border-[var(--orbit)] px-4 py-4">
      {o.op.description && <p className="whitespace-pre-line text-xs text-[var(--text-secondary)]">{o.op.description}</p>}
      {o.op['x-ews-session-only'] === true && <p className="text-xs text-[var(--solar)]">{t('sessionOnlyLong')}</p>}

      {params.length > 0 && (
        <Block title={t('params')}>
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className={TABLE_HEADER_CLASS}>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-2">{t('colName')}</TableHead>
                  <TableHead className="px-2">{t('colIn')}</TableHead>
                  <TableHead className="px-2">{t('colType')}</TableHead>
                  <TableHead className="px-2">{t('colDescription')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((p) => (
                  <TableRow key={`${p.in}:${p.name}`} className="border-[var(--orbit)]">
                    <TableCell className="px-2 font-mono">
                      {p.name}
                      {p.required && <span className="text-[var(--supernova)]"> *</span>}
                    </TableCell>
                    <TableCell className="px-2 font-mono text-[var(--text-secondary)]">{p.in}</TableCell>
                    <TableCell className="px-2 font-mono whitespace-normal">{p.schema ? typeLabel(spec, p.schema) : '—'}</TableCell>
                    <TableCell className="min-w-48 px-2 whitespace-normal text-[var(--text-secondary)]">{p.description ?? p.schema?.description ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Block>
      )}

      {bodySchema && (
        <Block title={t('body')}>
          <Fields rows={fieldRows(spec, bodySchema)} />
          {body !== undefined && (
            <div className="mt-3">
              <CodeBlock language="json" value={JSON.stringify(body, null, 2)} />
            </div>
          )}
        </Block>
      )}

      <Block title={t('responses')}>
        <ul className="space-y-3 text-xs">
          {success.map(({ status, response }) => {
            const schema = jsonSchemaOf(response.content)
            return (
              <li key={status} className="space-y-2">
                <p>
                  <span className="font-mono font-semibold text-[var(--aurora)]">{status}</span>
                  {response.description && <span className="text-[var(--text-secondary)]"> · {response.description}</span>}
                  {!schema && dto && <span className="font-mono text-[var(--text-muted)]"> · {dto}</span>}
                </p>
                {schema && <Fields rows={fieldRows(spec, schema)} />}
              </li>
            )
          })}
          {success.length === 0 && <li className="text-[var(--text-muted)]">—</li>}
        </ul>
      </Block>

      {errors.length > 0 && (
        <Block title={t('errors')}>
          <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {errors.map((e) => (
              <li key={`${e.status}:${e.code}`} className="flex gap-2 font-mono">
                <span className="tabular-nums text-[var(--supernova)]">{e.status}</span>
                <span className="break-all">{e.code}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Route chỉ nhận phiên: curl mang PAT sẽ bị 403 `SESSION_REQUIRED` — không dạy lệnh không chạy được. */}
      {o.op['x-ews-session-only'] !== true && (
        <Block title="curl">
          <CodeBlock language="bash" value={curlOf(spec, o)} />
        </Block>
      )}
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</h3>
      {children}
    </section>
  )
}

/** Bảng field trải phẳng (`a.b`, `items[].c`) — thụt theo tầng, `*` = bắt buộc. */
function Fields({ rows }: { rows: FieldRow[] }) {
  const t = useTranslations('developers')
  if (rows.length === 0) return null
  const constraint = (c: Constraint) =>
    c.kind === 'length'
      ? t('cLength', { v: c.value })
      : c.kind === 'range'
        ? t('cRange', { v: c.value })
        : c.kind === 'items'
          ? t('cItems', { v: c.value })
          : c.kind === 'default'
            ? t('cDefault', { v: c.value })
            : t('cPattern', { v: c.value })
  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader className={TABLE_HEADER_CLASS}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-2">{t('colField')}</TableHead>
            <TableHead className="px-2">{t('colType')}</TableHead>
            <TableHead className="px-2">{t('colDescription')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.path} className="border-[var(--orbit)]">
              <TableCell className="px-2 font-mono" style={{ paddingLeft: `${0.5 + r.depth * 0.75}rem` }}>
                {r.path}
                {r.required && <span className="text-[var(--supernova)]"> *</span>}
              </TableCell>
              <TableCell className="max-w-64 px-2 font-mono whitespace-normal break-words">{r.type}</TableCell>
              <TableCell className="min-w-48 px-2 whitespace-normal text-[var(--text-secondary)]">
                {r.description}
                {r.constraints.length > 0 && (
                  <span className="block font-mono text-[11px] text-[var(--text-muted)]">{r.constraints.map(constraint).join(' · ')}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLOR[method] ?? 'var(--text-secondary)'
  return (
    <span
      className="inline-flex w-14 shrink-0 justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 33%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` }}
    >
      {method}
    </span>
  )
}

function Tag({ children, mono, tone }: { children: React.ReactNode; mono?: boolean; tone?: string }) {
  return (
    <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px]', mono && 'font-mono')} style={tone ? { color: tone } : { color: 'var(--text-secondary)' }}>
      {children}
    </span>
  )
}
