'use client'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MERGE_KEY_ORDER, importPreview, subscriptionsFromRow, userById } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export type ConflictDecision = { choice?: 'A' | 'B' | 'skip'; note: string }

function Head({ cols }: { cols: string[] }) {
  return (
    <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
      <TableRow className="hover:bg-transparent">
        {cols.map((c) => (
          <TableHead key={c} className="px-3">
            {c}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}
const cell = 'px-3 font-mono text-xs'

/** Bước 2 — preview chưa ghi DB; 4 tab; mâu thuẫn KHÔNG có nút auto-merge, người quyết + ghi audit. */
export function ImportStepPreview({
  decisions,
  onDecide,
}: {
  decisions: Record<number, ConflictDecision>
  onDecide: (line: number, next: ConflictDecision) => void
}) {
  const t = useTranslations('import')
  const mono = (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>
  const p = importPreview
  const counts = [
    [t('created'), p.createdTotal, 'text-[var(--aurora)]'],
    [t('willMerge'), p.mergedTotal, 'text-[var(--pulsar)]'],
    [t('conflicts'), p.conflicts.length, 'text-[var(--supernova)]'],
    [t('errors'), p.errors.length, 'text-[var(--solar)]'],
  ] as const
  return (
    <div className="space-y-4">
      <p className="font-mono text-sm text-[var(--solar)]" data-testid="dry-run-line">
        {t('dryRun')}
      </p>
      <div className="grid gap-3 sm:grid-cols-4" data-testid="import-counts">
        {counts.map(([label, n, tone]) => (
          <div key={label} className="rounded-lg border border-[var(--orbit)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">{label}</p>
            <p className={cn('mt-1 font-mono text-2xl tabular-nums', tone)}>{n}</p>
          </div>
        ))}
      </div>
      <Tabs defaultValue="created">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="created">{t('created')}</TabsTrigger>
          <TabsTrigger value="merged">{t('tabMerge')}</TabsTrigger>
          <TabsTrigger value="conflicts">{t('conflicts')}</TabsTrigger>
          <TabsTrigger value="errors">{t('errors')}</TabsTrigger>
        </TabsList>
        <TabsContent value="created" className="overflow-x-auto">
          <Table className="text-[13px]">
            <Head cols={['#', 'external_id', 'full_name', 'email', 'phone', t('colSubscriptions')]} />
            <TableBody>
              {p.created.map((r) => {
                const s = subscriptionsFromRow(r)
                return (
                  <TableRow key={r.line} className="h-11 border-[var(--orbit)]">
                    <TableCell className={cell}>{r.line}</TableCell>
                    <TableCell className={cell}>{r.external_id}</TableCell>
                    <TableCell className="px-3 text-xs">{r.full_name}</TableCell>
                    <TableCell className={cell}>{r.email ?? '—'}</TableCell>
                    <TableCell className={cell}>{r.phone ?? '—'}</TableCell>
                    <TableCell className={cell}>
                      {s.channels.join(' + ')} → {s.count}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <p className="p-3 text-xs text-[var(--text-muted)]">{t('more', { count: p.createdTotal - p.created.length })}</p>
        </TabsContent>
        <TabsContent value="merged" className="overflow-x-auto">
          <Table className="text-[13px]">
            <Head cols={['#', t('colFileRow'), t('colMatchedUser'), t('colMatchKey')]} />
            <TableBody>
              {p.merged.map((r) => (
                <TableRow key={r.line} className="h-11 border-[var(--orbit)]">
                  <TableCell className={cell}>{r.line}</TableCell>
                  <TableCell className={cell}>
                    {r.external_id} · {r.full_name}
                  </TableCell>
                  <TableCell className={cell}>
                    {r.matched_user} <span className="text-[var(--text-muted)]">({userById(r.matched_user)?.name})</span>
                  </TableCell>
                  <TableCell className="px-3">
                    {/* chip trail theo thứ tự external_id → email → phone → device token; khoá khớp sáng */}
                    <span className="flex flex-wrap items-center gap-1" data-testid="key-trail">
                      {MERGE_KEY_ORDER.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn('font-mono text-[10px]', k === r.matched_key ? 'border-[var(--pulsar)] text-[var(--pulsar)]' : 'text-[var(--text-muted)]')}
                            data-matched={k === r.matched_key}
                          >
                            {i + 1}·{k}
                          </Badge>
                          {i < MERGE_KEY_ORDER.length - 1 && <span className="text-[var(--text-muted)]">→</span>}
                        </span>
                      ))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="conflicts" className="space-y-3">
          <Alert className="border-[var(--supernova)]/30 bg-[var(--supernova)]/[.06]">
            <AlertDescription className="text-[var(--supernova)]">
              {t('noAutoMerge')}
            </AlertDescription>
          </Alert>
          {p.conflicts.map((r) => {
            const d = decisions[r.line] ?? { note: '' }
            return (
              <div key={r.line} className="rounded-lg border border-[var(--supernova)]/40 bg-[var(--supernova)]/[.04] p-3" data-testid="conflict-row">
                <p className="font-mono text-xs">
                  #{r.line} · {r.external_id} · {r.full_name}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {t.rich('conflictLine', {
                    email: r.email ?? '',
                    phone: r.phone ?? '',
                    a: r.user_a,
                    b: r.user_b,
                    mono,
                    userA: (chunks) => <span className="font-mono text-[var(--starlight)]">{chunks}</span>,
                    userB: (chunks) => <span className="font-mono text-[var(--pulsar)]">{chunks}</span>,
                  })}
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  <ToggleGroup variant="outline" size="sm" value={d.choice ? [d.choice] : []} onValueChange={(v) => onDecide(r.line, { ...d, choice: v[0] as ConflictDecision['choice'] })}>
                    <ToggleGroupItem value="A">{t('mergeA')}</ToggleGroupItem>
                    <ToggleGroupItem value="B">{t('mergeB')}</ToggleGroupItem>
                    <ToggleGroupItem value="skip">{t('skipRow')}</ToggleGroupItem>
                  </ToggleGroup>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`note-${r.line}`} className="text-xs">
                      {t('decisionNote')} <span className="text-[var(--supernova)]">*</span>
                    </Label>
                    <Textarea id={`note-${r.line}`} value={d.note} onChange={(e) => onDecide(r.line, { ...d, note: e.target.value })} className="min-h-16" />
                  </div>
                </div>
              </div>
            )
          })}
        </TabsContent>
        <TabsContent value="errors" className="space-y-3">
          <div className="overflow-x-auto">
            <Table className="text-[13px]">
              <Head cols={[t('colLine'), t('colReason')]} />
              <TableBody>
                {p.errors.map((r) => (
                  <TableRow key={r.line} className="h-11 border-[var(--orbit)]">
                    <TableCell className={cell}>{r.line}</TableCell>
                    <TableCell className="px-3 text-xs text-[var(--solar)]">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success(t('downloadingErrors'), { description: t('errorRows', { count: p.errors.length }) })}>
            <Download /> {t('downloadErrors')}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
