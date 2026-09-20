'use client'

import { ArrowRight, History } from 'lucide-react'
import { SourceBadge } from '@/components/source-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { userAudit, type AuditEntry } from '@/lib/mock-data'

interface Props {
  userId: string
}

export function EventLogPanel({ userId }: Props) {
  const entries: AuditEntry[] = userAudit(userId)

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">Event Log & Audit Trail</h3>
        <p className="text-xs text-muted-foreground">
          Lịch sử các sự kiện định danh, đăng ký kênh nhận, gửi tin và thay đổi trạng thái của người dùng.
        </p>
      </div>

      <div className="rounded-lg border border-border/70 overflow-hidden bg-background">
        <Table className="text-xs">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-40 font-semibold text-foreground">Thời gian</TableHead>
              <TableHead className="font-semibold text-foreground">Sự kiện</TableHead>
              <TableHead className="w-36 font-semibold text-foreground">Tác nhân</TableHead>
              <TableHead className="font-semibold text-foreground">Chi tiết</TableHead>
              <TableHead className="w-28 font-semibold text-foreground">Nguồn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <History className="size-5 text-muted-foreground/60" />
                    <span>Chưa có lịch sử sự kiện nào được ghi nhận.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e, i) => (
                <TableRow key={i} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {e.timestamp}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {e.action}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[var(--starlight)]">
                    {e.actor}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.from ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-muted-foreground">{e.from}</span>
                        <ArrowRight className="size-3 text-muted-foreground/70" />
                        <span className="text-foreground font-medium">{e.to}</span>
                      </span>
                    ) : (
                      <span>{e.to ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={e.source} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
