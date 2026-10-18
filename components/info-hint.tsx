'use client'
import { Popover } from '@base-ui/react/popover'
import { Info } from 'lucide-react'

export type InfoHintItem = { term: string; definition: string }

/**
 * Dấu ⓘ cạnh tiêu đề một mục: trỏ chuột (máy tính) hoặc chạm (điện thoại) thì hiện giải thích — một câu
 * nói mục làm gì, rồi định nghĩa từng mục con. Dùng Popover chứ không Tooltip: Tooltip không mở khi chạm.
 * Không bao giờ bị khoá theo công tắc của mục, để đọc được trước khi bật.
 */
export function InfoHint({ label, summary, items = [] }: { label: string; summary: string; items?: InfoHintItem[] }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        aria-label={label}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] outline-none transition-colors hover:text-[var(--starlight)] focus-visible:ring-2 focus-visible:ring-[var(--starlight)] data-[popup-open]:text-[var(--starlight)]"
      >
        <Info className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={16} className="isolate z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-32px)] origin-(--transform-origin) rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <p className="text-sm leading-relaxed">{summary}</p>
            {items.length > 0 && (
              <dl className="mt-3 space-y-3 border-t pt-3">
                {items.map((item) => (
                  <div key={item.term}>
                    <dt className="text-[13px] font-medium">{item.term}</dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
