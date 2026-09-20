'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import type { CreateTopicInput } from '@/lib/api/topics'

/** Sao đúng `TOPIC_KEY` của backend (`admin-topics.routes.ts`) để báo lỗi tại chỗ, không đợi 422. */
const TOPIC_KEY = /^[a-z][a-z0-9_.-]{1,127}$/

const EMPTY: CreateTopicInput = { key: '', name: '', mandatory: false, defaultMode: 'opt_out' }

/**
 * Tạo chủ đề. Dùng `<ConfirmDialog children>` — dialog xác nhận duy nhất của app
 * (CLAUDE.md mục 1), không dựng `<Dialog>` song song.
 */
export function CreateTopicDialog({
  open,
  appName,
  pending,
  onCancel,
  onSubmit,
}: {
  open: boolean
  appName: string
  pending: boolean
  onCancel: () => void
  onSubmit: (input: CreateTopicInput) => void
}) {
  const [form, setForm] = useState<CreateTopicInput>(EMPTY)
  const keyValid = TOPIC_KEY.test(form.key)
  const valid = keyValid && form.name.trim().length > 0

  const close = () => {
    setForm(EMPTY)
    onCancel()
  }

  return (
    <ConfirmDialog
      open={open}
      title="Thêm chủ đề"
      description={`Chủ đề mới của ${appName} được tạo ở trạng thái draft — app chưa gửi được cho tới khi bạn kích hoạt.`}
      confirmLabel={pending ? 'Đang tạo…' : 'Tạo chủ đề'}
      confirmDisabled={!valid || pending}
      onConfirm={() => onSubmit({ ...form, name: form.name.trim() })}
      onCancel={close}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic-key">Mã chủ đề</Label>
          <Input
            id="topic-key"
            value={form.key}
            onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            placeholder="order_updates"
            className="font-mono"
            aria-invalid={form.key.length > 0 && !keyValid}
          />
          <p className="text-xs text-[var(--text-muted)]">
            App gọi API sẽ gửi đúng mã này. Chữ thường, số và <code className="font-mono">_ . -</code>,
            bắt đầu bằng chữ, 2–128 ký tự. Tạo xong không đổi được.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic-name">Tên hiển thị</Label>
          <Input
            id="topic-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Cập nhật đơn hàng"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic-default-mode">Mặc định khi người dùng chưa chọn</Label>
          <NativeSelect
            id="topic-default-mode"
            className="w-full"
            value={form.defaultMode}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultMode: e.target.value as CreateTopicInput['defaultMode'] }))
            }
          >
            <NativeSelectOption value="opt_out">Có nhận (opt_out) — người dùng phải tự tắt</NativeSelectOption>
            <NativeSelectOption value="opt_in">Không nhận (opt_in) — người dùng phải tự bật</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--orbit)] p-3">
          <div>
            <Label htmlFor="topic-mandatory">Bắt buộc</Label>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Người dùng không tắt được chủ đề này. Chỉ dành cho thông báo giao dịch bắt buộc.
            </p>
          </div>
          <Switch
            id="topic-mandatory"
            checked={form.mandatory}
            onCheckedChange={(v) => setForm((f) => ({ ...f, mandatory: v }))}
          />
        </div>
      </div>
    </ConfirmDialog>
  )
}
