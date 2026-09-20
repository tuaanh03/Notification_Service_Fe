import { CodeBlock } from '@/components/code-block'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SYNC_PAYLOAD, fmtIso, syncStatuses } from '@/lib/mock-data'

/** UC-002 §E — sync danh bạ từ App Service, read-only. */
export function SyncPanel() {
  return (
    <>
      <PageHeader title="Sync danh bạ" subtitle="Lần sync gần nhất từng app — chỉ xem" />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="min-w-0 overflow-hidden">
          <Table className="text-[13px]">
            <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <TableRow className="hover:bg-transparent">
                {['App', 'Mode', 'synced_at', 'Số user', 'Membership group'].map((h) => (
                  <TableHead key={h} className="px-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncStatuses.map((s) => (
                <TableRow key={s.app} className="h-11 border-[var(--orbit)]">
                  <TableCell className="px-3 font-mono text-xs">{s.app}</TableCell>
                  <TableCell className="px-3">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {s.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 font-mono text-xs tabular-nums">{fmtIso(s.synced_at)}</TableCell>
                  <TableCell className="px-3 text-right font-mono text-xs tabular-nums">{s.users}</TableCell>
                  <TableCell className="px-3 text-right font-mono text-xs tabular-nums">{s.groups}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <div className="min-w-0 space-y-4">
          <CodeBlock language="json" value={SYNC_PAYLOAD} />
          <Alert className="border-[var(--solar)]/30 bg-[var(--solar)]/[.06]">
            <AlertDescription className="text-[var(--solar)]">
              Sync danh bạ không xoá bản ghi tắt nhận tin. Người đã tắt vẫn bị trừ ra lúc gửi.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  )
}
