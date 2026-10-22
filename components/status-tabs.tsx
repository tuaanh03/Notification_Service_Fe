'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export type StatusTab = { value: string; label: string; count: number }

/** `''` (tab "Tất cả") không dùng làm giá trị tab được — đổi qua lại ở biên. */
const ALL = '__all'
const toTab = (v: string) => (v === '' ? ALL : v)

/**
 * Hàng tab lọc theo trạng thái, mỗi tab kèm số đếm ("Tất cả 12 · Đã gửi 10 · Lỗi 2") — bấm một lần là lọc,
 * thấy ngay mỗi nhóm còn bao nhiêu mà không phải mở ô chọn. Tab 0 thư vẫn hiện (mờ) để biết "không có lỗi"
 * khác với "chưa tải".
 */
export function StatusTabs({
  value,
  onChange,
  tabs,
  label,
}: {
  value: string
  onChange: (value: string) => void
  tabs: StatusTab[]
  /** Nhãn cho trình đọc màn hình, ví dụ "Trạng thái". */
  label: string
}) {
  return (
    <Tabs value={toTab(value)} onValueChange={(v) => onChange(v === ALL ? '' : String(v))}>
      <TabsList variant="line" aria-label={label} className="h-9 max-w-full flex-wrap justify-start">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={toTab(tab.value)} className={cn('flex-none px-2', tab.count === 0 && 'text-[var(--text-muted)]')}>
            {tab.label}
            <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums text-[var(--text-secondary)]">{tab.count}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
