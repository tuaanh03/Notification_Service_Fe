'use client'
import { useState } from 'react'
import { PencilLine, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { SourceBadge } from '@/components/source-badge'
import { StatusPill } from '@/components/status-pill'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { maskValue, subscriptionsOf, type Subscription } from '@/lib/mock-data'
import { FixAddressDialog } from './fix-address-dialog'
import { ReEnableDialog } from './re-enable-dialog'

const HEADERS = ['Kênh', 'Giá trị', 'Trạng thái', 'Nguồn', 'Tạo lúc', 'Lỗi gần nhất', '']

/** UC-002 §B2 — một dòng / một điểm nhận; unsubscribed → Bật lại (có bằng chứng), invalid → Sửa địa chỉ. */
export function SubscriptionsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Subscription[]>(() => subscriptionsOf(userId))
  const [reEnable, setReEnable] = useState<Subscription | null>(null)
  const [fixing, setFixing] = useState<Subscription | null>(null)
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">Kênh nhận tin (Subscriptions)</h3>
        <p className="text-xs text-muted-foreground">
          Danh sách các điểm đích nhận thông báo (email, số điện thoại, thiết bị) của người dùng.
        </p>
      </div>

      <div className="rounded-lg border border-border/70 overflow-hidden bg-background">
        <Table className="text-[13px]">
          <TableHeader className="bg-muted/30 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <TableRow className="hover:bg-transparent">
              {HEADERS.map((h, i) => (
                <TableHead key={i} className="px-3">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id} className="h-11 border-border/60 hover:bg-muted/20" data-status={s.status}>
                <TableCell className="px-3 font-mono text-xs">{s.channel}</TableCell>
                <TableCell className="px-3 font-mono text-xs">{maskValue(s.channel, s.value)}</TableCell>
                <TableCell className="px-3">
                  <StatusPill status={s.status} />
                </TableCell>
                <TableCell className="px-3">
                  <SourceBadge source={s.source} />
                </TableCell>
                <TableCell className="px-3 font-mono text-xs tabular-nums">{s.created_at}</TableCell>
                <TableCell className="px-3 font-mono text-xs text-[var(--solar)]">{s.error ?? '—'}</TableCell>
                <TableCell className="px-3 text-right">
                  {/* UC-007 BR-9: hai trạng thái, hai hành động khác nhau — không toggle trơn */}
                  {s.status === 'unsubscribed' && (
                    <Button variant="outline" size="xs" onClick={() => setReEnable(s)}>
                      <RotateCcw /> Bật lại
                    </Button>
                  )}
                  {s.status === 'invalid' && (
                    <Button variant="outline" size="xs" onClick={() => setFixing(s)}>
                      <PencilLine /> Sửa địa chỉ
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ReEnableDialog
        subscription={reEnable}
        onCancel={() => setReEnable(null)}
        onConfirm={(evidence) => {
          setRows((prev) => prev.map((r) => (r.id === reEnable?.id ? { ...r, status: 'active', unsubscribed_at: undefined, unsubscribed_by: undefined } : r)))
          toast.success('Đã bật lại', { description: `Bằng chứng: ${evidence} — đã gửi email báo chính chủ.` })
          setReEnable(null)
        }}
      />
      <FixAddressDialog
        subscription={fixing}
        onCancel={() => setFixing(null)}
        onConfirm={(value) => {
          setRows((prev) => prev.map((r) => (r.id === fixing?.id ? { ...r, value, status: 'active', error: undefined } : r)))
          toast.success('Đã đổi địa chỉ', { description: `${value} — opt-out cũ giữ nguyên.` })
          setFixing(null)
        }}
      />
    </div>
  )
}
