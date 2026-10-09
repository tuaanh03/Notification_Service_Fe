'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Building2, Check, ChevronsUpDown, LayoutGrid, Plus, Search } from 'lucide-react'
import { consoleOrgs } from '@/lib/access'
import { appKey, ORG_PARAM, switchAppPath } from '@/lib/app-routes'
import { statusColors } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useAppSelection } from './app-context'
import { AppLink, useAppRouter } from './app-link'
import { useRole } from './role-context'
import { StatusPill } from './status-pill'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

/** Org có nhiều app hơn số này thì menu có ô tìm app. */
const SEARCH_THRESHOLD = 6

/** Chữ cái đầu của tên org cho ô vuông nhỏ đầu menu. */
function orgInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const picked = words.length >= 2 ? [words[0]!, words[1]!] : [name.trim()]
  return picked
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

/**
 * Ô chuyển app / org của console app (đầu sidebar `<AppShell>`).
 *
 * Nút: tên app + tên org — nhìn là biết đang ở org nào. Menu: CHỈ app của org đang xem (org lấy
 * từ app đang mở — đường dẫn vẫn chỉ có `?app=`), kèm menu con chọn org (`consoleOrgs`: Super Admin
 * mọi org, người khác org mình là thành viên).
 *
 * Chọn org KHÔNG đoán app (mục 2.9): org có đúng một app thì mở app đó (không có gì để chọn);
 * nhiều app thì về trang chọn app lọc sẵn theo org (`?org=`). Org chưa có app thì không bấm được.
 */
export function AppSwitcher() {
  const path = usePathname()
  const locale = useLocale()
  const t = useTranslations('switcher')
  const tr = useTranslations('roles')
  const router = useAppRouter()
  const { me, isSuperAdmin, creatableOrgs } = useRole()
  const { app, apps } = useAppSelection()
  const [query, setQuery] = useState('')

  const orgs = consoleOrgs(me)
  const org = orgs.find((o) => o.id === app?.org_id) ?? null
  const orgApps = apps.filter((a) => a.org_id === app?.org_id)
  const q = query.trim().toLowerCase()
  const shown = orgApps.filter((a) => !q || a.name.toLowerCase().includes(q) || a.slug.includes(q))
  const roleLabel = org?.role ? tr(org.role) : isSuperAdmin ? tr('superAdmin') : tr('user')
  const canCreate = creatableOrgs.some((o) => o.id === app?.org_id)
  const appDot = app ? (statusColors[app.status] ?? statusColors.draft) : statusColors.draft

  function chooseOrg(orgId: string) {
    const inOrg = apps.filter((a) => a.org_id === orgId)
    if (inOrg.length === 1) router.push(switchAppPath(path), { app: appKey(inOrg[0]!) })
    else router.push(`${switchAppPath(path)}?${ORG_PARAM}=${encodeURIComponent(orgId)}`, { app: null })
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:hidden">
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="h-11 w-full justify-between rounded-lg bg-[var(--void)]/60 border border-[var(--orbit)] px-2.5 hover:border-[var(--starlight)]/40 hover:bg-[var(--void)]/90 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Chấm theo TRẠNG THÁI THẬT của app — cùng nguồn màu với <StatusPill> trong menu. */}
                  <div
                    className="size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: appDot, boxShadow: `0 0 6px ${appDot}` }}
                  />
                  <div className="flex flex-col min-w-0 leading-tight text-left">
                    <span className="text-xs font-medium text-sidebar-foreground truncate">{app?.name ?? t('chooseApp')}</span>
                    {app?.org_name && <span className="text-[10px] text-muted-foreground truncate">{app.org_name}</span>}
                  </div>
                </div>
                <ChevronsUpDown className="size-3 text-muted-foreground shrink-0" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-72 rounded-xl border border-border/80 bg-popover p-2 shadow-lg"
            side="bottom"
            align="start"
            sideOffset={6}
          >
            {/* Đầu menu: app đang xem + vai của mình trong org đó. */}
            {app && (
              <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg bg-[var(--void)]/60 border border-[var(--orbit)]">
                <Avatar className="size-9 rounded-lg border border-[var(--orbit)] shrink-0">
                  <AvatarFallback className="rounded-lg bg-[var(--starlight)]/15 text-[var(--starlight)] font-bold text-xs">
                    {orgInitials(app.org_name ?? app.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">{app.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {roleLabel}
                    {app.org_name ? ` · ${app.org_name}` : ''}
                  </span>
                </div>
              </div>
            )}

            {orgApps.length > SEARCH_THRESHOLD && (
              <div className="relative px-1 py-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // Menu bắt phím để nhảy giữa các mục — chữ gõ vào ô tìm không được để menu nuốt.
                  onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
                  placeholder={t('searchApps')}
                  aria-label={t('searchApps')}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}

            {/* App của org đang xem. */}
            <DropdownMenuGroup>
              {shown.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">{t('noMatch', { query })}</p>
              )}
              {shown
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, locale))
                .map((a) => (
                  <DropdownMenuItem
                    key={a.app_id}
                    // Đổi app = đổi `?app=`: ở lại màn này, hoặc về danh sách nếu đang ở trang chi tiết.
                    onClick={() => router.push(switchAppPath(path), { app: appKey(a) })}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs',
                      a.app_id === app?.app_id && 'bg-sidebar-accent font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className={cn('size-3.5 shrink-0 text-[var(--starlight)]', a.app_id !== app?.app_id && 'invisible')} />
                      <span className="truncate">{a.name}</span>
                    </div>
                    <StatusPill status={a.status} />
                  </DropdownMenuItem>
                ))}
              {canCreate && (
                <DropdownMenuItem
                  render={<AppLink href="/apps/new" />}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs text-muted-foreground"
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span>{t('createApp')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-border/60" />

            {/* Menu con: org mình là thành viên. */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="truncate font-medium">{org?.name ?? t('chooseOrg')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56 rounded-xl border border-border/80 bg-popover p-2 shadow-lg">
                <DropdownMenuGroup>
                  {orgs
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, locale))
                    .map((o) => {
                      const count = apps.filter((a) => a.org_id === o.id).length
                      return (
                        <DropdownMenuItem
                          key={o.id}
                          disabled={count === 0}
                          onClick={() => o.id !== org?.id && chooseOrg(o.id)}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Check className={cn('size-3.5 shrink-0 text-[var(--starlight)]', o.id !== org?.id && 'invisible')} />
                            <span className="truncate">{o.name}</span>
                          </div>
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground shrink-0">
                            {count === 0 ? t('noApps') : t('appCount', { count })}
                          </span>
                        </DropdownMenuItem>
                      )
                    })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                <DropdownMenuItem
                  onClick={() => router.push(switchAppPath(path), { app: null })}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-xs"
                >
                  <LayoutGrid className="size-3.5 text-muted-foreground" />
                  <span>{t('allOrgs')}</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
