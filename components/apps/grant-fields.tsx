'use client'
import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GrantDraft } from './wizard-types'

/**
 * Quyền cấp lúc duyệt app — NƠI DUY NHẤT dựng phần nhập này.
 *
 * Dùng chung wizard bước 4 và hộp duyệt ở `/admin/apps`. Có hai bản là sớm muộn lệch nhau, và
 * lệch ở đây nghĩa là một trong hai cửa duyệt bỏ qua ô xác nhận bên dưới.
 *
 * `id` phân biệt hai instance nếu cùng nằm trên một trang.
 */
export function GrantFields({
  id,
  grant,
  onGrantChange,
  acknowledged,
  onAcknowledgedChange,
}: {
  id: string
  grant: GrantDraft
  onGrantChange: (next: GrantDraft) => void
  acknowledged: boolean
  onAcknowledgedChange: (next: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-rate`} className="text-xs">rate_limit_per_minute</Label>
          <Input
            id={`${id}-rate`}
            type="number"
            min={1}
            value={grant.rateLimitPerMinute}
            onChange={(e) => onGrantChange({ ...grant, rateLimitPerMinute: Number(e.target.value) })}
            className="font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-recipients`} className="text-xs">max_recipients_per_event</Label>
          <Input
            id={`${id}-recipients`}
            type="number"
            min={1}
            value={grant.maxRecipientsPerEvent}
            onChange={(e) => onGrantChange({ ...grant, maxRecipientsPerEvent: Number(e.target.value) })}
            className="font-mono"
          />
        </div>
      </div>

      <Alert className="bg-[var(--solar)]/10">
        <TriangleAlert className="text-[var(--solar)]" />
        <AlertDescription>
          Hai con số này hiện được <strong>lưu nhưng chưa ai đối chiếu</strong> — app vượt hạn mức
          không bị từ chối. Quota theo app nằm ở kế hoạch mục 12.5.
        </AlertDescription>
      </Alert>

      {/*
        Gờ giảm tốc, KHÔNG phải hàng rào: backend không có cột nào lưu việc này, nên nó không
        vào audit và không ai kiểm chứng được. Vẫn giữ vì nhân viên chỉ tắt được thông báo nếu
        app tự dựng màn cài đặt — không có màn đó thì cổng consent L0/L1/L3 vô dụng (ĐX-0003).
      */}
      <label htmlFor={`${id}-ack`} className="flex cursor-pointer items-start gap-3 text-xs">
        <Checkbox id={`${id}-ack`} checked={acknowledged} onCheckedChange={onAcknowledgedChange} className="mt-0.5" />
        <span className="text-[var(--text-secondary)]">
          Đội này đã có màn <strong>&laquo;Cài đặt nhận thông báo&raquo;</strong> cho nhân viên. Không có
          màn đó thì nhân viên không có cách nào tự tắt.
        </span>
      </label>
    </div>
  )
}
