'use client'

import { useTranslations } from 'next-intl'
import { ReasonBadge } from '@/components/reason-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { recipientSnapshot, type Notification, type SnapshotRow } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const HEADERS = ['colPerson', 'colChannel', 'colAddress', 'colWhy', 'colTemplate', 'colResult', 'colAt'] as const

function SnapshotTable({ rows, tone }: { rows: SnapshotRow[]; tone?: 'muted' | 'error' }) {
  const t = useTranslations('snapshot')
  if (rows.length === 0) return <p className="p-4 text-sm text-[var(--text-muted)]">{t('empty')}</p>
  return (
    <div className="overflow-x-auto">
      <Table className="text-[13px]">
        <TableHeader className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          <TableRow className="hover:bg-transparent">
            {HEADERS.map((h) => (
              <TableHead key={h} className="px-3">
                {t(h)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.person} className="h-11 border-[var(--orbit)]">
              <TableCell className="px-3 font-mono text-xs">{r.person}</TableCell>
              <TableCell className="px-3 font-mono text-xs">{r.channel}</TableCell>
              <TableCell className="px-3 font-mono text-xs text-[var(--text-secondary)]">{r.address}</TableCell>
              <TableCell className="px-3">
                <span className="flex flex-wrap items-center gap-1">
                  {r.reasons.map((reason) => (
                    <ReasonBadge key={reason} reason={reason} />
                  ))}
                  {/* UC-002 BR-5: trúng 2 binding vẫn nhận đúng 1 lần */}
                  {r.reasons.length > 1 && (
                    <span className="text-[10px] text-[var(--text-muted)]">{t('multiBinding', { count: r.reasons.length })}</span>
                  )}
                </span>
              </TableCell>
              <TableCell className="px-3 font-mono text-xs">{r.template ?? '—'}</TableCell>
              <TableCell className={cn('px-3 font-mono text-xs', tone === 'error' ? 'text-[var(--supernova)]' : tone === 'muted' ? 'text-[var(--text-muted)]' : 'text-[var(--aurora)]')}>
                {r.result}
              </TableCell>
              <TableCell className="px-3 font-mono text-xs tabular-nums text-[var(--text-muted)]">{r.at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** 07 §B3 — snapshot người nhận kèm lý do trúng binding; 3 tab Đã nhận / Bị trừ ra / Lỗi phát. */
export function RecipientsTabs({ notification }: { notification: Notification }) {
  const t = useTranslations('snapshot')
  const { received, deducted, failed } = recipientSnapshot(notification)
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">{t('intro')}</p>
      <Tabs defaultValue="received">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="received">
            {t('received')} <span className="ml-1 font-mono tabular-nums text-[var(--text-muted)]">{received.length}</span>
          </TabsTrigger>
          <TabsTrigger value="deducted">
            {t('deducted')} <span className="ml-1 font-mono tabular-nums text-[var(--text-muted)]">{deducted.length}</span>
          </TabsTrigger>
          <TabsTrigger value="failed">
            {t('failed')} <span className="ml-1 font-mono tabular-nums text-[var(--text-muted)]">{failed.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="received">
          <SnapshotTable rows={received} />
        </TabsContent>
        <TabsContent value="deducted">
          <SnapshotTable rows={deducted} tone="muted" />
        </TabsContent>
        <TabsContent value="failed">
          <SnapshotTable rows={failed} tone="error" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
