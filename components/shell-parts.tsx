'use client'

import { useTranslations } from 'next-intl'
import { Bell, Check, ChevronsUpDown, Languages, LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { signOutAction } from '@/app/login/actions'
import type { AdminDto } from '@/lib/api/auth'
import { AppLink } from './app-link'
import { Button } from '@/components/ui/button'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { LOCALES } from '@/i18n/locales'
import { useLocaleSwitch } from './locale-switcher'
import { cn } from '@/lib/utils'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

/**
 * Mảnh dùng chung của HAI khung: console app (`<AppShell>`) và Quản trị EWS (`<AdminShell>`).
 * Hai khung khác nhau ở menu và ở chỗ có / không có app đang chọn; logo, nút thu gọn, menu tài
 * khoản và chuông thì giống nhau — giữ một bản ở đây để hai bên không lệch dần.
 */

export function CustomSidebarTrigger({
  className,
  tooltipSide = 'bottom',
}: {
  className?: string
  tooltipSide?: 'bottom' | 'right' | 'left' | 'top'
}) {
  const t = useTranslations('shell')
  const { toggleSidebar, open } = useSidebar()
  const label = open ? t('collapseSidebar') : t('expandSidebar')
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-95 focus-visible:outline-hidden',
              className,
            )}
            aria-label={label}
          >
            {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        }
      />
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Logo + tên hệ thống ở đầu sidebar, kèm nút thu gọn. `subtitle` cho biết đang ở khung nào. */
export function SidebarBrand({ href, subtitle }: { href: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-1 w-full group-data-[collapsible=icon]:justify-center">
      <AppLink
        href={href}
        className="flex items-center gap-2.5 px-1 py-1 rounded-lg group transition-colors hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center min-w-0"
      >
        <img
          src={BRAND_LOGO_SRC}
          alt=""
          className="size-8 shrink-0 rounded-full shadow-[0_0_12px_-2px_rgba(34,211,238,0.3)] transition-transform group-hover:scale-110"
        />
        <div className="flex flex-col min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="font-heading font-bold text-sm tracking-wide text-sidebar-foreground group-hover:text-[var(--starlight)] transition-colors truncate">
            EWS AstroLink
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase truncate">
            {subtitle}
          </span>
        </div>
      </AppLink>
      <div className="group-data-[collapsible=icon]:hidden">
        <CustomSidebarTrigger className="text-muted-foreground/70 hover:text-foreground" />
      </div>
    </div>
  )
}

/** Nút thu gọn đặt cuối vùng menu — chỉ hiện khi sidebar đang thu gọn (nút ở đầu đã ẩn). */
export function CollapsedSidebarTrigger() {
  return (
    <div className="mt-auto hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center py-2">
      <CustomSidebarTrigger
        tooltipSide="right"
        className="text-muted-foreground hover:bg-[var(--starlight)]/15 hover:text-[var(--starlight)] transition-all"
      />
    </div>
  )
}

/** Chữ cái đầu cho avatar. Bảng `admins` chỉ có email, không có tên hiển thị. */
function initialsOf(email: string): string {
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]+/).filter(Boolean)
  const picked = parts.length >= 2 ? [parts[0]!, parts[1]!] : [local]
  return picked
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

/** Lối sang khu kia: console app -> Quản trị EWS (Super Admin), hoặc ngược lại (khi là thành viên org). */
export type AreaSwitch = { href: string; label: string; icon: LucideIcon }

/** Chân sidebar: tài khoản, vai thật, chuyển khu, ngôn ngữ, đăng xuất. */
export function AccountMenu({
  admin,
  roleLabel,
  switchArea,
}: {
  admin: AdminDto
  roleLabel: string
  /** Không truyền = không có khu nào khác để sang. */
  switchArea?: AreaSwitch | undefined
}) {
  const t = useTranslations('shell')
  const tl = useTranslations('locale')
  const { locale, change: changeLocale, pending: localePending } = useLocaleSwitch()
  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-[var(--orbit)] shadow-xs transition-all hover:border-[var(--starlight)]/40 hover:bg-[var(--void)]/80 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
              >
                <Avatar className="size-8 rounded-lg border border-[var(--orbit)] shrink-0">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--starlight)]/25 to-[var(--pulsar)]/20 text-[var(--starlight)] font-bold text-xs">
                    {initialsOf(admin.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-sidebar-foreground">{admin.email}</span>
                  <span className="truncate text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-[var(--aurora)] shadow-[0_0_5px_var(--aurora)]" />
                    {roleLabel}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden shrink-0" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-64 rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
            side="top"
            align="start"
            sideOffset={8}
          >
            {/* User Summary Card */}
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-[var(--void)]/60 border border-[var(--orbit)]">
              <Avatar className="size-9 rounded-lg border border-[var(--orbit)] shrink-0">
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--starlight)]/20 to-[var(--pulsar)]/20 text-[var(--starlight)] font-bold text-xs">
                  {initialsOf(admin.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">{admin.email}</span>
                <span className="text-[10px] font-mono text-muted-foreground truncate">{roleLabel}</span>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1 bg-border/60" />

            {switchArea && (
              <>
                <DropdownMenuItem
                  render={<AppLink href={switchArea.href} />}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs"
                >
                  <switchArea.icon className="size-3.5 text-muted-foreground" />
                  <span>{switchArea.label}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border/60" />
              </>
            )}

            {/* Ngôn ngữ giao diện — ghi cookie rồi dựng lại trang (`components/locale-switcher.tsx`). */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                {tl('label')}
              </DropdownMenuLabel>
              {LOCALES.map((l) => (
                <DropdownMenuItem
                  key={l}
                  disabled={localePending}
                  onClick={() => changeLocale(l)}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer text-xs',
                    l === locale && 'bg-sidebar-accent font-medium text-foreground',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Languages className="size-3.5 text-muted-foreground" />
                    <span>{tl(l)}</span>
                  </div>
                  {l === locale && <Check className="size-3.5 text-[var(--starlight)]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/60" />

            <DropdownMenuItem
              onClick={() => signOutAction()}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs text-[var(--solar)]"
            >
              <LogOut className="size-3.5" />
              <span>{t('signOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Chuông số yêu cầu chờ duyệt — chỉ khung Quản trị EWS có (chỉ Super Admin duyệt, ADR-0022). */
export function PendingBell({ count }: { count: number }) {
  const t = useTranslations('shell')
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative text-muted-foreground hover:text-foreground"
      aria-label={t('pendingApprovals', { count })}
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--solar)] font-mono text-[9px] font-bold tabular-nums text-white">
          {count}
        </span>
      )}
    </Button>
  )
}
