'use client'
import { ChevronLeft, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AppLink } from '@/components/app-link'
import { Button } from '@/components/ui/button'

/**
 * Thanh trên của bàn làm việc soạn template (UX-5A, bản phác Main / DienThoai). Khung app đã bỏ thanh breadcrumb ở màn
 * này (`isWorkspaceRoute`), nên đây là thanh duy nhất: trái là về danh sách · tên · một dòng trạng thái, phải là `actions`.
 * Máy tính cao 64px; điện thoại 56px, chỉ còn mũi tên về (chạm 44px), tên + dòng nhỏ, nút chính và ⋯.
 * `onEdit` = bút chì cạnh tên mở hộp "Tên và nhóm" (UX-5C — thay khối "Nâng cao" dưới khung soạn).
 */
export function EditorTopBar({
  name,
  meta,
  actions,
  onEdit,
  editLabel,
}: {
  name: string
  meta?: string
  actions: React.ReactNode
  onEdit?: () => void
  editLabel?: string
}) {
  const tt = useTranslations('templates')
  return (
    <div className="flex h-14 min-w-0 items-center gap-2 pr-2 pl-1 md:h-16 md:gap-4 md:px-5">
      <AppLink
        href="/templates"
        aria-label={tt('title')}
        className="inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:size-auto"
      >
        <ChevronLeft className="size-5 md:size-4" />
        <span className="hidden md:inline">{tt('title')}</span>
      </AppLink>
      <span aria-hidden className="hidden h-7 w-px shrink-0 bg-[var(--orbit)] md:block" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="truncate text-[15px] font-semibold text-[var(--text-primary)] md:text-lg" data-testid="editor-title">
            {name}
          </h1>
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 border-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label={editLabel}
              title={editLabel}
              onClick={onEdit}
              data-testid="editor-rename"
            >
              <Pencil />
            </Button>
          )}
        </div>
        {meta && <p className="truncate text-[11px] text-[var(--text-muted)] md:text-xs">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">{actions}</div>
    </div>
  )
}
