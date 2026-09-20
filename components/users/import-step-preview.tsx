'use client'
import { Download } from 'lucide-react'
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
  const p = importPreview
  const counts = [
    ['Tạo mới', p.createdTotal, 'text-[var(--aurora)]'],
    ['Trùng — sẽ gộp', p.mergedTotal, 'text-[var(--pulsar)]'],
    ['Mâu thuẫn', p.conflicts.length, 'text-[var(--supernova)]'],
    ['Lỗi', p.errors.length, 'text-[var(--solar)]'],
  ] as const
  return (
    <div className="space-y-4">
      <p className="font-mono text-sm text-[var(--solar)]" data-testid="dry-run-line">
        Chưa ghi gì vào hệ thống. Bấm Xác nhận mới ghi.
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
          <TabsTrigger value="created">Tạo mới</TabsTrigger>
          <TabsTrigger value="merged">Sẽ gộp</TabsTrigger>
          <TabsTrigger value="conflicts">Mâu thuẫn</TabsTrigger>
          <TabsTrigger value="errors">Lỗi</TabsTrigger>
        </TabsList>
        <TabsContent value="created" className="overflow-x-auto">
          <Table className="text-[13px]">
            <Head cols={['#', 'external_id', 'full_name', 'email', 'phone', 'Sinh subscription']} />
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
          <p className="p-3 text-xs text-[var(--text-muted)]">… và {p.createdTotal - p.created.length} dòng nữa</p>
        </TabsContent>
        <TabsContent value="merged" className="overflow-x-auto">
          <Table className="text-[13px]">
            <Head cols={['#', 'Dòng trong file', 'Khớp user', 'Khoá khớp (thứ tự ưu tiên)']} />
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
              Hệ thống không tự gộp khi mâu thuẫn. Người quyết, và quyết định được ghi audit.
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
                  <span className="font-mono">email {r.email}</span> thuộc <span className="font-mono text-[var(--starlight)]">A = {r.user_a}</span> ·{' '}
                  <span className="font-mono">phone {r.phone}</span> thuộc <span className="font-mono text-[var(--pulsar)]">B = {r.user_b}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  <ToggleGroup variant="outline" size="sm" value={d.choice ? [d.choice] : []} onValueChange={(v) => onDecide(r.line, { ...d, choice: v[0] as ConflictDecision['choice'] })}>
                    <ToggleGroupItem value="A">Gộp vào A</ToggleGroupItem>
                    <ToggleGroupItem value="B">Gộp vào B</ToggleGroupItem>
                    <ToggleGroupItem value="skip">Bỏ qua dòng này</ToggleGroupItem>
                  </ToggleGroup>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`note-${r.line}`} className="text-xs">
                      Ghi chú quyết định <span className="text-[var(--supernova)]">*</span>
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
              <Head cols={['Dòng', 'Lý do']} />
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
          <Button variant="outline" size="sm" onClick={() => toast.success('Đang tải users-errors.csv', { description: `${p.errors.length} dòng lỗi` })}>
            <Download /> Tải file lỗi
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
