'use client'

import { Lock, TriangleAlert, X } from 'lucide-react'
import { Panel } from '@/components/panel'
import { StatusPill } from '@/components/status-pill'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { RecipientDto, TopicPreferenceDto, UserPreferencesDto } from '@/lib/api/types'

/** Người này đã BẤM gì — khác với "rốt cuộc có nhận không". */
function Chosen({ topic }: { topic: TopicPreferenceDto }) {
  if (topic.optedIn === null) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="text-xs text-[var(--text-muted)]" />}>chưa chọn</TooltipTrigger>
        <TooltipContent>
          Chưa đụng đến chủ đề này. Đang theo mặc định:{' '}
          {topic.defaultMode === 'opt_out' ? 'có nhận' : 'không nhận'}.
        </TooltipContent>
      </Tooltip>
    )
  }
  return <span className="text-xs">{topic.optedIn ? 'bật' : 'tắt'}</span>
}

/**
 * Cài đặt nhận tin của một người nhận (ĐX-0004).
 *
 * CHỈ ĐỌC — không có công tắc. Consent là ý muốn của người dùng; admin sửa hộ là mất hết ý nghĩa
 * của cổng L0/L1/L3. App service tự ghi qua `PUT /v1/users/:id/preferences`.
 */
export function RecipientPreferences({
  recipient,
  preferences,
  error,
  loading,
  onClose,
}: {
  recipient: RecipientDto
  preferences: UserPreferencesDto | null
  error: string | null
  loading: boolean
  onClose: () => void
}) {
  // L0 / L1 chặn thư BẤT KỂ từng chủ đề bật hay tắt — phải nói trước khi người trực đọc bảng dưới.
  const blocked =
    recipient.email === null
      ? 'Người này chưa khai email — mọi thư đều bị chặn, không phụ thuộc chủ đề.'
      : recipient.email.status !== 'active'
        ? `Địa chỉ đang ở trạng thái ${recipient.email.status} — mọi thư đều bị chặn, kể cả chủ đề bắt buộc.`
        : recipient.email.optedOutOptional
          ? 'Người này đã tắt mọi tin không bắt buộc — chỉ chủ đề bắt buộc còn đi được.'
          : null

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="font-mono">{recipient.externalId}</span>
            {recipient.email && <StatusPill status={recipient.email.status} />}
          </h2>
          <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
            {recipient.email?.address ?? 'chưa khai email'}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={onClose}>
          <X />
        </Button>
      </div>

      {blocked && (
        <Alert className="mb-4 bg-[var(--solar)]/10">
          <TriangleAlert className="text-[var(--solar)]" />
          <AlertDescription>{blocked}</AlertDescription>
        </Alert>
      )}

      {error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">Đang tải…</p>
      ) : preferences === null ? null : preferences.topics.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">
          App chưa có chủ đề nào đang hoạt động.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Người này đã chọn</TableHead>
                <TableHead>Qua được lớp chủ đề</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.topics.map((topic) => (
                <TableRow key={topic.key}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{topic.key}</span>
                      {topic.mandatory && (
                        <Tooltip>
                          <TooltipTrigger render={<Badge variant="outline" className="text-[9px]" />}>
                            <Lock />
                            bắt buộc
                          </TooltipTrigger>
                          <TooltipContent>
                            Người dùng không tắt được. Vẫn KHÔNG gửi tới địa chỉ đã chết hoặc đã tự ngắt.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">{topic.name}</span>
                  </TableCell>
                  <TableCell>
                    <Chosen topic={topic} />
                  </TableCell>
                  <TableCell>
                    <span className={topic.effectiveOptIn ? 'text-xs text-[var(--aurora)]' : 'text-xs text-[var(--text-muted)]'}>
                      {topic.effectiveOptIn ? 'có' : 'không'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            Cột cuối chỉ là <strong>lớp chủ đề</strong>. Địa chỉ chết hoặc tắt mọi tin không bắt buộc
            vẫn chặn thư dù cột này ghi «có».
          </p>
        </>
      )}
    </Panel>
  )
}
