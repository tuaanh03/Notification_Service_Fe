'use client'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Dấu (?) cạnh nhãn ô — giải thích nằm trong tooltip thay cho dòng chữ xám dưới ô (màn soạn / tạo template).
 * Lỗi của ô (link sai…) KHÔNG đi qua đây: lỗi phải hiện sẵn, không chờ rê chuột.
 */
export function FieldHint({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className="size-5 shrink-0 rounded-full text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          />
        }
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs leading-5">{text}</TooltipContent>
    </Tooltip>
  )
}
