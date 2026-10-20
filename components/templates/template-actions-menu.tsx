'use client'
import { Archive, Code2, Copy, CopyPlus, MoreHorizontal, Redo2, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Menu ⋯ của màn soạn: thao tác phụ / một chiều / huỷ hoại không đứng ngang Lưu nháp · Xuất bản.
 * Mục `undefined` = không hiện (theo vai, trạng thái). Lưu trữ luôn cuối, sau vạch ngăn, màu nguy hiểm.
 * Không dùng `DropdownMenuLabel` — nếu thêm thì phải nằm trong `DropdownMenuGroup` (Base UI #31).
 */
export function TemplateActionsMenu({
  disabled,
  onCopyId,
  onDuplicate,
  onToHtml,
  onArchive,
  onSaveMobile,
  onRedoMobile,
  redoDisabled = false,
}: {
  disabled: boolean
  onCopyId: () => void
  onDuplicate?: () => void
  onToHtml?: () => void
  onArchive?: () => void
  /** Bộ soạn trực quan trên điện thoại (< md): Lưu nháp / Làm lại chuyển vào đây cho thanh đầu không tràn. */
  onSaveMobile?: () => void
  onRedoMobile?: () => void
  /** Không có gì để làm lại — mục vẫn hiện nhưng tắt. */
  redoDisabled?: boolean
}) {
  const t = useTranslations('templateEditor')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label={t('moreActions')} data-testid="template-more">
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="z-[100] w-56 rounded-xl border border-border bg-popover p-1 shadow-md">
        {onSaveMobile && (
          <DropdownMenuItem className="cursor-pointer text-xs md:hidden" disabled={disabled} onClick={onSaveMobile} data-testid="menu-save">
            <Save className="mr-1.5 size-3.5" /> {t('saveDraft')}
          </DropdownMenuItem>
        )}
        {onRedoMobile && (
          <DropdownMenuItem className="cursor-pointer text-xs md:hidden" disabled={redoDisabled} onClick={onRedoMobile} data-testid="menu-redo">
            <Redo2 className="mr-1.5 size-3.5" /> {t('redo')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer text-xs" onClick={onCopyId} data-testid="menu-copy-id">
          <Copy className="mr-1.5 size-3.5" /> {t('copyId')}
        </DropdownMenuItem>
        {onDuplicate && (
          <DropdownMenuItem className="cursor-pointer text-xs" disabled={disabled} onClick={onDuplicate} data-testid="menu-duplicate">
            <CopyPlus className="mr-1.5 size-3.5" /> {t('duplicate')}
          </DropdownMenuItem>
        )}
        {onToHtml && (
          <DropdownMenuItem className="cursor-pointer text-xs" disabled={disabled} onClick={onToHtml} data-testid="to-html-btn">
            <Code2 className="mr-1.5 size-3.5" /> {t('toHtml')}
          </DropdownMenuItem>
        )}
        {onArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer text-xs"
              disabled={disabled}
              onClick={onArchive}
              data-testid="menu-archive"
            >
              <Archive className="mr-1.5 size-3.5" /> {t('archive')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
